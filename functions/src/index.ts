import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import { defineSecret } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

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
 * Logs an audit event.
 * Always writes to `projEngAuditTrails` (PROJ_ENG's own trail).
 * Only writes to `depwAuditTrails` when syncToDEPW is true
 * (security events + field activity that DEPW HEAD needs to see).
 */
async function logAuditTrail(
  uid: string,
  email: string,
  action: string,
  details: string,
  syncToDEPW = false,
) {
  const entry = {
    uid,
    email,
    action,
    details,
    platform: "mobile",
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  const writes: Promise<unknown>[] = [
    admin.firestore().collection("projEngAuditTrails").add(entry),
  ];

  if (syncToDEPW) {
    writes.push(admin.firestore().collection("depwAuditTrails").add(entry));
  }

  await Promise.all(writes);
}

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

  const { action, details, syncToDEPW } = request.data as {
    action?: string;
    details?: string;
    syncToDEPW?: boolean;
  };

  if (!action || !details) {
    throw new HttpsError("invalid-argument", "action and details are required.");
  }

  const uid = request.auth.uid;
  const email = request.auth.token.email || "";

  await logAuditTrail(uid, email, action, details, syncToDEPW === true);

  return { success: true };
});

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
              Construction Services Division, DEPW
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
