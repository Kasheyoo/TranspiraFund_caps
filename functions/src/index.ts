import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp: typeof import("sharp") = require("sharp");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const piexif = require("piexifjs");

admin.initializeApp();


const gmailUser = defineSecret("GMAIL_USER");
const gmailPass = defineSecret("GMAIL_PASS");
const anthropicKey = defineSecret("ANTHROPIC_API_KEY");


const OTP_EXPIRY_MS = 10 * 60 * 1000;
const SEND_COOLDOWN_MS = 60 * 1000;
const MAX_VERIFY_ATTEMPTS = 5;



function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createTransporter(user: string, pass: string) {
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}


async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 3000);

    const res = await fetch(url, {
      headers: {
        "User-Agent": "TranspiraFund-Mobile/1.0 (LGU project monitoring)",
        "Accept-Language": "en",
      },
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const data = (await res.json()) as {
      address?: Record<string, string>;
      display_name?: string;
    };
    const a = data.address ?? {};


    const barangay =
      a.village || a.suburb || a.neighbourhood || a.hamlet || a.quarter;
    const city = a.city || a.town || a.municipality || a.county;
    const province = a.state || a.region;

    const parts: string[] = [];
    if (barangay) parts.push(`Brgy. ${barangay}`);
    if (city)     parts.push(city);
    if (province) parts.push(province);

    if (parts.length > 0) return parts.join(", ");

    return data.display_name?.split(",").slice(0, 3).join(",").trim() || null;
  } catch {
    return null;
  }
}


function embedExifGps(
  buffer: Buffer,
  latitude: number,
  longitude: number,
  capturedAtMs: number,
  accuracyMeters?: number,
): Buffer {
  try {

    const dataUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;


    let exifObj: Record<string, Record<number, unknown>>;
    try {
      exifObj = piexif.load(dataUrl);
    } catch {
      exifObj = { "0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": null as any };
    }

    const capturedAt = new Date(capturedAtMs);

    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateTimeStr =
      `${capturedAt.getUTCFullYear()}:${pad(capturedAt.getUTCMonth() + 1)}:${pad(capturedAt.getUTCDate())}` +
      ` ${pad(capturedAt.getUTCHours())}:${pad(capturedAt.getUTCMinutes())}:${pad(capturedAt.getUTCSeconds())}`;
    const gpsDateStr =
      `${capturedAt.getUTCFullYear()}:${pad(capturedAt.getUTCMonth() + 1)}:${pad(capturedAt.getUTCDate())}`;


    exifObj["0th"][piexif.ImageIFD.DateTime] = dateTimeStr;
    exifObj["0th"][piexif.ImageIFD.Software] = "TranspiraFund Mobile";


    exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = dateTimeStr;
    exifObj["Exif"][piexif.ExifIFD.DateTimeDigitized] = dateTimeStr;


    const gps: Record<number, unknown> = {};
    gps[piexif.GPSIFD.GPSLatitudeRef] = latitude >= 0 ? "N" : "S";
    gps[piexif.GPSIFD.GPSLatitude] = piexif.GPSHelper.degToDmsRational(Math.abs(latitude));
    gps[piexif.GPSIFD.GPSLongitudeRef] = longitude >= 0 ? "E" : "W";
    gps[piexif.GPSIFD.GPSLongitude] = piexif.GPSHelper.degToDmsRational(Math.abs(longitude));
    gps[piexif.GPSIFD.GPSMapDatum] = "WGS-84";
    gps[piexif.GPSIFD.GPSDateStamp] = gpsDateStr;
    gps[piexif.GPSIFD.GPSTimeStamp] = [
      [capturedAt.getUTCHours(), 1],
      [capturedAt.getUTCMinutes(), 1],
      [capturedAt.getUTCSeconds(), 1],
    ];

    if (typeof accuracyMeters === "number" && accuracyMeters > 0) {

      gps[piexif.GPSIFD.GPSHPositioningError] = [Math.round(accuracyMeters * 100), 100];
    }
    exifObj.GPS = gps;

    const exifBytes = piexif.dump(exifObj);
    const newDataUrl: string = piexif.insert(exifBytes, dataUrl);

    const commaIdx = newDataUrl.indexOf(",");
    const newBase64 = commaIdx === -1 ? newDataUrl : newDataUrl.slice(commaIdx + 1);
    return Buffer.from(newBase64, "base64");
  } catch {

    return buffer;
  }
}


function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}


function formatManilaTime(ms: number): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(ms));
}

function buildEngineerLabel(profile: {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
}): string {
  const first = (profile.firstName ?? "").trim();
  const last = (profile.lastName ?? "").trim();
  const fullFromParts = [first, last].filter(Boolean).join(" ");
  const display =
    fullFromParts || (profile.name ?? "").trim() || profile.email || "Engineer";

  return fullFromParts || (profile.name ?? "").trim()
    ? `Engr. ${display}`
    : display;
}


const ROLE_LABELS: Record<string, string> = {
  PROJ_ENG: "Project Engineer",
  HCSD: "HCSD Officer",
  MAYOR: "Mayor",
  ADMIN: "Administrator",
};

function buildRoleLabel(role?: string): string {
  const key = (role ?? "PROJ_ENG").trim() || "PROJ_ENG";
  return ROLE_LABELS[key] ?? key;
}

function buildBannerSvg(
  imgWidth: number,
  imgHeight: number,
  lines: string[],
): Buffer {
  const bannerHeight = Math.max(180, Math.min(Math.round(imgHeight * 0.14), 360));
  const fontSize = Math.max(20, Math.min(Math.round(imgWidth / 45), 44));
  const lineGap = Math.round(fontSize * 1.35);
  const paddingX = Math.max(16, Math.round(imgWidth * 0.03));
  const paddingTop = Math.round((bannerHeight - lineGap * (lines.length - 1)) / 2);

  const texts = lines
    .map((line, i) => {
      const y = paddingTop + i * lineGap + fontSize;
      return `<text x="${paddingX}" y="${y}" filter="url(#ds)">${escapeXml(line)}</text>`;
    })
    .join("");


  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imgWidth}" height="${bannerHeight}">` +
      `<defs>` +
        `<filter id="ds" x="-20%" y="-20%" width="140%" height="140%">` +
          `<feGaussianBlur in="SourceAlpha" stdDeviation="1.2"/>` +
          `<feOffset dx="0" dy="1" result="offset"/>` +
          `<feComponentTransfer><feFuncA type="linear" slope="0.9"/></feComponentTransfer>` +
          `<feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>` +
        `</filter>` +
      `</defs>` +
      `<rect x="0" y="0" width="${imgWidth}" height="${bannerHeight}" fill="black" fill-opacity="0.6"/>` +
      `<g font-family="sans-serif" font-size="${fontSize}" font-weight="700" fill="white">` +
        `${texts}` +
      `</g>` +
    `</svg>`,
    "utf8",
  );
}

