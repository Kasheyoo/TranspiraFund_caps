import { callFn, callFnPublic } from "./CloudFunctionService";

/**
 * OTP Service — calls the SAME Cloud Functions the web app uses.
 *
 * Shared functions (asia-southeast1):
 *   sendOtp            — generates 6-digit code, stores in otpCodes/{uid}, emails via Gmail
 *   verifyOtp          — verifies the code (5 attempts max, 5-min expiry)
 *   sendPasswordReset  — sends branded password-reset email via Gmail (no auth required)
 */

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

  /** Sends a 6-digit password reset code to the given email (no auth needed) */
  sendPasswordResetOtp: async (email: string): Promise<void> => {
    await callFnPublic("sendPasswordResetOtp", { email });
  },

  /** Verifies the password reset OTP code — throws on invalid/expired/too many attempts */
  verifyPasswordResetOtp: async (email: string, code: string): Promise<void> => {
    await callFnPublic("verifyPasswordResetOtp", { email, code });
  },

  /** Resets the user's password after OTP has been verified (no auth needed) */
  resetPasswordWithOtp: async (email: string, newPassword: string): Promise<void> => {
    await callFnPublic("resetPasswordWithOtp", { email, newPassword });
  },
};
