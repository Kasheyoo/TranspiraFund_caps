import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import Anthropic from "@anthropic-ai/sdk";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { SME_PROJECTS, type SmeProject } from "./data/dataset";
import {
  TITLE_CONFIDENCE_THRESHOLD,
  checkTitleStructureServer,
  validateTitleWithAI,
  validateTitlesWithAI,
} from "./titleValidation";

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


// Allowlist of verified mobile project-type values. A projectType missing,
// "unknown", or not in this set is rejected upstream with `failed-precondition`.
// The category → template payload that used to live on the value side has moved
// to depw_milestone_dataset.json (installed in Phase 3).
const SUPPORTED_PROJECT_TYPES: ReadonlySet<string> = new Set([
  "road_concreting",
  "drainage_construction",
  "multi_purpose_building",
  "covered_court",
  "day_care_center",
  "footbridge",
  "slope_protection",
  "waterworks",
  "electrification",
]);

// 0-based indices into SME_PROJECTS for each mobile projectType enum value.
// Types with an empty array borrow examples via EXAMPLE_TYPE_FALLBACK below.
// Note: footbridge is the mobile enum's only bridge slot. SME projects #12
// and #13 are likely vehicular RC bridges (>=120 CD), not pedestrian
// footbridges — but they are the only bridge references available and
// renaming the enum to `bridge` would orphan existing Firestore project
// documents that persist projectType. The label stays; the semantic
// mismatch is accepted.
// Note: drainage_construction has thin coverage (only SME project #5, a box
// culvert). Non-culvert drainage projects may generalize weakly from a
// single example.
const PROJECT_TYPE_TO_EXAMPLES: Record<string, readonly number[]> = {
  road_concreting:        [1, 8, 14, 18],
  drainage_construction:  [4],
  multi_purpose_building: [0, 3, 7, 10, 13, 15, 19],
  covered_court:          [],
  day_care_center:        [],
  footbridge:             [11, 12],
  slope_protection:       [16, 17],
  waterworks:             [2, 9],
  electrification:        [5, 6],
};

// When a projectType has no direct SME examples, the AI prompt borrows
// examples from this substitute type. Audit-logged only, not surfaced to
// the engineer, because the AI still runs and returns fresh output.
const EXAMPLE_TYPE_FALLBACK: Record<string, string> = {
  covered_court:   "multi_purpose_building",
  day_care_center: "multi_purpose_building",
};

// Cross-boundary twin: LABELS at src/utils/projectType.ts:5 holds the identical
// map on the RN client, used by projectTypeLabel there for UI labeling. Cannot
// import across the RN/functions boundary; keep the two maps in lockstep or
// the "Milestones Confirmed" audit message will label a project type
// differently from what the PE sees in the UI.
const PROJECT_TYPE_LABELS: Record<string, string> = {
  road_concreting: "Road Concreting",
  drainage_construction: "Drainage",
  multi_purpose_building: "Multi-Purpose Building",
  covered_court: "Covered Court",
  day_care_center: "Day Care Center",
  footbridge: "Footbridge",
  slope_protection: "Slope Protection",
  waterworks: "Waterworks",
  electrification: "Electrification",
  unknown: "Unverified",
};

function projectTypeLabel(projectType: unknown): string {
  if (typeof projectType !== "string" || projectType.length === 0) return "Unverified";
  return PROJECT_TYPE_LABELS[projectType] ?? "Unverified";
}

// Anthropic prompt tokens grow linearly with few-shot count. Three examples
// covers scope-shape variance without ballooning the request.
const MAX_FEW_SHOT_EXAMPLES = 3;

function resolveExamplesForType(projectType: string): {
  indices: readonly number[];
  substituted: string | null;
} {
  const direct = PROJECT_TYPE_TO_EXAMPLES[projectType] ?? [];
  if (direct.length > 0) {
    return { indices: direct, substituted: null };
  }
  const substituteType = EXAMPLE_TYPE_FALLBACK[projectType];
  if (substituteType) {
    const borrowed = PROJECT_TYPE_TO_EXAMPLES[substituteType] ?? [];
    return { indices: borrowed, substituted: substituteType };
  }
  return { indices: [], substituted: null };
}