async function burnInBanner(buffer: Buffer, lines: string[]): Promise<Buffer> {
  if (lines.length === 0) return buffer;


  let workingBuffer = buffer;
  try {
    const inMeta = await sharp(buffer, { failOn: "none" }).metadata();
    if (inMeta.format !== "jpeg" && inMeta.format !== "png") {
      workingBuffer = await sharp(buffer, { failOn: "none" })
        .rotate()
        .jpeg({ quality: 95 })
        .toBuffer();
    }
  } catch (err) {
    console.warn("[burnInBanner] input probe/normalize failed", err);
  }


  try {
    const base = sharp(workingBuffer).rotate();
    const meta = await base.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) {
      console.warn("[burnInBanner] missing dimensions; returning unstamped buffer");
      return workingBuffer;
    }

    const svg = buildBannerSvg(width, height, lines);
    return await base
      .composite([{ input: svg, gravity: "south" }])
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } catch (err) {
    console.warn("[burnInBanner] composite failed; returning unstamped buffer", err);
    return workingBuffer;
  }
}


async function logAuditTrail(
  uid: string,
  email: string,
  action: string,

  message: string,
  syncToHCSD = false,

  targetId?: string,

  milestoneId?: string,

  tenantId?: string,
) {
  const detailsObj: Record<string, string> = { message };
  if (targetId) detailsObj.projectId = targetId;
  if (milestoneId) detailsObj.milestoneId = milestoneId;

  const entry: Record<string, unknown> = {
    action,
    actorUid: uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    details: detailsObj,
    email,
  };
  if (targetId) entry.targetId = targetId;
  if (tenantId) entry.tenantId = tenantId;


  const writes: Promise<unknown>[] = [
    admin.firestore()
      .collection("auditTrails").doc("mobile").collection("entries")
      .add(entry),
  ];


  if (syncToHCSD) {
    writes.push(
      admin.firestore()
        .collection("auditTrails").doc("hcsd").collection("entries")
        .add(entry),
    );
  }

  await Promise.all(writes);
}


async function enforceRateLimit(
  key: string,
  action: string,
  opts: { max: number; windowMs: number; lockoutMs: number },
): Promise<void> {
  const docId = `${key}_${action}`.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 1500);
  const ref = admin.firestore().doc(`rateLimits/${docId}`);
  const now = Date.now();

  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const entry = snap.exists
      ? (snap.data() as { attempts?: number; windowStart?: number; lockedUntil?: number | null })
      : null;

    if (entry?.lockedUntil && entry.lockedUntil > now) {
      const wait = Math.ceil((entry.lockedUntil - now) / 1000);
      throw new HttpsError(
        "resource-exhausted",
        `Too many requests. Please wait ${wait}s and try again.`,
      );
    }


    if (!entry || !entry.windowStart || now - entry.windowStart > opts.windowMs) {
      tx.set(ref, { attempts: 1, windowStart: now, lockedUntil: null });
      return;
    }

    const attempts = (entry.attempts ?? 0) + 1;
    if (attempts > opts.max) {
      tx.set(ref, {
        attempts,
        windowStart: entry.windowStart,
        lockedUntil: now + opts.lockoutMs,
      });
      const wait = Math.ceil(opts.lockoutMs / 1000);
      throw new HttpsError(
        "resource-exhausted",
        `Too many requests. Please wait ${wait}s and try again.`,
      );
    }

    tx.update(ref, { attempts });
  });
}


function assertSameTenant(
  callerTenantId: unknown,
  targetTenantId: unknown,
): void {
  if (
    typeof callerTenantId !== "string" ||
    typeof targetTenantId !== "string" ||
    !callerTenantId ||
    callerTenantId !== targetTenantId
  ) {
    throw new HttpsError("permission-denied", "Cross-tenant operation rejected.");
  }
}


type MilestoneTemplate = {
  title: string;
  description: string;
  durationDays: number;
};

