import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";
// sharp and piexifjs are imported via `require` to avoid needing
// `esModuleInterop` in tsconfig just for these two deps.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp: typeof import("sharp") = require("sharp");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const piexif = require("piexifjs");

admin.initializeApp();

// ─── Secrets ──────────────────────────────────────────────────────────────────
const gmailUser = defineSecret("GMAIL_USER");
const gmailPass = defineSecret("GMAIL_PASS");

// ─── Constants ────────────────────────────────────────────────────────────────
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const SEND_COOLDOWN_MS = 60 * 1000;    // 60 seconds between send requests
const MAX_VERIFY_ATTEMPTS = 5;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString();
}

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function createTransporter(user: string, pass: string) {
  return nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
}

/**
 * Reverse-geocode lat/lng → human-readable Philippine address via OpenStreetMap
 * Nominatim. Free, no API key, but their usage policy requires a real
 * User-Agent identifying the app. Returns null on any failure (timeout, rate
 * limit, no result) so callers can fall back to coordinates string.
 *
 * Builds a barangay-first label since that's what HCSD uses internally:
 *   "Brgy. San Roque, Mati City, Davao Oriental"
 *
 * Hard 3s timeout — geocoding is best-effort metadata, not allowed to block
 * a proof upload.
 */
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

    // Nominatim's PH responses typically populate: village/suburb/neighbourhood
    // (≈ barangay), city/town/municipality, state (province). Pick the most
    // specific available, prefix barangays with "Brgy." for HCSD readability.
    const barangay =
      a.village || a.suburb || a.neighbourhood || a.hamlet || a.quarter;
    const city = a.city || a.town || a.municipality || a.county;
    const province = a.state || a.region;

    const parts: string[] = [];
    if (barangay) parts.push(`Brgy. ${barangay}`);
    if (city)     parts.push(city);
    if (province) parts.push(province);

    if (parts.length > 0) return parts.join(", ");
    // Last-ditch fallback to whatever Nominatim summarized.
    return data.display_name?.split(",").slice(0, 3).join(",").trim() || null;
  } catch {
    return null;
  }
}

/**
 * Injects GPS + capture-time tags into a JPEG buffer so the photo itself is
 * self-proving. We write our authoritative server-side coords (from the
 * client's geolocation service, not the device camera's EXIF — which many
 * Android camera apps don't populate) directly into the EXIF IFDs before
 * the file lands in Storage.
 *
 * Returns the original buffer unchanged if injection fails (non-JPEG,
 * malformed EXIF, etc.) so a bad EXIF library call never blocks an upload.
 */
function embedExifGps(
  buffer: Buffer,
  latitude: number,
  longitude: number,
  capturedAtMs: number,
  accuracyMeters?: number,
): Buffer {
  try {
    // piexifjs operates on base64-prefixed data URLs.
    const dataUrl = `data:image/jpeg;base64,${buffer.toString("base64")}`;

    // Load any existing EXIF — keep 0th / Exif IFD fields the camera wrote.
    let exifObj: Record<string, Record<number, unknown>>;
    try {
      exifObj = piexif.load(dataUrl);
    } catch {
      exifObj = { "0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": null as any };
    }

    const capturedAt = new Date(capturedAtMs);
    // EXIF date format: "YYYY:MM:DD HH:MM:SS" (space-separated, colon-delimited).
    const pad = (n: number) => n.toString().padStart(2, "0");
    const dateTimeStr =
      `${capturedAt.getUTCFullYear()}:${pad(capturedAt.getUTCMonth() + 1)}:${pad(capturedAt.getUTCDate())}` +
      ` ${pad(capturedAt.getUTCHours())}:${pad(capturedAt.getUTCMinutes())}:${pad(capturedAt.getUTCSeconds())}`;
    const gpsDateStr =
      `${capturedAt.getUTCFullYear()}:${pad(capturedAt.getUTCMonth() + 1)}:${pad(capturedAt.getUTCDate())}`;

    // 0th IFD — general image metadata
    exifObj["0th"][piexif.ImageIFD.DateTime] = dateTimeStr;
    exifObj["0th"][piexif.ImageIFD.Software] = "TranspiraFund Mobile";

    // Exif IFD — capture-time metadata
    exifObj["Exif"][piexif.ExifIFD.DateTimeOriginal] = dateTimeStr;
    exifObj["Exif"][piexif.ExifIFD.DateTimeDigitized] = dateTimeStr;

    // GPS IFD — coordinates + timestamp
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
    // GPS accuracy is stored as horizontal positioning error in meters.
    if (typeof accuracyMeters === "number" && accuracyMeters > 0) {
      // GPSHPositioningError is a RATIONAL — [numerator, denominator].
      // Round to 2 decimals to keep the numerator sane.
      gps[piexif.GPSIFD.GPSHPositioningError] = [Math.round(accuracyMeters * 100), 100];
    }
    exifObj.GPS = gps;

    const exifBytes = piexif.dump(exifObj);
    const newDataUrl: string = piexif.insert(exifBytes, dataUrl);
    // piexif.insert returns "data:image/jpeg;base64,<...>" — strip prefix.
    const commaIdx = newDataUrl.indexOf(",");
    const newBase64 = commaIdx === -1 ? newDataUrl : newDataUrl.slice(commaIdx + 1);
    return Buffer.from(newBase64, "base64");
  } catch {
    // Never fail the upload over EXIF. Firestore `gps` / `capturedAt` still
    // carry the data; the photo just won't self-prove in this one case.
    return buffer;
  }
}