// Calendar-days between officialDateStarted (or legacy startDate) and
// originalDateCompletion (or legacy completionDate). Returns null when
// either date is missing, unparseable, or the window is non-positive.
function computeProjectWindowDays(projectData: Record<string, unknown>): number | null {
  const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "");
  const start = str(projectData.officialDateStarted) || str(projectData.startDate);
  const end = str(projectData.originalDateCompletion) || str(projectData.completionDate);
  if (!start || !end) return null;
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  const days = Math.round((endMs - startMs) / (24 * 60 * 60 * 1000));
  return days > 0 ? days : null;
}

// Pick up to `take` SME project indices whose `total` CD is closest to the
// engineer's project window. When windowDays is null or non-positive,
// returns the first `take` indices in pool order instead of throwing.
function pickClosestByWindow(
  indices: readonly number[],
  windowDays: number | null,
  take: number,
): number[] {
  if (indices.length === 0) return [];
  const capped = Math.min(take, indices.length);
  if (windowDays === null || windowDays <= 0) {
    return indices.slice(0, capped);
  }
  const scored = indices.map((idx) => ({
    idx,
    diff: Math.abs(SME_PROJECTS[idx].total - windowDays),
  }));
  scored.sort((a, b) => a.diff - b.diff || a.idx - b.idx);
  return scored.slice(0, capped).map((s) => s.idx);
}

// Serialize the selected SME projects as a few-shot block for the AI prompt.
// Every name, desc, crew, and days value passes through verbatim.
function formatFewShotExamples(indices: readonly number[]): string {
  if (indices.length === 0) return "";
  const blocks = indices.map((i, k) => {
    const p = SME_PROJECTS[i];
    const phaseLines = p.ms
      .map((m) => `  ${m.no}. ${m.name} (${m.days} CD) — ${m.desc} ${m.crew}`)
      .join("\n");
    return `EXAMPLE ${k + 1} — "${p.name}" (total ${p.total} CD, ${p.ms.length} phases):\n${phaseLines}`;
  });
  return blocks.join("\n\n");
}

// Rescale the AI/SME proportional shape onto the engineer's actual project
// window using largest-remainder rounding so the returned days sum to
// windowDays exactly. Enforces >= 1 CD per milestone.
//
// Special cases:
//   - N === 0: returns [].
//   - windowDays <= 0: caller should have passed null → not scaled. Defensive
//     branch rounds the originals and floors them at 1.
//   - N === 1: single milestone gets the full window.
//   - windowDays < N: min-1 and sum-equals-window are unsatisfiable together.
//     Returns N ones (sum = N, overflows window by N - windowDays). The caller
//     must audit-log the overflow AND surface it to the engineer so they can
//     extend the window or reduce phases during review.
function scaleDurationsToWindow(
  originalDays: number[],
  windowDays: number,
): number[] {
  const n = originalDays.length;
  if (n === 0) return [];
  if (windowDays <= 0) {
    return originalDays.map((d) =>
      Number.isFinite(d) && d > 0 ? Math.max(1, Math.round(d)) : 1,
    );
  }
  if (n === 1) return [windowDays];
  if (windowDays < n) return new Array<number>(n).fill(1);

  const safe = originalDays.map((d) => (Number.isFinite(d) && d > 0 ? d : 1));
  const total = safe.reduce((sum, d) => sum + d, 0);
  if (total <= 0) {
    const base = Math.floor(windowDays / n);
    const remainder = windowDays - base * n;
    const out = new Array<number>(n).fill(base);
    for (let i = 0; i < remainder; i += 1) out[i] += 1;
    return out;
  }

  const raw = safe.map((d) => (d / total) * windowDays);
  const floors = raw.map((r) => Math.floor(r));
  const remainders = raw.map((r, i) => ({ idx: i, rem: r - floors[i] }));

  const leftover = windowDays - floors.reduce((sum, v) => sum + v, 0);
  remainders.sort((a, b) => b.rem - a.rem || a.idx - b.idx);
  for (let k = 0; k < leftover && k < remainders.length; k += 1) {
    floors[remainders[k].idx] += 1;
  }

  // Enforce min=1: steal from the largest allocation if any phase < 1.
  // This preserves sum=windowDays because it's a redistribution.
  for (let guard = 0; guard < n; guard += 1) {
    const belowIdx = floors.findIndex((v) => v < 1);
    if (belowIdx < 0) break;
    let maxIdx = 0;
    for (let i = 1; i < floors.length; i += 1) {
      if (floors[i] > floors[maxIdx]) maxIdx = i;
    }
    if (floors[maxIdx] <= 1) break;
    floors[maxIdx] -= 1;
    floors[belowIdx] += 1;
  }

  return floors;
}

