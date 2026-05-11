import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp: typeof import("sharp") = require("sharp");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const piexif = require("piexifjs");

admin.initializeApp();


const gmailUser = defineSecret("GMAIL_USER");
const gmailPass = defineSecret("GMAIL_PASS");


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
  try {

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

    return buffer;
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

  await enforceRateLimit(request.auth.uid, "generateMilestones", {
    max: 10,
    windowMs: 24 * 60 * 60 * 1000,
    lockoutMs: 24 * 60 * 60 * 1000,
  });

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


  const KNOWN_TYPES = new Set(Object.keys(MILESTONE_TEMPLATES));
  const rawType = typeof projectData.projectType === "string" ? projectData.projectType : "";
  const resolvedType = KNOWN_TYPES.has(rawType) ? rawType : "Other";
  const template = MILESTONE_TEMPLATES[resolvedType];
  const fellBack = rawType !== resolvedType;


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
      confirmed: false,
      generatedBy: "template",
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
    undefined,
    typeof projectData.tenantId === "string" ? projectData.tenantId : undefined,
  );

  return {
    success: true,
    count: template.length,
    projectType: resolvedType,
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


    if (typeof accuracy === "number" && accuracy > 50) {
      throw new HttpsError("invalid-argument", "GPS accuracy too low — move to a clearer area.");
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