// XML-escape text for safe inclusion inside an SVG <text> node.
function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Format a ms-epoch into local Philippine time (Asia/Manila).
// Example: "Apr 21, 2026, 5:53 PM". Matches the format the web team asked for.
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
  // "Engr." courtesy prefix only when we have a real human name — if we fell
  // back to an email, don't prepend it.
  return fullFromParts || (profile.name ?? "").trim()
    ? `Engr. ${display}`
    : display;
}

// Maps the raw role code stored on `users/{uid}` to the human-readable label
// shown beneath the engineer name on the burnt-in banner. Falls back to the
// raw code so unknown future roles still render something meaningful.
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

  // Full-image SVG so `composite({ gravity: "south" })` aligns the banner to
  // the bottom edge without us computing absolute y-offsets.
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
  try {
    // Apply EXIF orientation to pixels so the banner lands on the visual
    // bottom regardless of how the camera encoded the file. sharp's rotate()
    // with no args reads the orientation tag and bakes the rotation in.
    const base = sharp(buffer).rotate();
    const meta = await base.metadata();
    const width = meta.width ?? 0;
    const height = meta.height ?? 0;
    if (!width || !height) return buffer;

    const svg = buildBannerSvg(width, height, lines);
    return await base
      .composite([{ input: svg, gravity: "south" }])
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } catch {
    // Never fail the upload over a cosmetic post-process. Same philosophy as
    // embedExifGps — Firestore + EXIF still carry the evidence.
    return buffer;
  }
}

/**
 * Logs an audit event.
 * Always writes to `auditTrails/mobile/entries` (PROJ_ENG scope).
 * Only writes to `auditTrails/hcsd/entries` when syncToHCSD is true
 * (security events + field activity that HCSD needs to see).
 */
async function logAuditTrail(
  uid: string,
  email: string,
  action: string,
  // Human-readable message. Surfaced in mobile's Audit Trail screen and as
  // details.message on the audit doc so the web notification body can render
  // it inline.
  message: string,
  syncToHCSD = false,
  // Project id for project-scoped events. Required by the web app's HCSD
  // fan-out trigger on the four canonical mobile actions (Proof Uploaded,
  // Milestones Drafted, Milestones Confirmed, Milestone Completed). Events
  // without it are dropped with "Skipping — no projectId on <action>".
  targetId?: string,
  // Milestone id. Required by the fan-out trigger on milestone-scoped actions
  // (Proof Uploaded, Milestone Completed). Omitted for batch actions like
  // Milestones Drafted / Confirmed.
  milestoneId?: string,
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

  // Always write to mobile audit trail (PROJ_ENG scope)
  const writes: Promise<unknown>[] = [
    admin.firestore()
      .collection("auditTrails").doc("mobile").collection("entries")
      .add(entry),
  ];

  // Sync to HCSD audit trail for security-relevant events (password change, proof uploads)
  if (syncToHCSD) {
    writes.push(
      admin.firestore()
        .collection("auditTrails").doc("hcsd").collection("entries")
        .add(entry),
    );
  }

  await Promise.all(writes);
}