const MILESTONE_TEMPLATES: Record<string, MilestoneTemplate[]> = {
  "Building Construction": [
    { title: "Site Preparation & Mobilization", description: "Site cleared and fenced. Staging area, temporary utilities, and contractor field office set up.", durationDays: 7 },
    { title: "Excavation & Foundation Works",   description: "Excavation to design depth completed. Footings and foundation poured and cured to specifications.", durationDays: 21 },
    { title: "Structural Framing",              description: "Columns, beams, and slabs formed and poured per approved structural drawings.", durationDays: 30 },
    { title: "Masonry & Wall Works",            description: "CHB walls laid plumb and true. Lintels, jambs, and openings in place per plan.", durationDays: 21 },
    { title: "Roofing Works",                   description: "Roof framing, sheets, gutters, and downspouts installed and watertight.", durationDays: 14 },
    { title: "Plumbing Rough-In",               description: "Supply, waste, and vent lines roughed in and pressure-tested before closure.", durationDays: 10 },
    { title: "Electrical Rough-In",             description: "Conduits, boxes, and feeders pulled to plan. Panel locations and grounding verified.", durationDays: 10 },
    { title: "Finishing Works",                 description: "Plastering, painting, tile, ceiling, doors, and fixtures installed to spec.", durationDays: 28 },
    { title: "Final Inspection & Turnover",     description: "Punch-list cleared. Final inspection passed and project formally turned over to HCSD.", durationDays: 7 },
  ],
  "Roads & Pavement": [
    { title: "Site Clearing & Survey",          description: "Right-of-way cleared. Centerline staked and elevations verified against approved plans.", durationDays: 5 },
    { title: "Subgrade Preparation",            description: "Subgrade graded, compacted, and proof-rolled to required density.", durationDays: 10 },
    { title: "Base Course Installation",        description: "Aggregate base course placed, watered, and compacted to design thickness.", durationDays: 10 },
    { title: "Drainage Provisions",             description: "Side ditches, culverts, and outfalls in place for proper road drainage.", durationDays: 7 },
    { title: "Concreting & Paving Works",       description: "PCCP poured to design thickness with joints, dowels, and tie bars per spec.", durationDays: 21 },
    { title: "Curing Period",                   description: "Concrete cured for the full design period before opening to traffic.", durationDays: 14 },
    { title: "Line Striping & Signage",         description: "Pavement markings, road signs, and safety devices installed per MUTCD/DPWH.", durationDays: 3 },
    { title: "Final Inspection & Acceptance",   description: "Final walk-through and acceptance by HCSD with all punch items cleared.", durationDays: 3 },
  ],
  "Drainage & Flood Control": [
    { title: "Site Survey & Staking",           description: "Alignment staked and inverts checked against plan.", durationDays: 3 },
    { title: "Excavation",                      description: "Trench excavated to required depth and width with safe slopes or shoring.", durationDays: 10 },
    { title: "Lean Concrete Works",             description: "Lean concrete bedding poured to grade.", durationDays: 5 },
    { title: "Pipe & Culvert Laying",           description: "RCPC/RCBC laid true to line and grade with joints sealed.", durationDays: 14 },
    { title: "Manhole & Catch Basin Construction", description: "Manholes and catch basins built per detail with proper covers and frames.", durationDays: 10 },
    { title: "Backfill & Compaction",           description: "Trenches backfilled in lifts and compacted to required density.", durationDays: 7 },
    { title: "Surface Restoration",             description: "Disturbed surfaces restored to original condition or better.", durationDays: 5 },
    { title: "Hydraulic Testing",               description: "Hydraulic test passed with no leaks observed.", durationDays: 2 },
    { title: "Final Inspection & Acceptance",   description: "Final inspection passed and turnover documents signed.", durationDays: 3 },
  ],
  "Water Supply": [
    { title: "Site Survey & Staking",           description: "Pipeline alignment staked and depths verified against plan.", durationDays: 3 },
    { title: "Trenching & Excavation",          description: "Trench excavated to required depth with safe slopes or shoring.", durationDays: 10 },
    { title: "Mainline Pipe Laying",            description: "Main pipes laid to line and grade with proper bedding.", durationDays: 14 },
    { title: "Valve & Fitting Installation",    description: "Gate valves, air valves, blow-offs, and fittings installed per plan.", durationDays: 5 },
    { title: "Service Connections",             description: "Service taps and meter assemblies installed at each connection point.", durationDays: 7 },
    { title: "Pressure Testing",                description: "System pressure-tested for the required duration with no leaks.", durationDays: 2 },
    { title: "Disinfection & Flushing",         description: "Lines chlorinated, flushed, and bacteriologically cleared before use.", durationDays: 3 },
    { title: "Backfill & Surface Restoration",  description: "Trenches backfilled and surfaces restored to original condition.", durationDays: 5 },
    { title: "Final Inspection & Acceptance",   description: "Final inspection passed and system formally accepted.", durationDays: 3 },
  ],
  "Electrical & Lighting": [
    { title: "Site Survey & Fixture Layout",    description: "Pole positions and fixture layout staked against approved plan.", durationDays: 3 },
    { title: "Post & Pole Installation",        description: "Poles set plumb on concrete foundations to required depth.", durationDays: 7 },
    { title: "Conduit & Wiring Installation",   description: "Underground/aerial conduits and feeders pulled per electrical plan.", durationDays: 10 },
    { title: "Fixture Mounting",                description: "Luminaires mounted, aimed, and secured per detail.", durationDays: 5 },
    { title: "Panel Board & Meter Installation", description: "Panel boards, meters, and disconnects installed and labeled.", durationDays: 5 },
    { title: "Grounding Works",                 description: "Grounding rods driven and bonded; resistance verified within spec.", durationDays: 3 },
    { title: "Circuit Testing & Commissioning", description: "Each circuit tested and commissioned for safe operation.", durationDays: 3 },
    { title: "Final Inspection & Energization", description: "Final inspection passed and system energized by utility.", durationDays: 3 },
  ],
  "Public Facility Rehabilitation": [
    { title: "Condition Assessment & Documentation", description: "Existing condition documented with photos and measurements before any work.", durationDays: 5 },
    { title: "Demolition of Defective Elements", description: "Defective elements safely removed and hauled off-site.", durationDays: 7 },
    { title: "Structural Repairs",              description: "Cracks, spalls, and structural defects repaired per engineering recommendation.", durationDays: 14 },
    { title: "Plumbing & Electrical Repairs",   description: "Defective plumbing/electrical components replaced and tested.", durationDays: 10 },
    { title: "Masonry & Finishing Repairs",     description: "Masonry, plaster, and finishes restored to original or better.", durationDays: 10 },
    { title: "Painting Works",                  description: "Surfaces prepared and painted with required coats per spec.", durationDays: 7 },
    { title: "Fixture Replacement",             description: "Worn fixtures replaced and tested for proper operation.", durationDays: 5 },
    { title: "Final Inspection & Turnover",     description: "Final inspection passed and facility turned over for public use.", durationDays: 3 },
  ],
  "Other": [
    { title: "Project Mobilization",     description: "Contractor mobilized, permits secured, and pre-construction meeting held.", durationDays: 5 },
    { title: "Site Preparation",         description: "Site cleared, staked, and prepared for construction activities.", durationDays: 7 },
    { title: "Implementation Phase 1",   description: "First major implementation phase per the approved program of work.", durationDays: 21 },
    { title: "Implementation Phase 2",   description: "Second major implementation phase per the approved program of work.", durationDays: 21 },
    { title: "Implementation Phase 3",   description: "Third major implementation phase per the approved program of work.", durationDays: 21 },
    { title: "Final Inspection",         description: "Final walk-through with HCSD; punch list issued and cleared.", durationDays: 5 },
    { title: "Project Turnover",         description: "Formal acceptance and turnover documents signed by all parties.", durationDays: 3 },
  ],
};

// Maps a verified mobile project-type value to its milestone template. A
// projectType that is missing, "unknown", or not in this map is treated as
// unverified and rejected upstream with a `failed-precondition`.
const PROJECT_TYPE_TO_TEMPLATE: Record<string, string> = {
  road_concreting: "Roads & Pavement",
  drainage_construction: "Drainage & Flood Control",
  multi_purpose_building: "Building Construction",
  covered_court: "Building Construction",
  day_care_center: "Building Construction",
  footbridge: "Building Construction",
  slope_protection: "Drainage & Flood Control",
  waterworks: "Water Supply",
  electrification: "Electrical & Lighting",
};

function distributeWeights(count: number): number[] {
  if (count <= 0) return [];
  const base = Math.floor(100 / count);
  const weights = new Array<number>(count).fill(base);
  let remainder = 100 - base * count;
  for (let i = 0; i < count && remainder > 0; i++, remainder--) {
    weights[i] += 1;
  }
  return weights;
}

type AIGeneratedPhase = {
  title: string;
  description: string;
  durationDays: number;
};