// Duration-proportional weighting with largest-remainder rounding so the sum
// equals exactly 100. Mirrors recomputeWeights() in src/utils/milestonePlan.ts
// so server-issued weights match what the review UI produces after edits.
// Enforces weight >= 1 per phase (confirmMilestonePlan rejects lower values).
function deriveWeightsFromDurations(days: number[]): number[] {
  if (days.length === 0) return [];
  const safeDays = days.map((d) => (Number.isFinite(d) && d > 0 ? d : 1));
  const totalDays = safeDays.reduce((sum, d) => sum + d, 0);

  const raw = safeDays.map((d) => (d / totalDays) * 100);
  const floors = raw.map((r) => Math.floor(r));
  const remainders = raw.map((r, i) => ({ idx: i, rem: r - floors[i] }));

  const leftover = 100 - floors.reduce((sum, v) => sum + v, 0);
  remainders.sort((a, b) => b.rem - a.rem || a.idx - b.idx);
  for (let k = 0; k < leftover && k < remainders.length; k += 1) {
    floors[remainders[k].idx] += 1;
  }

  for (let guard = 0; guard < days.length; guard += 1) {
    const belowIdx = floors.findIndex((v) => v < 1);
    if (belowIdx < 0) break;
    let maxIdx = 0;
    for (let i = 1; i < floors.length; i += 1) {
      if (floors[i] > floors[maxIdx]) maxIdx = i;
    }
    if (floors[maxIdx] <= 1) break;
    floors[maxIdx] -= 1;
    floors[belowIdx] += 1;
  }

  return floors;
}

type AIGeneratedPhase = {
  title: string;
  description: string;
  durationDays: number;
};

// Cap on generated/confirmed plan phase count. Referenced across three sites in
// this file: the submit_milestones tool schema maxItems, the
// confirmMilestonePlan phase-count guard, and the truncateSmeFallback helper
// below. SME corpus entry idx 1 carries 21 phases; without truncation the
// fallback writes drafts confirmMilestonePlan refuses and generateMilestones's
// already-exists guard blocks regeneration.
//
// Cross-boundary twin: MAX_PHASES at src/utils/milestonePlan.ts:3 holds the
// same value on the RN client and cannot import across the functions/RN
// boundary. Keep the two in lockstep. The truncation banner in
// MilestoneGenerationModal.tsx interpolates the client-side MAX_PHASES, so a
// divergence would misreport the cap to the PE.
const MAX_PHASES_PER_PLAN = 12;

// First-N-by-sequence is safe for the only current offender, idx 1 in the SME
// corpus: demob is bundled into phase 1 and there is no closeout phase at the
// tail to preserve. Revisit if a future entry above MAX_PHASES_PER_PLAN has a
// real closeout.
function truncateSmeFallback(source: SmeProject): {
  phases: AIGeneratedPhase[];
  truncated: boolean;
  originalCount: number;
  keptCount: number;
} {
  const originalCount = source.ms.length;
  const truncated = originalCount > MAX_PHASES_PER_PLAN;
  const kept = truncated ? source.ms.slice(0, MAX_PHASES_PER_PLAN) : source.ms;
  const phases: AIGeneratedPhase[] = kept.map((m) => ({
    title: m.name,
    description: m.desc,
    durationDays: m.days,
  }));
  return { phases, truncated, originalCount, keptCount: phases.length };
}