// ─── generateMilestones ───────────────────────────────────────────────────────
//
//  Called by PROJ_ENG from the mobile app when a project has no milestones.
//  Creates draft milestones as a subcollection under projects/{projectId}/milestones
//  — uses Admin SDK to bypass client rules. Drafts are written with
//  `confirmed: false` so the mobile review flow gates them: the engineer must
//  review, optionally edit/delete each one, then batch-confirm before they
//  appear in the project details proper.
//
//  Templates are keyed by the project's `projectType` field (set by the web
//  app on project creation). Unknown or missing types fall back to "Other"
//  and the audit trail records the fallback for traceability.
//
const MILESTONE_TEMPLATES: Record<string, string[]> = {
  "Building Construction": [
    "Site Preparation & Mobilization",
    "Excavation & Foundation Works",
    "Structural Framing",
    "Masonry & Wall Works",
    "Roofing Works",
    "Plumbing Rough-In",
    "Electrical Rough-In",
    "Finishing Works",
    "Final Inspection & Turnover",
  ],
  "Roads & Pavement": [
    "Site Clearing & Survey",
    "Subgrade Preparation",
    "Base Course Installation",
    "Drainage Provisions",
    "Concreting & Paving Works",
    "Curing Period",
    "Line Striping & Signage",
    "Final Inspection & Acceptance",
  ],
  "Drainage & Flood Control": [
    "Site Survey & Staking",
    "Excavation",
    "Lean Concrete Works",
    "Pipe & Culvert Laying",
    "Manhole & Catch Basin Construction",
    "Backfill & Compaction",
    "Surface Restoration",
    "Hydraulic Testing",
    "Final Inspection & Acceptance",
  ],
  "Water Supply": [
    "Site Survey & Staking",
    "Trenching & Excavation",
    "Mainline Pipe Laying",
    "Valve & Fitting Installation",
    "Service Connections",
    "Pressure Testing",
    "Disinfection & Flushing",
    "Backfill & Surface Restoration",
    "Final Inspection & Acceptance",
  ],
  "Electrical & Lighting": [
    "Site Survey & Fixture Layout",
    "Post & Pole Installation",
    "Conduit & Wiring Installation",
    "Fixture Mounting",
    "Panel Board & Meter Installation",
    "Grounding Works",
    "Circuit Testing & Commissioning",
    "Final Inspection & Energization",
  ],
  "Public Facility Rehabilitation": [
    "Condition Assessment & Documentation",
    "Demolition of Defective Elements",
    "Structural Repairs",
    "Plumbing & Electrical Repairs",
    "Masonry & Finishing Repairs",
    "Painting Works",
    "Fixture Replacement",
    "Final Inspection & Turnover",
  ],
  "Other": [
    "Project Mobilization",
    "Site Preparation",
    "Implementation Phase 1",
    "Implementation Phase 2",
    "Implementation Phase 3",
    "Final Inspection",
    "Project Turnover",
  ],
};

