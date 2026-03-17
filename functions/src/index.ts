import * as admin from "firebase-admin";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";

admin.initializeApp();

// ─── Firebase Secrets (set via: firebase functions:secrets:set GMAIL_USER) ───
const gmailUser = defineSecret("GMAIL_USER"); // your Gmail address
const gmailPass = defineSecret("GMAIL_APP_PASS"); // Gmail App Password (not your login password)

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS  = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Logs an audit event to both audit_logs and depwAuditTrails (Admin SDK) */
async function logAudit(uid: string, email: string, action: string, details: string) {
  const entry = {
    uid,
    email,
    action,
    details,
    platform: "mobile",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await Promise.all([
    admin.firestore().collection("audit_logs").add(entry),
    admin.firestore().collection("depwAuditTrails").add(entry),
  ]);
}

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function createTransporter(user: string, pass: string) {
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

// ─── sendMobileOTP ───────────────────────────────────────────────────────────
//
//  Called by mobile app after successful Firebase Auth sign-in.
//  Generates a 6-digit code, stores it (hashed) in otpCodes/{uid},
//  and sends it to the user's email via nodemailer + Gmail.
//
export const sendMobileOTP = onCall(
  { secrets: [gmailUser, gmailPass] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const uid   = request.auth.uid;
    const email = request.auth.token.email;

    if (!email) {
      throw new HttpsError("invalid-argument", "User email not found.");
    }

    const otp       = generateOTP();
    const hashedOtp = hashCode(otp);

    // Store hashed OTP — Admin SDK bypasses the client-blocking security rules
    await admin.firestore().doc(`otpCodes/${uid}`).set({
      code:      hashedOtp,
      email,
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      attempts:  0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Send email
    const transporter = createTransporter(gmailUser.value(), gmailPass.value());

    await transporter.sendMail({
      from:    `"TranspiraFund" <${gmailUser.value()}>`,
      to:      email,
      subject: "Your TranspiraFund Verification Code",
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;">
          <div style="background:#2563EB;padding:28px 32px;border-radius:16px 16px 0 0;">
            <h1 style="color:white;margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px;">
              TranspiraFund
            </h1>
            <p style="color:#DBEAFE;margin:4px 0 0;font-size:13px;">
              LGU Engineering Portal — Mobile Access
            </p>
          </div>
          <div style="background:#F8FAFC;padding:36px 32px;border-radius:0 0 16px 16px;border:1px solid #E2E8F0;border-top:none;">
            <h2 style="color:#0F172A;margin:0 0 8px;font-size:20px;">
              Login Verification Code
            </h2>
            <p style="color:#64748B;margin:0 0 28px;font-size:14px;line-height:22px;">
              Enter this 6-digit code in the mobile app to verify your identity.
              The code expires in <strong>10 minutes</strong>.
            </p>
            <div style="background:white;border:2px solid #2563EB;border-radius:14px;
                        padding:28px;text-align:center;margin-bottom:28px;">
              <span style="font-size:44px;font-weight:900;letter-spacing:14px;
                           color:#2563EB;font-family:monospace;">
                ${otp}
              </span>
            </div>
            <p style="color:#94A3B8;font-size:12px;margin:0;line-height:18px;">
              If you did not attempt to log in, please contact your system administrator
              immediately and do not share this code with anyone.
            </p>
          </div>
        </div>
      `,
    });

    return { success: true };
  }
);

// ─── verifyMobileOTP ─────────────────────────────────────────────────────────
//
//  Verifies the 6-digit code entered by the user.
//  Returns { success: true } on match, { success: false } on failure.
//
export const verifyMobileOTP = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const uid  = request.auth.uid;
  const code = (request.data?.code as string)?.trim();

  if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
    throw new HttpsError("invalid-argument", "Code must be exactly 6 digits.");
  }

  const otpRef = admin.firestore().doc(`otpCodes/${uid}`);
  const otpDoc = await otpRef.get();

  if (!otpDoc.exists) {
    return { success: false, message: "No pending code. Request a new one." };
  }

  const data = otpDoc.data()!;

  // Expired
  if (Date.now() > data.expiresAt) {
    await otpRef.delete();
    return { success: false, message: "Code expired. Request a new one." };
  }

  // Too many wrong attempts
  if (data.attempts >= MAX_ATTEMPTS) {
    await otpRef.delete();
    return { success: false, message: "Too many attempts. Request a new code." };
  }

  // Wrong code
  if (data.code !== hashCode(code)) {
    await otpRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
    return { success: false, message: "Incorrect code." };
  }

  // ✓ Correct — delete OTP record, return success
  await otpRef.delete();
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

  // Log PASSWORD_CHANGE to both audit_logs and depwAuditTrails
  const email = request.auth.token.email || "";
  await logAudit(uid, email, "PASSWORD_CHANGE", "PROJ_ENG completed first-time password change");

  return { success: true };
});

// ─── logMobileAudit ──────────────────────────────────────────────────────────
//
//  General-purpose audit logger for the mobile app.
//  Writes to BOTH audit_logs (readable by PROJ_ENG, MIS, DEPW) and
//  depwAuditTrails (readable by DEPW HEAD on web app).
//  Uses Admin SDK to bypass Firestore security rules.
//
export const logMobileAudit = onCall({ region: "asia-southeast1" }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  const { action, details } = request.data as { action?: string; details?: string };
  if (!action || !details) {
    throw new HttpsError("invalid-argument", "action and details are required.");
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email || "";

  await logAudit(uid, email, action, details);

  return { success: true };
});