async function generateMilestonesWithAI(
  projectData: Record<string, unknown>,
  projectType: string,
  fewShotIndices: readonly number[],
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
    `Project type: ${projectType}`,
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

  const system =
    "You are a senior LGU (Local Government Unit) infrastructure project planner in the Philippines, advising HCSD field engineers. Generate a realistic, project-specific milestone breakdown that an engineer can monitor with photo proofs. Use DPWH/HCSD-style phase terminology. Durations are CALENDAR DAYS proportional to project scope — the server rescales your values onto the engineer's actual start-to-end window, so treat your numbers as a proportional shape rather than absolute dates. Tailor descriptions to the actual project scope, contract amount, and timeline rather than restating generic templates verbatim.";

  const fewShotBlock = formatFewShotExamples(fewShotIndices);
  const referenceSection = fewShotBlock.length > 0
    ? `\n\nREFERENCE EXAMPLES (SME-validated DEPW projects — preserve the phase vocabulary and level of detail, adapt scope and durations to this specific project):\n${fewShotBlock}`
    : "";

  const userPrompt = `Generate milestones for this LGU infrastructure project. Each description must state measurable completion criteria a field engineer can verify with photos.

PROJECT CONTEXT:
${projectContext}${referenceSection}

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
              maxItems: MAX_PHASES_PER_PLAN,
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
  if (!SUPPORTED_PROJECT_TYPES.has(rawType)) {
    throw new HttpsError(
      "failed-precondition",
      "Project has not been verified as a city-funded barangay-level infrastructure project.",
    );
  }

  // Web's intake flow rejects classifications below 0.8 at project creation
  // (2026-05-26 update). Legacy docs created under the old 0.6 floor must be
  // blocked here so we never feed an unreliable classification into the AI.
  const confidence =
    typeof projectData.classificationConfidence === "number"
      ? projectData.classificationConfidence
      : null;
  if (confidence === null || confidence < 0.8) {
    throw new HttpsError(
      "failed-precondition",
      "This project's classification is incomplete. Please contact the Head of Construction Services to re-verify the project name before generating milestones.",
    );
  }

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

  const windowDays = computeProjectWindowDays(projectData);
  const { indices: poolIndices, substituted } = resolveExamplesForType(rawType);
  const fewShotIndices = pickClosestByWindow(
    poolIndices,
    windowDays,
    MAX_FEW_SHOT_EXAMPLES,
  );

  let phases: AIGeneratedPhase[];
  let generatedBy: "ai" | "sme_reference" = "ai";
  let usedFallback = false;
  let fallbackReason: string | undefined;
  let fallbackSourceProject: string | undefined;
  let fallbackTruncated: boolean | undefined;
  let fallbackOriginalCount: number | undefined;
  let fallbackKeptCount: number | undefined;
  let fallbackKind: "transient" | undefined;

  try {
    phases = await generateMilestonesWithAI(projectData, rawType, fewShotIndices);
  } catch (e: unknown) {
    // Validation failures (bad AI output) surface to the client as
    // `milestone-validation-failed`. Only transient/API errors fall through
    // to the SME reference fallback below.
    if (e instanceof HttpsError) throw e;
    const reason = e instanceof Error ? e.message : String(e);
    console.warn(
      `[generateMilestones] AI generation failed for project ${projectId}, falling back to SME reference:`,
      reason,
    );

    // Config errors must not silently substitute an SME plan. Classify BEFORE
    // any fallback state is assigned so fallbackKind cannot be set to
    // "transient" on this path. Distinct sentinel `milestone-generator-misconfigured`
    // lets the client route to non-retryable copy that tells the PE to report
    // the outage rather than retry.
    if (reason.includes("ANTHROPIC_API_KEY")) {
      await logAuditTrail(
        request.auth.uid,
        request.auth.token.email || "",
        "Milestone Generator Misconfigured",
        `Project ${projectId} (type: ${rawType}) · reason: ${reason.slice(0, 120)}`,
        true,
        projectId,
        undefined,
        typeof projectData.tenantId === "string" ? projectData.tenantId : undefined,
      );
      throw new HttpsError(
        "failed-precondition",
        "milestone-generator-misconfigured: The AI milestone generator is not configured on the server.",
      );
    }

    if (poolIndices.length === 0) {
      // Every SUPPORTED_PROJECT_TYPES value should resolve to a non-empty
      // pool through PROJECT_TYPE_TO_EXAMPLES or EXAMPLE_TYPE_FALLBACK. If
      // it doesn't, refuse rather than write an empty milestone set.
      throw new HttpsError(
        "internal",
        `milestone-validation-failed: no SME reference available for projectType "${rawType}"`,
      );
    }

    const fallbackIndex = pickClosestByWindow(poolIndices, windowDays, 1)[0];
    const source = SME_PROJECTS[fallbackIndex];
    const truncation = truncateSmeFallback(source);
    phases = truncation.phases;
    generatedBy = "sme_reference";
    usedFallback = true;
    fallbackReason = reason.slice(0, 120);
    fallbackSourceProject = source.name;
    fallbackTruncated = truncation.truncated;
    fallbackOriginalCount = truncation.originalCount;
    fallbackKeptCount = truncation.keptCount;
    fallbackKind = "transient";
  }

  const originalDays = phases.map((p) => p.durationDays);
  const scaledDays = windowDays !== null
    ? scaleDurationsToWindow(originalDays, windowDays)
    : originalDays;
  const scheduledDays = scaledDays.reduce((sum, d) => sum + d, 0);
  const overflowDays =
    windowDays !== null && scheduledDays > windowDays
      ? scheduledDays - windowDays
      : 0;

  const batch = admin.firestore().batch();
  const weights = deriveWeightsFromDurations(scaledDays);

  phases.forEach((phase, i) => {
    const docRef = msCollection.doc();
    batch.set(docRef, {
      title: phase.title,
      description: phase.description,
      weightPercentage: weights[i],
      suggestedDurationDays: scaledDays[i],
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
  const typeSuffix = substituted
    ? `type: ${rawType} → few-shot borrowed from ${substituted}`
    : `type: ${rawType}`;
  const sourceSuffix = usedFallback
    ? ` · SME fallback (source: "${fallbackSourceProject}", ${fallbackKeptCount} of ${fallbackOriginalCount} phases${fallbackTruncated ? `, truncated to fit ${MAX_PHASES_PER_PLAN}-phase limit` : ""}) · reason: ${fallbackReason}`
    : ` · AI-generated (${phases.length} phases)`;
  const scheduleSuffix =
    windowDays === null
      ? " · window unknown (no scaling)"
      : overflowDays > 0
        ? ` · scaled to ${windowDays}cd window (short-window: ${phases.length} phases, overflow +${overflowDays}cd)`
        : ` · scaled to ${windowDays}cd window`;
  await logAuditTrail(
    uid, email,
    "Milestones Drafted",
    `Project: ${projectId} (${typeSuffix})${sourceSuffix}${scheduleSuffix}`,
    true,
    projectId,
    undefined,
    typeof projectData.tenantId === "string" ? projectData.tenantId : undefined,
  );

  return {
    success: true,
    count: phases.length,
    projectType: rawType,
    generatedBy,
    usedFallback,
    fallbackReason,
    fallbackSourceProject,
    fallbackTruncated,
    fallbackOriginalCount,
    fallbackKeptCount,
    fallbackKind,
    windowDays,
    scheduledDays,
    overflowDays,
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


export const addManualMilestone = onCall(
  { region: "asia-southeast1", secrets: [anthropicKey] },
  async (request) => {
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
      suggestedDurationDays < 1 || suggestedDurationDays > 999) {
    throw new HttpsError("invalid-argument", "suggestedDurationDays must be a number between 1 and 999.");
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

  // Title guardrail: structural pre-check always binds; semantic model verdict
  // binds when reachable; Anthropic transport/API errors fail OPEN with a
  // console.warn so an outage never blocks a manual add.
  const trimmedTitle = title.trim();
  const structural = checkTitleStructureServer(trimmedTitle);
  if (!structural.ok) {
    throw new HttpsError("failed-precondition", `Title: ${structural.reason}`);
  }
  try {
    const apiKey = anthropicKey.value();
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY secret not configured");
    const projectNameForCheck =
      (typeof projectData.projectName === "string" && projectData.projectName.trim()) ||
      (typeof projectData.title === "string" && projectData.title.trim()) ||
      "";
    const projectTypeForCheck =
      typeof projectData.projectType === "string" ? projectData.projectType : "";
    const client = new Anthropic({ apiKey });
    const verdict = await validateTitleWithAI(client, {
      projectName: projectNameForCheck,
      projectType: projectTypeForCheck,
      title: trimmedTitle,
    });
    const passes =
      verdict.valid === true && verdict.confidence >= TITLE_CONFIDENCE_THRESHOLD;
    if (!passes) {
      throw new HttpsError(
        "failed-precondition",
        `Title: ${verdict.reason || "This doesn't look like a construction phase for this project."}`,
      );
    }
  } catch (err: unknown) {
    if (err instanceof HttpsError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      "[addManualMilestone] semantic title check skipped due to Anthropic error",
      { projectId, title: trimmedTitle, err: message },
    );
    // Fall through — structural check already passed.
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
  { region: "asia-southeast1", secrets: [anthropicKey] },
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
    if (phases.length > MAX_PHASES_PER_PLAN) {
      throw new HttpsError("invalid-argument", `Cannot confirm more than ${MAX_PHASES_PER_PLAN} phases.`);
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
        p.suggestedDurationDays > 999
      ) {
        throw new HttpsError(
          "invalid-argument",
          "suggestedDurationDays must be 1..999.",
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

    // Title guardrail: validate only phases with new or edited titles.
    // Unchanged AI-generated titles are trusted and skipped so a plan of
    // only unchanged titles adds zero AI calls to the confirm path.
    const projectNameForCheck =
      (typeof projectData.projectName === "string" && projectData.projectName.trim()) ||
      (typeof projectData.title === "string" && projectData.title.trim()) ||
      "";
    const projectTypeForCheck =
      typeof projectData.projectType === "string" ? projectData.projectType : "";

    type TitleCandidate = { sequence: number; title: string };
    const titlesToValidate: TitleCandidate[] = [];
    for (const p of survivors) {
      const submittedTitle = (p.title ?? "").trim();
      const isNewLikeId = !p.id || !existingById.has(p.id);
      const stored = p.id ? existingById.get(p.id) : undefined;
      const storedTitle =
        stored && typeof stored.data()?.title === "string"
          ? (stored.data()!.title as string).trim()
          : "";
      const changed =
        p.isNew === true || isNewLikeId || storedTitle !== submittedTitle;
      if (changed) {
        titlesToValidate.push({
          sequence: p.sequence as number,
          title: submittedTitle,
        });
      }
    }

    if (titlesToValidate.length > 0) {
      // Structural pre-checks always bind.
      const structuralFailures: { sequence: number; reason: string }[] = [];
      for (const c of titlesToValidate) {
        const s = checkTitleStructureServer(c.title);
        if (!s.ok) {
          structuralFailures.push({ sequence: c.sequence, reason: s.reason });
        }
      }
      if (structuralFailures.length > 0) {
        const nums = structuralFailures.map((f) => f.sequence).join(", ");
        throw new HttpsError(
          "failed-precondition",
          `Phase ${nums}: ${structuralFailures[0].reason}`,
        );
      }

      // Semantic batch check. Anthropic transport/API errors fail OPEN with a
      // logger.warn — a model outage must never wedge a confirm whose titles
      // already passed structural checks. Model verdicts always bind.
      try {
        const apiKey = anthropicKey.value();
        if (!apiKey) throw new Error("ANTHROPIC_API_KEY secret not configured");
        const client = new Anthropic({ apiKey });
        const verdicts = await validateTitlesWithAI(client, {
          projectName: projectNameForCheck,
          projectType: projectTypeForCheck,
          titles: titlesToValidate.map((c) => c.title),
        });

        // If the model returned fewer verdicts than inputs, we cannot safely
        // resolve which titles it judged. Fail closed — this is a partial
        // refusal, not an outage.
        if (verdicts.length !== titlesToValidate.length) {
          const missing = titlesToValidate
            .filter((c) => !verdicts.some((v) => v.title === c.title))
            .map((c) => c.sequence)
            .join(", ");
          throw new HttpsError(
            "failed-precondition",
            `Phase ${missing || "?"}: AI did not return a verdict for this title.`,
          );
        }

        const semanticFailures: { sequence: number; reason: string }[] = [];
        for (let i = 0; i < titlesToValidate.length; i += 1) {
          const c = titlesToValidate[i];
          const v = verdicts[i];
          const passes =
            v.valid === true && v.confidence >= TITLE_CONFIDENCE_THRESHOLD;
          if (!passes) {
            semanticFailures.push({
              sequence: c.sequence,
              reason:
                v.reason ||
                "This doesn't look like a construction phase for this project.",
            });
          }
        }
        if (semanticFailures.length > 0) {
          const nums = semanticFailures.map((f) => f.sequence).join(", ");
          throw new HttpsError(
            "failed-precondition",
            `Phase ${nums}: ${semanticFailures[0].reason}`,
          );
        }
      } catch (err: unknown) {
        // HttpsError is a real precondition failure — surface it.
        if (err instanceof HttpsError) throw err;
        const message = err instanceof Error ? err.message : String(err);
        console.warn(
          "[confirmMilestonePlan] semantic title check skipped due to Anthropic error",
          {
            projectId,
            titles: titlesToValidate.map((c) => c.title),
            err: message,
          },
        );
        // Fall through — structural checks already passed.
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
    const projectName =
      (typeof projectData.projectName === "string" && projectData.projectName) ||
      (typeof projectData.title === "string" && projectData.title) ||
      "project";
    await logAuditTrail(
      uid,
      email,
      "Milestones Confirmed",
      `${survivors.length} phase${survivors.length !== 1 ? "s" : ""} confirmed for ${projectName} (type: ${projectTypeLabel(projectData.projectType)})`,
      true,
      projectId,
      undefined,
      tenantId,
    );

    return { success: true, count: survivors.length };
  },
);


export const validateMilestoneTitle = onCall(
  { region: "asia-southeast1", secrets: [anthropicKey] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { projectId, title } = (request.data ?? {}) as {
      projectId?: string;
      title?: string;
    };
    if (!projectId || typeof projectId !== "string") {
      throw new HttpsError("invalid-argument", "projectId is required.");
    }
    if (!title || typeof title !== "string") {
      throw new HttpsError("invalid-argument", "title is required.");
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
        "Only the assigned engineer can validate milestone titles.",
      );
    }

    const projectNameForCheck =
      (typeof projectData.projectName === "string" && projectData.projectName.trim()) ||
      (typeof projectData.title === "string" && projectData.title.trim()) ||
      "";
    const projectTypeForCheck =
      typeof projectData.projectType === "string" ? projectData.projectType : "";

    // Layer A (structural). No model call on failure.
    const structural = checkTitleStructureServer(title);
    if (!structural.ok) {
      return { valid: false, confidence: 1, reason: structural.reason };
    }

    // Layer B (semantic). Anthropic transport/API errors fail OPEN so the
    // client (which already treats an unreachable callable as "allow the add")
    // is never wedged by an outage.
    try {
      const apiKey = anthropicKey.value();
      if (!apiKey) throw new Error("ANTHROPIC_API_KEY secret not configured");
      const client = new Anthropic({ apiKey });
      const verdict = await validateTitleWithAI(client, {
        projectName: projectNameForCheck,
        projectType: projectTypeForCheck,
        title: title.trim(),
      });
      const valid =
        verdict.valid === true && verdict.confidence >= TITLE_CONFIDENCE_THRESHOLD;
      return {
        valid,
        confidence: verdict.confidence,
        reason: valid
          ? "Looks like a plausible phase."
          : verdict.reason ||
            "This doesn't look like a construction phase for this project.",
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        "[validateMilestoneTitle] semantic title check skipped due to Anthropic error",
        { projectId, title, err: message },
      );
      return {
        valid: true,
        confidence: 0,
        reason: "Semantic check skipped (temporary AI outage).",
      };
    }
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