export const generateMilestones = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { projectId } = (request.data ?? {}) as { projectId?: string };
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required.");
  }

  // Verify project exists + caller is the assigned engineer
  const projectRef = admin.firestore().doc(`projects/${projectId}`);
  const projectSnap = await projectRef.get();
  if (!projectSnap.exists) {
    throw new HttpsError("not-found", "Project not found.");
  }
  const projectData = projectSnap.data() ?? {};
  if (projectData.projectEngineer && projectData.projectEngineer !== request.auth.uid) {
    throw new HttpsError("permission-denied", "Only the assigned engineer can generate milestones.");
  }

  // Resolve the project type. Unknown or missing values fall back to "Other"
  // so legacy projects still generate something usable. The audit note below
  // records the fallback for traceability.
  const KNOWN_TYPES = new Set(Object.keys(MILESTONE_TEMPLATES));
  const rawType = typeof projectData.projectType === "string" ? projectData.projectType : "";
  const resolvedType = KNOWN_TYPES.has(rawType) ? rawType : "Other";
  const template = MILESTONE_TEMPLATES[resolvedType];
  const fellBack = rawType !== resolvedType;

  // Idempotency — prevent duplicates. Includes drafts (confirmed: false)
  // so the engineer can't accidentally re-generate over an in-progress review.
  const existingSnap = await admin.firestore()
    .collection(`projects/${projectId}/milestones`)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    throw new HttpsError("already-exists", "Milestones already exist for this project.");
  }

  const batch = admin.firestore().batch();
  const msCollection = admin.firestore().collection(`projects/${projectId}/milestones`);

  template.forEach((title, i) => {
    const docRef = msCollection.doc();
    batch.set(docRef, {
      title,
      sequence: i + 1,
      status: "Pending",
      proofs: [],
      confirmed: false,        // drafts — engineer must review to commit
      generatedBy: "template", // provenance marker, not an LLM author
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  await batch.commit();

  const uid   = request.auth.uid;
  const email = request.auth.token.email || "";
  const suffix = fellBack ? ` (fallback: unknown type "${rawType}")` : "";
  await logAuditTrail(
    uid, email,
    "Milestones Drafted",
    `Project: ${projectId} (type: ${resolvedType})${suffix}`,
    true,
    projectId,
  );

  return {
    success: true,
    count: template.length,
    projectType: resolvedType,
  };
});

// ─── deleteMilestone ──────────────────────────────────────────────────────────
//
//  Called by PROJ_ENG during the milestone review flow to discard a draft
//  that doesn't apply to this project. Firestore rules block client-side
//  delete on milestones, so this function performs the delete via Admin SDK.
//
//  Safety: only DRAFT milestones (confirmed === false) may be deleted —
//  once the engineer has confirmed the milestone set, the workflow is
//  immutable from the mobile side.
//
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
  );

  return { success: true };
});

// ─── markProjectOngoing ──────────────────────────────────────────────────────
//
//  Called automatically by the mobile app when a project assigned to this
//  PROJ_ENG still carries a pre-active status ("Draft" or "For Mayor").
//  Updates the project status to "In Progress" via Admin SDK, bypassing
//  the Firestore rule that blocks PROJ_ENG from writing to project docs.
//
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

  const projectData = projectSnap.data() as { status?: string };
  const currentStatus = (projectData?.status ?? "").toLowerCase();

  // Only update if still in a pre-active workflow state
  const preActive = ["draft", "for mayor"];
  if (!preActive.includes(currentStatus)) {
    return { success: true, skipped: true }; // Already ongoing — nothing to do
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
    true, // sync to HCSD audit trail
  );

  return { success: true };
});

// ─── completePasswordChange ──────────────────────────────────────────────────
//
//  Called by mobile app after user successfully changes their password
//  via Firebase Auth (updatePassword). Sets mustChangePassword = false
//  using Admin SDK (bypasses Firestore security rules).
//
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

  // PASSWORD_CHANGE → syncs to DEPW (security event)
  const email = request.auth.token.email || "";
  await logAuditTrail(uid, email, "Password Set", "First-time login", true);

  return { success: true };
});

// ─── logMobileAuditTrail ──────────────────────────────────────────────────────────
//
//  General-purpose audit logger for the mobile app.
//  Caller specifies syncToDEPW to control whether the event
//  also appears in depwAuditTrails (visible to DEPW HEAD on web app).
//
export const logMobileAuditTrail = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { action, details, syncToDEPW, syncToHCSD, targetId, milestoneId } = request.data as {
    action?: string;
    details?: string;
    syncToDEPW?: boolean;  // accepted for backward compat from older app versions
    syncToHCSD?: boolean;
    targetId?: string;     // project id for project-scoped events (HCSD fan-out trigger)
    milestoneId?: string;  // milestone id for milestone-scoped events
  };

  if (!action || !details) {
    throw new HttpsError("invalid-argument", "action and details are required.");
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email || "";

  await logAuditTrail(
    uid, email, action, details,
    syncToHCSD === true || syncToDEPW === true,
    typeof targetId === "string" ? targetId : undefined,
    typeof milestoneId === "string" ? milestoneId : undefined,
  );

  return { success: true };
});

