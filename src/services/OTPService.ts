import { callFn, callFnPublic } from "./CloudFunctionService";



export const OTPService = {

  sendCode: async (): Promise<void> => {
    const result = await callFn("sendOtp");
    if (result?.success !== true) {
      throw new Error("OTP could not be sent. Please try again.");
    }
  },


  verifyCode: async (code: string): Promise<boolean> => {
    const result = await callFn("verifyOtp", { code });
    return result?.success === true;
  },


  sendPasswordResetOtp: async (email: string): Promise<void> => {
    await callFnPublic("sendPasswordResetOtp", { email });
  },


  verifyPasswordResetOtp: async (email: string, code: string): Promise<void> => {
    await callFnPublic("verifyPasswordResetOtp", { email, code });
  },


  resetPasswordWithOtp: async (email: string, newPassword: string): Promise<void> => {
    await callFnPublic("resetPasswordWithOtp", { email, newPassword });
  },
};