async function generateMilestonesWithAI(
  projectData: Record<string, unknown>,
  resolvedType: string,
  referenceTemplate: MilestoneTemplate[],
): Promise<AIGeneratedPhase[]> {
  const apiKey = anthropicKey.value();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY secret not configured");
  }

  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  const name = str(projectData.projectName) || str(projectData.title);
  const description = str(projectData.description);
  const barangay = str(projectData.barangay);
  const sitio = str(projectData.sitioStreet);
  const fallbackLoc = str(projectData.location);
  const location =
    [sitio, barangay].filter((s) => s.length > 0).join(", ") || fallbackLoc;
  const contractAmount = num(projectData.contractAmount) ?? num(projectData.budget);
  const contractor = str(projectData.contractor);
  const startDate =
    str(projectData.officialDateStarted) || str(projectData.startDate);
  const completionDate =
    str(projectData.originalDateCompletion) || str(projectData.completionDate);
  const fundingSource = str(projectData.fundingSource);

  const projectContext = [
    `Project name: ${name || "(unspecified)"}`,
    `Project type: ${resolvedType}`,
    `Description: ${description || "(none provided)"}`,
    `Location: ${location || "(unspecified)"}`,
    contractAmount !== null
      ? `Contract amount: PHP ${contractAmount.toLocaleString("en-PH")}`
      : "Contract amount: (unspecified)",
    `Contractor: ${contractor || "(unspecified)"}`,
    `Funding source: ${fundingSource || "(unspecified)"}`,
    `Start date: ${startDate || "(unspecified)"}`,
    `Target completion: ${completionDate || "(unspecified)"}`,
  ].join("\n");

  const referenceList = referenceTemplate
    .map(
      (p, i) =>
        `${i + 1}. ${p.title} — ${p.description} (~${p.durationDays} days)`,
    )
    .join("\n");

  const system =
    "You are a senior LGU (Local Government Unit) infrastructure project planner in the Philippines, advising HCSD field engineers. Generate a realistic, project-specific milestone breakdown that an engineer can monitor with photo proofs. Use DPWH/HCSD-style phase terminology. Tailor descriptions to the actual project scope, contract amount, and timeline rather than restating generic templates verbatim.";

  const userPrompt = `Generate milestones for this LGU infrastructure project. Use the reference template below as a starting point for "${resolvedType}" projects, but tailor titles, descriptions, and durations to the actual project context. Adjust phase count and durations based on contract amount, location specifics, and described scope. Each description must state measurable completion criteria a field engineer can verify with photos.

PROJECT CONTEXT:
${projectContext}

REFERENCE TEMPLATE (standard phases for "${resolvedType}"):
${referenceList}

Return your milestone plan via the submit_milestones tool.`;

  const client = new Anthropic({ apiKey });

  const result = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    system,
    tools: [
      {
        name: "submit_milestones",
        description: "Submit the tailored milestone plan for this project.",
        input_schema: {
          type: "object",
          properties: {
            milestones: {
              type: "array",
              minItems: 5,
              maxItems: 12,
              items: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Phase title, ≤ 80 characters",
                  },
                  description: {
                    type: "string",
                    description:
                      "Measurable completion criteria a field engineer can verify with photos, 40–250 characters",
                  },
                  durationDays: {
                    type: "integer",
                    description:
                      "Estimated duration of this phase in days, between 1 and 180",
                  },
                },
                required: ["title", "description", "durationDays"],
              },
            },
          },
          required: ["milestones"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "submit_milestones" },
    messages: [{ role: "user", content: userPrompt }],
  });

  const toolBlock = result.content.find((b) => b.type === "tool_use");
  if (!toolBlock || toolBlock.type !== "tool_use") {
    throw new HttpsError(
      "internal",
      "milestone-validation-failed: AI response did not include a tool_use block",
    );
  }

  const input = toolBlock.input as { milestones?: unknown };
  if (!Array.isArray(input.milestones) || input.milestones.length === 0) {
    throw new HttpsError(
      "internal",
      "milestone-validation-failed: AI returned no milestones",
    );
  }

  const sanitized: AIGeneratedPhase[] = [];
  for (const raw of input.milestones) {
    if (!raw || typeof raw !== "object") continue;
    const m = raw as { title?: unknown; description?: unknown; durationDays?: unknown };
    const title = typeof m.title === "string" ? m.title.trim() : "";
    const desc = typeof m.description === "string" ? m.description.trim() : "";
    const days =
      typeof m.durationDays === "number" && Number.isFinite(m.durationDays)
        ? Math.round(m.durationDays)
        : 0;
    if (title.length === 0 || title.length > 120) continue;
    if (desc.length === 0 || desc.length > 400) continue;
    if (days < 1) continue;
    sanitized.push({
      title,
      description: desc,
      durationDays: Math.min(180, Math.max(1, days)),
    });
  }

  if (sanitized.length < 3) {
    throw new HttpsError(
      "internal",
      `milestone-validation-failed: AI returned too few valid milestones (${sanitized.length})`,
    );
  }

  return sanitized;
}

export const generateMilestones = onCall(
  { region: "asia-southeast1", secrets: [anthropicKey] },
  async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId } = (request.data ?? {}) as { projectId?: string };
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required.");
  }


  const projectRef = admin.firestore().doc(`projects/${projectId}`);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Project not found.");
  }
  const projectData = projectSnap.data() ?? {};
  assertSameTenant(request.auth.token.tenantId, projectData.tenantId);
  if (projectData.projectEngineer && projectData.projectEngineer !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Only the assigned engineer can generate milestones.");
  }


  const rawType = typeof projectData.projectType === "string" ? projectData.projectType : "";
  const templateKey = PROJECT_TYPE_TO_TEMPLATE[rawType];
  if (!templateKey) {
    throw new HttpsError(
      "failed-precondition",
      "Project has not been verified as a city-funded barangay-level infrastructure project.",
    );
  }
  const resolvedType = templateKey;
  const template = MILESTONE_TEMPLATES[resolvedType];


  const msCollection = admin.firestore().collection(`projects/${projectId}/milestones`);
  const tenantId = typeof projectData.tenantId === "string" ? projectData.tenantId : undefined;
  const existingSnap = await msCollection.get();

  // Recover from the pre-deploy bug where the old generator wrote milestones
  // without tenantId. Those documents are invisible to the mobile listener
  // (it filters by `where tenantId == tid`). Patch them in place so the
  // engineer can pick up the review where they left off, instead of being
  // permanently blocked by an `already-exists` error.
  if (!existingSnap.empty) {
    const orphans = tenantId
      ? existingSnap.docs.filter((d) => typeof d.data().tenantId !== "string")
      : [];

    if (orphans.length > 0 && tenantId) {
      const repairBatch = admin.firestore().batch();
      orphans.forEach((d) => repairBatch.update(d.ref, { tenantId }));
      await repairBatch.commit();

      await logAuditTrail(
        request.auth.uid,
        request.auth.token.email || "",
        "Milestones Repaired",
        `Project ${projectId}: backfilled tenantId on ${orphans.length} orphan draft${orphans.length === 1 ? "" : "s"}`,
        true,
        projectId,
        undefined,
        tenantId,
      );

      return { success: true, count: orphans.length, repaired: true };
    }

    throw new HttpsError("already-exists", "Milestones already exist for this project.");
  }

  let phases: AIGeneratedPhase[] = template.map((p) => ({
    title: p.title,
    description: p.description,
    durationDays: p.durationDays,
  }));
  let generatedBy: "ai" | "template" = "template";
  let aiError: string | undefined;

  try {
    phases = await generateMilestonesWithAI(projectData, resolvedType, template);
    generatedBy = "ai";
  } catch (e: unknown) {
    // Validation failures (bad AI output) must reach the client as
    // `milestone-validation-failed`. Only transient/API errors fall back to
    // the static template.
    if (e instanceof HttpsError) throw e;
    aiError =
      e instanceof Error ? e.message : typeof e === "string" ? e : "unknown error";
    console.warn(
      `[generateMilestones] AI generation failed, using template fallback for project ${projectId}:`,
      aiError,
    );
  }

  const batch = admin.firestore().batch();
  const weights = distributeWeights(phases.length);

  phases.forEach((phase, i) => {
    const docRef = msCollection.doc();
    batch.set(docRef, {
      title: phase.title,
      description: phase.description,
      weightPercentage: weights[i],
      suggestedDurationDays: phase.durationDays,
      sequence: i + 1,
      status: "Pending",
      proofs: [],
      confirmed: false,
      generatedBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      ...(tenantId ? { tenantId } : {}),
    });
  });

  await batch.commit();

  const uid   = request.auth.uid;
  const email = request.auth.token.email || "";
  const sourceSuffix =
    generatedBy === "ai"
      ? ` · AI-generated (${phases.length} phases)`
      : aiError
      ? ` · template (AI failed: ${aiError.slice(0, 120)})`
      : ` · template (${phases.length} phases)`;
  await logAuditTrail(
    uid, email,
    "Milestones Drafted",
    `Project: ${projectId} (type: ${rawType} → template "${resolvedType}")${sourceSuffix}`,
    true,
    projectId,
    undefined,
    typeof projectData.tenantId === "string" ? projectData.tenantId : undefined,
  );

  return {
    success: true,
    count: phases.length,
    projectType: resolvedType,
    generatedBy,
  };
});