// ─── uploadProfilePhoto ──────────────────────────────────────────────────────
//
//  Mobile-only. React Native's `fetch(file://...)` fails on Android so the
//  client cannot produce a Blob to hand to Firebase Storage's JS SDK. This
//  function accepts base64, uploads to Storage via Admin SDK, and writes the
//  same users/{uid}.photoURL field the web's updateProfilePhoto callable writes
//  — so the web's realtime UI picks up the change identically to a web upload.
//
//  Payload:
//    { base64: string, contentType?: string } — uploads a new photo
//    { base64: "" }                           — removes the existing photo
//
//  Storage path matches the web contract: profile-photos/{uid} exactly. The
//  download URL uses the same ?alt=media&token=... format getDownloadURL()
//  produces, so <Image source={{ uri: photoURL }}> works identically.
//
export const uploadProfilePhoto = onCall(
  { region: "asia-southeast1", memory: "512MiB" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const { base64, contentType } = (request.data ?? {}) as {
      base64?: string;
      contentType?: string;
    };

    const uid = request.auth.uid;
    const email = request.auth.token.email || "";
    const bucket = admin.storage().bucket();
    const file = bucket.file(`profile-photos/${uid}`);

    // Removal path
    if (!base64) {
      try { await file.delete(); } catch { /* may not exist */ }

      await admin.firestore().doc(`users/${uid}`).update({
        photoURL: admin.firestore.FieldValue.delete(),
        photoChangedAt: Date.now(),
      });
      try { await admin.auth().updateUser(uid, { photoURL: null as never }); } catch { /* ok */ }
      await logAuditTrail(uid, email, "Profile Photo Removed", "Profile photo removed", false);

      return { success: true, photoURL: "" };
    }

    // Upload path
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
    try { await admin.auth().updateUser(uid, { photoURL }); } catch { /* ok */ }
    await logAuditTrail(uid, email, "Profile Photo Updated", "Profile photo updated", false);

    return { success: true, photoURL };
  },
);

