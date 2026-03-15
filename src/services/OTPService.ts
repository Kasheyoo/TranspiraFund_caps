import { auth } from "../firebaseConfig";

/**
 * Firebase Service — calls the SAME Cloud Functions the web app uses.
 *
 * Shared functions (asia-southeast1):
 *   sendOtp            — generates 6-digit code, stores in otpCodes/{uid}, emails via Gmail
 *   verifyOtp          — verifies the code (5 attempts max, 5-min expiry)
 *   sendPasswordReset  — sends branded password-reset email via Gmail (no auth required)
 *
 * Uses direct fetch with Firebase callable protocol to avoid
 * httpsCallable SDK issues in React Native.
 */

const BASE_URL =
  "https://asia-southeast1-transpirafund-webapp.cloudfunctions.net";

/** Authenticated call — requires logged-in user (for OTP send/verify) */
async function callFn(
  name: string,
  data: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Not authenticated. Please log in again.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${BASE_URL}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ data }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.error) {
    const msg =
      json?.error?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(msg);
  }

  return (json.result ?? json) as Record<string, unknown>;
}

/** Unauthenticated call — no Bearer token (for password reset before login) */
async function callFnPublic(
  name: string,
  data: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const response = await fetch(`${BASE_URL}/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok || json.error) {
    const msg =
      json?.error?.message ||
      `Request failed with status ${response.status}`;
    throw new Error(msg);
  }

  return (json.result ?? json) as Record<string, unknown>;
}

export const OTPService = {
  /** Calls the web app's sendOtp function to generate & email a 6-digit code */
  sendCode: async (): Promise<void> => {
    const result = await callFn("sendOtp");
    if (result?.success !== true) {
      throw new Error("OTP could not be sent. Please try again.");
    }
  },

  /** Calls the web app's verifyOtp function to verify the entered code */
  verifyCode: async (code: string): Promise<boolean> => {
    const result = await callFn("verifyOtp", { code });
    return result?.success === true;
  },

  /** Calls the web app's sendPasswordReset — branded email via Gmail (no auth needed) */
  sendPasswordReset: async (email: string): Promise<void> => {
    await callFnPublic("sendPasswordReset", { email });
  },
};