export const deleteMilestone = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId, milestoneId } = (request.data ?? {}) as {
    projectId?: string;
    milestoneId?: string;
  };
  if (!projectId || !milestoneId) {
    throw new HttpsError("invalid-argument", "projectId and milestoneId are required.");
  }

  const projectRef = admin.firestore().doc(`projects/${projectId}`);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Project not found.");
  }
  const projectData = projectSnap.data() ?? {};
  assertSameTenant(request.auth.token.tenantId, projectData.tenantId);
  if (projectData.projectEngineer && projectData.projectEngineer !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Only the assigned engineer can edit milestones.");
  }

  const milestoneRef = admin.firestore()
    .doc(`projects/${projectId}/milestones/${milestoneId}`);
  const milestoneSnap = await milestoneRef.get();
  if (!milestoneSnap.exists) {
    throw new HttpsError("not-found", "Milestone not found.");
  }
  const m = milestoneSnap.data() ?? {};
  if (m.confirmed === true) {
    throw new HttpsError(
      "failed-precondition",
      "Confirmed milestones cannot be deleted from the mobile app.",
    );
  }

  await milestoneRef.delete();

  const uid   = request.auth.uid;
  const email = request.auth.token.email || "";
  await logAuditTrail(
    uid, email,
    "Milestone Draft Removed",
    `Project ${projectId} · phase: ${m.title ?? milestoneId}`,
    true,
    undefined,
    undefined,
    typeof projectData.tenantId === "string" ? projectData.tenantId : undefined,
  );

  return { success: true };
});


export const addManualMilestone = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId, title, description, weightPercentage, suggestedDurationDays } =
    (request.data ?? {}) as {
      projectId?: string;
      title?: string;
      description?: string;
      weightPercentage?: number;
      suggestedDurationDays?: number;
    };

  if (!projectId || typeof projectId !== "string") {
    throw new HttpsError("invalid-argument", "projectId is required.");
  }
  if (!title || typeof title !== "string" || title.trim().length === 0) {
    throw new HttpsError("invalid-argument", "title is required.");
  }
  if (title.length > 120) {
    throw new HttpsError("invalid-argument", "title must be 120 characters or fewer.");
  }
  if (description !== undefined && typeof description !== "string") {
    throw new HttpsError("invalid-argument", "description must be a string.");
  }
  if (typeof description === "string" && description.length > 600) {
    throw new HttpsError("invalid-argument", "description must be 600 characters or fewer.");
  }
  if (typeof weightPercentage !== "number" || !Number.isFinite(weightPercentage) ||
      weightPercentage < 0 || weightPercentage > 100) {
    throw new HttpsError("invalid-argument", "weightPercentage must be a number between 0 and 100.");
  }
  if (typeof suggestedDurationDays !== "number" || !Number.isFinite(suggestedDurationDays) ||
      suggestedDurationDays < 1 || suggestedDurationDays > 365) {
    throw new HttpsError("invalid-argument", "suggestedDurationDays must be a number between 1 and 365.");
  }

  const projectRef = admin.firestore().doc(`projects/${projectId}`);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Project not found.");
  }
  const projectData = projectSnap.data() ?? {};
  assertSameTenant(request.auth.token.tenantId, projectData.tenantId);
  if (projectData.projectEngineer && projectData.projectEngineer !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Only the assigned engineer can add milestones.");
  }

  // Review-phase guard: only allow manual add when AI drafts exist to review.
  const milestonesCol = admin.firestore().collection(`projects/${projectId}/milestones`);
  const allSnap = await milestonesCol.get();
  if (allSnap.empty) {
    throw new HttpsError(
      "failed-precondition",
      "Generate milestones first; manual add is only available during the AI review phase.",
    );
  }
  const hasDrafts = allSnap.docs.some((d) => d.data().confirmed === false);
  if (!hasDrafts) {
    throw new HttpsError(
      "failed-precondition",
      "Manual add is only available while reviewing draft milestones.",
    );
  }

  let maxSeq = 0;
  allSnap.docs.forEach((d) => {
    const s = d.data().sequence;
    if (typeof s === "number" && s > maxSeq) maxSeq = s;
  });

  const tenantId = typeof projectData.tenantId === "string" ? projectData.tenantId : undefined;
  const newDoc = milestonesCol.doc();
  await newDoc.set({
    title: title.trim(),
    description: typeof description === "string" ? description.trim() : "",
    weightPercentage,
    suggestedDurationDays,
    sequence: maxSeq + 1,
    status: "Pending",
    proofs: [],
    confirmed: false,
    generatedBy: "manual",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(tenantId ? { tenantId } : {}),
  });

  const uid   = request.auth.uid;
  const email = request.auth.token.email || "";
  await logAuditTrail(
    uid, email,
    "Milestone Manually Added",
    `Project ${projectId} · phase: ${title.trim()}`,
    true,
    projectId,
    newDoc.id,
    tenantId,
  );

  return { success: true, milestoneId: newDoc.id, sequence: maxSeq + 1 };
});


type PhasePayload = {
  id?: string;
  sequence?: number;
  title?: string;
  description?: string;
  weightPercentage?: number;
  suggestedDurationDays?: number;
  isNew?: boolean;
  pendingDelete?: boolean;
};