// ─── uploadProofPhoto ────────────────────────────────────────────────────────
//
//  Mobile-only. Same constraint as uploadProfilePhoto — the Firebase JS SDK's
//  Storage uploadBytes / uploadString both end up trying to construct a Blob
//  from a Uint8Array, which RN's Blob polyfill rejects:
//    "Creating blobs from 'ArrayBuilder' and 'ArrayBufferView' are not supported"
//  So the client posts base64 here, we upload via Admin SDK, and we
//  atomically append the proof object to the milestone subcollection doc.
//
//  Atomicity matters: doing storage-then-firestore on the client risks
//  orphaned uploads if the client crashes between calls. Server-side, an
//  exception in the firestore step still leaves a stranded file in Storage,
//  but that's recoverable by the storagePath we save and is far less common
//  than a client-side network drop mid-flow.
//
//  Authorization mirrors the Storage rule deployed by the web team:
//  `request.auth.uid == projects/{projectId}.projectEngineer`.
//
export const uploadProofPhoto = onCall(
  // invoker:"public" forces Firebase to (re-)attach the allUsers→roles/run.invoker
  // IAM binding on deploy. The first deploy of this function landed without it
  // (intermittent Firebase/Cloud Run quirk for new 2nd-gen functions), which
  // surfaced as 401 "request was not authorized to invoke this service."
  // 1GiB + 120s: sharp decodes a 10MB JPEG into a ~50MB raw pixel buffer, then
  // composites the SVG banner and re-encodes via mozjpeg. Peak heap easily
  // exceeds 512MiB on cold starts and surfaces as a 500 to the client. Cold
  // start + sharp init + encode on large images can also push past the 60s
  // onCall default.
  { region: "asia-southeast1", memory: "1GiB", timeoutSeconds: 120, invoker: "public" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

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

    const uid   = request.auth.uid;
    const email = request.auth.token.email || "";

    // Engineer authorization — same field everyone else checks.
    const projectRef  = admin.firestore().doc(`projects/${projectId}`);
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new HttpsError("not-found", "Project not found.");
    }
    const projectData = projectSnap.data() ?? {};
    if (projectData.projectEngineer && projectData.projectEngineer !== uid) {
      throw new HttpsError("permission-denied", "Only the assigned engineer can upload proofs for this project.");
    }

    // Milestone must exist and be confirmed (drafts can't accept proofs).
    const milestoneRef  = admin.firestore().doc(`projects/${projectId}/milestones/${milestoneId}`);
    const milestoneSnap = await milestoneRef.get();
    if (!milestoneSnap.exists) {
      throw new HttpsError("not-found", "Milestone not found.");
    }
    const m = milestoneSnap.data() ?? {};
    if (m.confirmed === false) {
      throw new HttpsError("failed-precondition", "This phase is still a draft. Confirm it before uploading proof.");
    }

    // Hard cap: max 5 proofs per milestone. Marking the phase Completed is
    // allowed at any count >= 1 — the cap only blocks the 6th upload to keep
    // Storage bounded and HCSD review tractable.
    const existingProofs = Array.isArray(m.proofs) ? m.proofs : [];
    if (existingProofs.length >= 5) {
      throw new HttpsError("failed-precondition", "This phase already has the maximum of 5 proofs.");
    }

    // Decode + size cap (matches the deployed Storage rule and client copy).
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0) {
      throw new HttpsError("invalid-argument", "Empty image data.");
    }
    if (buffer.length > 10 * 1024 * 1024) {
      throw new HttpsError("invalid-argument", "Photo exceeds 10MB limit.");
    }

    // Sanitize path segments — paranoia, projectIds are auto-generated but
    // milestoneIds in older docs sometimes carry user-typed values.
    const safeProjectId   = projectId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
    const safeMilestoneId = milestoneId.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
    const ts = typeof capturedAt === "number" ? capturedAt : Date.now();

    const storagePath = `projects/${safeProjectId}/milestones/${safeMilestoneId}/proofs/${ts}.jpg`;
    const bucket = admin.storage().bucket();
    const file   = bucket.file(storagePath);
    const token  = crypto.randomUUID();

    // Best-effort reverse geocode for HCSD oversight + the burn-in banner.
    // If Nominatim is slow or down we still ship the proof — `location`
    // falls back to a coord string (which is what older proofs already
    // store) and the banner drops its place-name line.
    const placeName = await reverseGeocode(latitude, longitude);

    // Pull the engineer's display name + role for the banner's identity line.
    // Missing profile is fine — buildEngineerLabel falls back to email.
    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    const profile = (userSnap.data() ?? {}) as {
      firstName?: string;
      lastName?: string;
      name?: string;
      role?: string;
      email?: string;
    };

    // Build the tamper-evident banner. Lines are drawn as pixels on the image
    // itself so the JPEG self-proves even if EXIF is stripped downstream.
    // Layout: Location / GPS+accuracy / Capture time / Engineer name / Role.
    const accuracyM = Math.round(accuracy ?? 0);
    const bannerLines: string[] = [];
    if (placeName) bannerLines.push(placeName);
    bannerLines.push(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}  ±${accuracyM}m`);
    bannerLines.push(formatManilaTime(ts));
    bannerLines.push(buildEngineerLabel({ ...profile, email }));
    bannerLines.push(buildRoleLabel(profile.role));

    const stampedBuffer = await burnInBanner(buffer, bannerLines);

    // sharp's .jpeg() strips EXIF on re-encode, so we re-inject GPS +
    // DateTimeOriginal onto the stamped bytes as the last step before upload.
    const finalBuffer = embedExifGps(stampedBuffer, latitude, longitude, ts, accuracy);

    await file.save(finalBuffer, {
      metadata: {
        contentType: "image/jpeg",
        metadata: { firebaseStorageDownloadTokens: token },
      },
    });

    const encodedPath = encodeURIComponent(storagePath);
    const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media&token=${token}`;

    const proofId   = `${ts}_${uid}`;
    const fileName  = `${ts}.jpg`;
    // FieldValue.serverTimestamp() is not permitted inside arrayUnion, so we
    // use admin Timestamp objects for both capture time (from the client's
    // camera clock) and upload time (server clock at write).
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
      // Don't downgrade Completed back to Pending if the engineer somehow
      // added more proof after closing the phase.
      status: m.status === "Completed" ? "Completed" : "Pending",
    });

    await logAuditTrail(
      uid, email,
      "Proof Uploaded",
      `${projectData.projectName ?? projectData.title ?? "Project"} · ${m.title ?? milestoneId}`,
      true,
      projectId,
      milestoneId,
    );

    return { success: true, proof };
  },
);

// ─── sendPasswordResetOtp ────────────────────────────────────────────────────
//
//  Unauthenticated. Generates a 6-digit OTP for password reset and emails it.
//  Always returns { success: true } to prevent email enumeration (attacker
//  cannot tell whether an email address is registered).
//
export const sendPasswordResetOtp = onCall(
  { region: "asia-southeast1", secrets: [gmailUser, gmailPass] },
  async (request) => {
    const { email } = (request.data ?? {}) as { email?: string };

    if (!email || typeof email !== "string") {
      return { success: true };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashValue(normalizedEmail);

    try {
      // 1. Look up user by email — silent if not found
      let uid: string;
      try {
        const userRecord = await admin.auth().getUserByEmail(normalizedEmail);
        uid = userRecord.uid;
      } catch {
        return { success: true }; // User not found — return success silently
      }

      // 2. Check send cooldown
      const cooldownRef = admin.firestore().doc(`passwordResetCooldowns/${emailHash}`);
      const cooldownSnap = await cooldownRef.get();
      if (cooldownSnap.exists) {
        const data = cooldownSnap.data() as { sentAt?: admin.firestore.Timestamp };
        const sentMs = data.sentAt?.toMillis() ?? 0;
        if (Date.now() - sentMs < SEND_COOLDOWN_MS) {
          return { success: true }; // Within cooldown — return success silently
        }
      }

      // 3. Generate OTP and store hashed version
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

      // 4. Send branded email with the code
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
      // Internal error — never expose system state to client
    }

    return { success: true };
  },
);

// ─── verifyPasswordResetOtp ──────────────────────────────────────────────────
//
//  Unauthenticated. Validates the 6-digit OTP code.
//  On success: marks the OTP record as verified (does NOT delete it yet).
//  On failure: increments attempt counter, throws descriptive error.
//
export const verifyPasswordResetOtp = onCall(
  { region: "asia-southeast1" },
  async (request) => {
    const { email, code } = (request.data ?? {}) as { email?: string; code?: string };

    if (!email || !code) {
      throw new HttpsError("invalid-argument", "email and code are required.");
    }

    const normalizedEmail = email.toLowerCase().trim();
    const emailHash = hashValue(normalizedEmail);

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

    // Check expiry
    if (Date.now() > otpData.expiresAt) {
      await otpRef.delete();
      throw new HttpsError("deadline-exceeded", "This code has expired. Please request a new one.");
    }

    // Check attempt limit
    if (otpData.attempts >= MAX_VERIFY_ATTEMPTS) {
      await otpRef.delete();
      throw new HttpsError("resource-exhausted", "Too many attempts. Please request a new code.");
    }

    // Verify code
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

    // Code is valid — mark as verified (not yet consumed)
    await otpRef.update({ verified: true });

    return { success: true };
  },
);

// ─── resetPasswordWithOtp ────────────────────────────────────────────────────
//
//  Unauthenticated. Uses a pre-verified OTP record to reset the user's password.
//  Uses Firebase Admin SDK to bypass "requires recent login" restriction.
//
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

    // Reset password via Admin SDK
    try {
      await admin.auth().updateUser(otpData.uid, { password: newPassword });
    } catch (e) {
      const fbErr = e as { code?: string };
      if (fbErr.code === "auth/weak-password") {
        throw new HttpsError("invalid-argument", "Password is too weak. Please use a stronger password.");
      }
      throw new HttpsError("internal", "Failed to update password. Please try again.");
    }

    // Delete OTP record (one-time use — consumed)
    await otpRef.delete();

    // Log audit trail (no DEPW sync — user-initiated reset)
    await logAuditTrail(
      otpData.uid,
      normalizedEmail,
      "Password Reset",
      "Verified via email OTP",
      false,
    );

    return { success: true };
  },
);