export const confirmMilestonePlan = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { projectId, phases } = (request.data ?? {}) as {
      projectId?: string;
      phases?: PhasePayload[];
    };

    if (!projectId || typeof projectId !== "string") {
      throw new HttpsError("invalid-argument", "projectId is required.");
    }
    if (!Array.isArray(phases) || phases.length === 0) {
      throw new HttpsError("invalid-argument", "phases must be a non-empty array.");
    }
    if (phases.length > 12) {
      throw new HttpsError("invalid-argument", "Cannot confirm more than 12 phases.");
    }

    const projectRef = admin.firestore().doc(`projects/${projectId}`);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "Project not found.");
    }
    const projectData = projectSnap.data() ?? {};
    assertSameTenant(request.auth.token.tenantId, projectData.tenantId);
    if (
      projectData.projectEngineer &&
      projectData.projectEngineer !== request.auth.uid
    ) {
      throw new HttpsError(
        "permission-denied",
        "Only the assigned engineer can confirm milestones.",
      );
    }

    const survivors = phases.filter((p) => !p.pendingDelete);
    if (survivors.length === 0) {
      throw new HttpsError(
        "failed-precondition",
        "At least one phase must remain after deletions.",
      );
    }

    const sortedSeq = survivors
      .map((p) => p.sequence)
      .filter((s): s is number => typeof s === "number")
      .sort((a, b) => a - b);
    if (sortedSeq.length !== survivors.length) {
      throw new HttpsError("invalid-argument", "Every phase requires a sequence.");
    }
    for (let i = 0; i < sortedSeq.length; i += 1) {
      if (sortedSeq[i] !== i + 1) {
        throw new HttpsError(
          "failed-precondition",
          "Phase sequences must be dense 1..N.",
        );
      }
    }

    let weightSum = 0;
    for (const p of survivors) {
      if (
        typeof p.title !== "string" ||
        p.title.trim().length === 0 ||
        p.title.length > 120
      ) {
        throw new HttpsError("invalid-argument", "Each phase needs a valid title.");
      }
      if (
        p.description !== undefined &&
        (typeof p.description !== "string" || p.description.length > 600)
      ) {
        throw new HttpsError("invalid-argument", "Description must be ≤ 600 chars.");
      }
      if (
        typeof p.weightPercentage !== "number" ||
        !Number.isFinite(p.weightPercentage) ||
        p.weightPercentage < 1 ||
        p.weightPercentage > 100
      ) {
        throw new HttpsError(
          "invalid-argument",
          "weightPercentage must be 1..100.",
        );
      }
      if (
        typeof p.suggestedDurationDays !== "number" ||
        !Number.isFinite(p.suggestedDurationDays) ||
        p.suggestedDurationDays < 1 ||
        p.suggestedDurationDays > 365
      ) {
        throw new HttpsError(
          "invalid-argument",
          "suggestedDurationDays must be 1..365.",
        );
      }
      weightSum += p.weightPercentage;
    }
    if (weightSum !== 100) {
      throw new HttpsError(
        "failed-precondition",
        `Weights must total exactly 100 (got ${weightSum}).`,
      );
    }

    const milestonesCol = admin
      .firestore()
      .collection(`projects/${projectId}/milestones`);
    const existingSnap = await milestonesCol.get();
    const existingById = new Map<string, FirebaseFirestore.DocumentSnapshot>();
    existingSnap.docs.forEach((d) => existingById.set(d.id, d));

    // Reject confirming if any existing doc is already confirmed (lockdown).
    for (const d of existingSnap.docs) {
      if (d.data().confirmed === true) {
        throw new HttpsError(
          "failed-precondition",
          "Milestones already confirmed; reopen via HCSD to edit.",
        );
      }
    }

    const tenantId =
      typeof projectData.tenantId === "string"
        ? projectData.tenantId
        : undefined;
    const batch = admin.firestore().batch();

    // Deletes
    for (const p of phases) {
      if (p.pendingDelete && p.id && existingById.has(p.id)) {
        batch.delete(milestonesCol.doc(p.id));
      }
    }

    // Updates + creates
    for (const p of survivors) {
      const baseFields = {
        title: (p.title ?? "").trim(),
        description: typeof p.description === "string"
          ? p.description.trim()
          : "",
        weightPercentage: p.weightPercentage as number,
        suggestedDurationDays: p.suggestedDurationDays as number,
        sequence: p.sequence as number,
        confirmed: true,
      };

      if (p.isNew || !p.id || !existingById.has(p.id)) {
        const newRef = milestonesCol.doc();
        batch.set(newRef, {
          ...baseFields,
          status: "Pending",
          proofs: [],
          generatedBy: "manual",
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          ...(tenantId ? { tenantId } : {}),
        });
      } else {
        batch.update(milestonesCol.doc(p.id), baseFields);
      }
    }

    await batch.commit();

    const uid = request.auth.uid;
    const email = request.auth.token.email || "";
    await logAuditTrail(
      uid,
      email,
      "Milestones Confirmed",
      `Project ${projectId} · ${survivors.length} phase${survivors.length !== 1 ? "s" : ""} confirmed`,
      true,
      projectId,
      undefined,
      tenantId,
    );

    return { success: true, count: survivors.length };
  },
);


export const markProjectOngoing = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId } = (request.data ?? {}) as { projectId?: string };
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required.");
  }

  const projectRef = admin.firestore().doc(`projects/${projectId}`);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Project not found.");
  }

  const projectData = projectSnap.data() as { status?: string; tenantId?: string };
  assertSameTenant(request.auth.token.tenantId, projectData.tenantId);
  const currentStatus = (projectData?.status ?? "").toLowerCase();


  const preActive = ["draft", "for mayor"];
  if (!preActive.includes(currentStatus)) {
    return { success: true, skipped: true };
  }

  await projectRef.update({
    status: "In Progress",
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  const uid   = request.auth.uid;
  const email = request.auth.token.email || "";
  await logAuditTrail(
    uid, email,
    "Project Status Updated",
    `Project ${projectId}: "${projectData.status}" → "In Progress" (engineer assigned)`,
    true,
    undefined,
    undefined,
    typeof projectData.tenantId === "string" ? projectData.tenantId : undefined,
  );

  return { success: true };
});


export const completePasswordChange = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid = request.auth.uid;
  const userRef = admin.firestore().doc(`users/${uid}`);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    throw new HttpsError("not-found", "User document not found.");
  }

  await userRef.update({ mustChangePassword: false });


  const email = request.auth.token.email || "";
  const tokenTenantId =
    typeof request.auth.token.tenantId === "string" ? request.auth.token.tenantId : undefined;
  const docTenantId = (userDoc.data() ?? {}).tenantId;
  const tenantId =
    tokenTenantId ?? (typeof docTenantId === "string" ? docTenantId : undefined);
  await logAuditTrail(
    uid, email, "Password Set", "First-time login", true,
    undefined, undefined, tenantId,
  );

  return { success: true };
});


export const logMobileAuditTrail = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { action, details, syncToDEPW, syncToHCSD, targetId, milestoneId } = request.data as {
    action?: string;

    details?: string | Record<string, unknown>;
    syncToDEPW?: boolean;
    syncToHCSD?: boolean;
    targetId?: string;
    milestoneId?: string;
  };

  if (!action) {
    throw new HttpsError("invalid-argument", "action is required.");
  }


  let message: string;
  if (typeof details === "string") {
    message = details;
  } else if (details && typeof details === "object") {
    message = Object.entries(details)
      .map(([k, v]) => `${k}=${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join(", ");
  } else {
    message = action;
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email || "";


  const tokenTenantId =
    typeof request.auth.token.tenantId === "string"
      ? request.auth.token.tenantId
      : undefined;
  const userSnap = await admin.firestore().doc(`users/${uid}`).get();
  const docTenantId = (userSnap.data() ?? {}).tenantId;
  const tenantId =
    tokenTenantId ?? (typeof docTenantId === "string" ? docTenantId : undefined);

  if (!tenantId) {

    throw new HttpsError(
      "failed-precondition",
      "Account missing tenantId — audit entry skipped.",
    );
  }

  await logAuditTrail(
    uid, email, action, message,
    syncToHCSD === true || syncToDEPW === true,
    typeof targetId === "string" ? targetId : undefined,
    typeof milestoneId === "string" ? milestoneId : undefined,
    tenantId,
  );

  return { success: true };
});


export const uploadProfilePhoto = onCall(
  { region: "asia-southeast1", memory: "512MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    await enforceRateLimit(request.auth.uid, "uploadProfilePhoto", {
      max: 5,
      windowMs: 60 * 60 * 1000,
      lockoutMs: 60 * 60 * 1000,
    });

    const { base64, contentType } = (request.data ?? {}) as {
      base64?: string;
      contentType?: string;
    };

    const uid = request.auth.uid;
    const email = request.auth.token.email || "";

    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    const userTenantId = (userSnap.data() ?? {}).tenantId;
    assertSameTenant(request.auth.token.tenantId, userTenantId);

    const bucket = admin.storage().bucket();
    const file = bucket.file(`profile-photos/${uid}`);


    if (!base64) {
      try { await file.delete(); } catch { }

      await admin.firestore().doc(`users/${uid}`).update({
        photoURL: admin.firestore.FieldValue.delete(),
        photoChangedAt: Date.now(),
      });
      try { await admin.auth().updateUser(uid, { photoURL: null as never }); } catch { }
      await logAuditTrail(
        uid, email, "Profile Photo Removed", "Profile photo removed", false,
        undefined, undefined,
        typeof userTenantId === "string" ? userTenantId : undefined,
      );

      return { success: true, photoURL: "" };
    }


    const mime = contentType || "image/jpeg";
    const buffer = Buffer.from(base64, "base64");

    if (buffer.length === 0) {
      throw new HttpsError("invalid-argument", "Empty image data.");
    }
    if (buffer.length > 5 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Photo exceeds 5MB limit.");
    }

    const token = crypto.randomUUID();
    await file.save(buffer, {
      metadata: {
        contentType: mime,
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    const encodedPath = encodeURIComponent(`profile-photos/${uid}`);
    const photoURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

    await admin.firestore().doc(`users/${uid}`).update({
      photoURL,
      photoChangedAt: Date.now(),
    });
    try { await admin.auth().updateUser(uid, { photoURL }); } catch { }
    await logAuditTrail(
      uid, email, "Profile Photo Updated", "Profile photo updated", false,
      undefined, undefined,
      typeof userTenantId === "string" ? userTenantId : undefined,
    );

    return { success: true, photoURL };
  },
);


export const uploadProofPhoto = onCall(

  { region: "asia-southeast1", memory: "1GiB", timeoutSeconds: 120, invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    await enforceRateLimit(request.auth.uid, "uploadProofPhoto", {
      max: 20,
      windowMs: 60 * 60 * 1000,
      lockoutMs: 60 * 60 * 1000,
    });

    const {
      projectId, milestoneId, base64,
      capturedAt, latitude, longitude, accuracy,
    } = (request.data ?? {}) as {
      projectId?: string;
      milestoneId?: string;
      base64?: string;
      capturedAt?: number;
      latitude?: number;
      longitude?: number;
      accuracy?: number;
    };

    if (!projectId || !milestoneId || !base64) {
      throw new HttpsError("invalid-argument", "projectId, milestoneId and base64 are required.");
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      throw new HttpsError("invalid-argument", "Geotag coordinates are required.");
    }

    if (typeof capturedAt === "number") {
      const now = Date.now();
      if (capturedAt > now + 60_000) {
        throw new HttpsError("invalid-argument", "Photo timestamp is in the future.");
      }
      if (now - capturedAt > 15 * 60_000) {
        throw new HttpsError("invalid-argument", "Photo is too old to upload.");
      }
    }

    const uid   = request.auth.uid;
    const email = request.auth.token.email || "";


    const projectRef  = admin.firestore().doc(`projects/${projectId}`);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "Project not found.");
    }
    const projectData = projectSnap.data() ?? {};
    assertSameTenant(request.auth.token.tenantId, projectData.tenantId);
    if (projectData.projectEngineer && projectData.projectEngineer !== uid) {
      throw new HttpsError("permission-denied", "Only the assigned engineer can upload proofs for this project.");
    }


    const milestoneRef  = admin.firestore().doc(`projects/${projectId}/milestones/${milestoneId}`);
    const milestoneSnap = await milestoneRef.get();
    if (!milestoneSnap.exists) {
      throw new HttpsError("not-found", "Milestone not found.");
    }
    const m = milestoneSnap.data() ?? {};
    if (m.confirmed === false) {
      throw new HttpsError("failed-precondition", "This phase is still a draft. Confirm it before uploading proof.");
    }

    const existingProofs = Array.isArray(m.proofs) ? m.proofs : [];
    const ts = typeof capturedAt === "number" ? capturedAt : Date.now();
    const proofId = `${ts}_${uid}`;


    const existingProof = existingProofs.find((p: { id?: string }) => p?.id === proofId);
    if (existingProof) {
      return { success: true, proof: existingProof, idempotent: true };
    }


    if (existingProofs.length >= 5) {
      throw new HttpsError("failed-precondition", "This phase already has the maximum of 5 proofs.");
    }


    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0) {
      throw new HttpsError("invalid-argument", "Empty image data.");
    }
    if (buffer.length > 10 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Photo exceeds 10MB limit.");
    }


    const safeProjectId   = projectId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
    const safeMilestoneId = milestoneId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);

    const storagePath = `projects/${safeProjectId}/milestones/${safeMilestoneId}/proofs/${ts}.jpg`;
    const bucket = admin.storage().bucket();
    const file   = bucket.file(storagePath);
    const token  = crypto.randomUUID();


    const placeName = await reverseGeocode(latitude, longitude);


    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    const profile = (userSnap.data() ?? {}) as {
      firstName?: string;
      lastName?: string;
      name?: string;
      role?: string;
      email?: string;
    };


    const accuracyM = Math.round(accuracy ?? 0);
    const bannerLines: string[] = [];
    if (placeName) bannerLines.push(placeName);
    bannerLines.push(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}  ±${accuracyM}m`);
    bannerLines.push(formatManilaTime(ts));
    bannerLines.push(buildEngineerLabel({ ...profile, email }));
    bannerLines.push(buildRoleLabel(profile.role));

    const stampedBuffer = await burnInBanner(buffer, bannerLines);


    const finalBuffer = embedExifGps(stampedBuffer, latitude, longitude, ts, accuracy);

    await file.save(finalBuffer, {
      metadata: {
        contentType: "image/jpeg",
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    const encodedPath = encodeURIComponent(storagePath);
    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

    const fileName  = `${ts}.jpg`;

    const capturedAtTs = admin.firestore.Timestamp.fromMillis(ts);
    const uploadedAtTs = admin.firestore.Timestamp.now();
    const proof = {
      id: proofId,
      fileName,
      capturedAt: capturedAtTs,
      uploadedAt: uploadedAtTs,
      gps: { lat: latitude, lng: longitude },
      url: downloadURL,
      storagePath,
      accuracy: Math.round(accuracy ?? 0),
      location: placeName || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      uploadedBy: uid,
    };

    await milestoneRef.update({
      proofs: admin.firestore.FieldValue.arrayUnion(proof),

      status: m.status === "Completed" ? "Completed" : "Pending",
    });

    await logAuditTrail(
      uid, email,
      "Proof Uploaded",
      `${projectData.projectName ?? projectData.title ?? "Project"} · ${m.title ?? milestoneId}`,
      true,
      projectId,
      milestoneId,
      typeof projectData.tenantId === "string" ? projectData.tenantId : undefined,
    );

    return { success: true, proof };
  },
);


export const sendPasswordResetOtp = onCall(
  { region: "asia-southeast1", secrets: [gmailUser, gmailPass] },
  async (request) => {
    const { email } = (request.data ?? {}) as { email?: string };

    if (!email || typeof email !== "string") {
      return { success: true };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashValue(normalizedEmail);

    await enforceRateLimit(emailHash, "sendPasswordResetOtp", {
      max: 5,
      windowMs: 60 * 1000,
      lockoutMs: 5 * 60 * 1000,
    });

    try {

      let uid: string;
      try {
        const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
        uid = userRecord.uid;
      } catch {
        return { success: true };
      }


      const cooldownRef = admin.firestore().doc(`passwordResetCooldowns/${emailHash}`);
      const cooldownSnap = await cooldownRef.get();
      if (cooldownSnap.exists) {
        const data = cooldownSnap.data() as { sentAt?: admin.firestore.Timestamp };
        const sentMs = data.sentAt?.toMillis() ?? 0;
        if (Date.now() - sentMs < SEND_COOLDOWN_MS) {
          return { success: true };
        }
      }


      const otp = generateOTP();
      const expiresAt = Date.now() + OTP_EXPIRY_MS;

      await admin.firestore().doc(`passwordResetOtps/${emailHash}`).set({
        hashedCode: hashValue(otp),
        uid,
        email: normalizedEmail,
        expiresAt,
        attempts: 0,
        verified: false,
      });

      await cooldownRef.set({ sentAt: admin.firestore.FieldValue.serverTimestamp() });


      const transporter = createTransporter(gmailUser.value(), gmailPass.value());
      await transporter.sendMail({
        from: `"TranspiraFund" <${gmailUser.value()}>`,
        to: normalizedEmail,
        subject: "TranspiraFund — Password Reset Code",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;">
            <div style="background:#0D6E6E;padding:24px;text-align:center;border-radius:8px 8px 0 0;">
              <h2 style="color:#fff;margin:0;">TranspiraFund</h2>
              <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;">Project Engineer Portal</p>
            </div>
            <div style="background:#fff;padding:32px;border:1px solid #E2E8F0;border-top:none;border-radius:0 0 8px 8px;">
              <h3 style="margin:0 0 16px;color:#1A202C;">Password Reset Code</h3>
              <p style="color:#4A5568;margin:0 0 24px;">Enter this 6-digit code in the TranspiraFund app to reset your password:</p>
              <div style="background:#F7FAFC;border:2px dashed #0D6E6E;border-radius:8px;padding:20px;text-align:center;margin:0 0 24px;">
                <span style="font-size:36px;font-weight:900;letter-spacing:12px;color:#0D6E6E;">${otp}</span>
              </div>
              <p style="color:#718096;font-size:13px;margin:0 0 8px;">&#9200; This code expires in <strong>10 minutes</strong>.</p>
              <p style="color:#718096;font-size:13px;margin:0;">If you did not request this, you can safely ignore this email.</p>
            </div>
            <p style="text-align:center;color:#A0AEC0;font-size:12px;margin-top:16px;">
              Construction Services Division, HCSD
            </p>
          </div>
        `,
      });
    } catch {

    }

    return { success: true };
  },
);


export const verifyPasswordResetOtp = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const { email, code } = (request.data ?? {}) as { email?: string; code?: string };

    if (!email || !code) {
      throw new HttpsError("invalid-argument", "email and code are required.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashValue(normalizedEmail);

    await enforceRateLimit(emailHash, "verifyPasswordResetOtp", {
      max: 10,
      windowMs: 60 * 1000,
      lockoutMs: 5 * 60 * 1000,
    });

    const otpRef = admin.firestore().doc(`passwordResetOtps/${emailHash}`);
    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      throw new HttpsError("not-found", "Invalid or expired code. Please request a new one.");
    }

    const otpData = otpSnap.data() as {
      hashedCode: string;
      uid: string;
      expiresAt: number;
      attempts: number;
      verified: boolean;
    };


    if (Date.now() > otpData.expiresAt) {
      await otpRef.delete();
      throw new HttpsError("deadline-exceeded", "This code has expired. Please request a new one.");
    }


    if (otpData.attempts >= MAX_VERIFY_ATTEMPTS) {
      await otpRef.delete();
      throw new HttpsError("resource-exhausted", "Too many attempts. Please request a new code.");
    }


    if (hashValue(code.trim()) !== otpData.hashedCode) {
      const remaining = MAX_VERIFY_ATTEMPTS - otpData.attempts - 1;
      await otpRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
      if (remaining <= 0) {
        await otpRef.delete();
        throw new HttpsError("resource-exhausted", "Incorrect code. No attempts remaining. Please request a new code.");
      }
      throw new HttpsError(
        "invalid-argument",
        `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      );
    }


    await otpRef.update({ verified: true });

    return { success: true };
  },
);


export const resetPasswordWithOtp = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const { email, newPassword } = (request.data ?? {}) as {
      email?: string;
      newPassword?: string;
    };

    if (!email || !newPassword) {
      throw new HttpsError("invalid-argument", "email and newPassword are required.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashValue(normalizedEmail);

    await enforceRateLimit(emailHash, "resetPasswordWithOtp", {
      max: 5,
      windowMs: 60 * 1000,
      lockoutMs: 10 * 60 * 1000,
    });

    const otpRef = admin.firestore().doc(`passwordResetOtps/${emailHash}`);
    const otpSnap = await otpRef.get();

    if (!otpSnap.exists) {
      throw new HttpsError("not-found", "Reset session expired. Please start over.");
    }

    const otpData = otpSnap.data() as {
      uid: string;
      expiresAt: number;
      verified: boolean;
    };

    if (!otpData.verified) {
      throw new HttpsError("failed-precondition", "Code not verified. Please verify your code first.");
    }

    if (Date.now() > otpData.expiresAt) {
      await otpRef.delete();
      throw new HttpsError("deadline-exceeded", "Reset session expired. Please start over.");
    }


    try {
      await admin.auth().updateUser(otpData.uid, { password: newPassword });
    } catch (e) {
      const fbErr = e as { code?: string };
      if (fbErr.code === "auth/weak-password") {
        throw new HttpsError("invalid-argument", "Password is too weak. Please use a stronger password.");
      }
      throw new HttpsError("internal", "Failed to update password. Please try again.");
    }


    await otpRef.delete();


    const actorSnap = await admin.firestore().doc(`users/${otpData.uid}`).get();
    const actorTenantId = (actorSnap.data() ?? {}).tenantId;


    await logAuditTrail(
      otpData.uid,
      normalizedEmail,
      "Password Reset",
      "Verified via email OTP",
      false,
      undefined,
      undefined,
      typeof actorTenantId === "string" ? actorTenantId : undefined,
    );

    return { success: true };
  },
);
