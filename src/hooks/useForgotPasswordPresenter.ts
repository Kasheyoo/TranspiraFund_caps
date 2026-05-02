import { useEffect, useRef, useState } from "react";
import { OTPService } from "../services/OTPService";
import { isValidEmail, sanitizeInput } from "../utils/security";

type ForgotStep = "email" | "otp" | "password" | "success";

const RESEND_COOLDOWN = 60; // seconds

export const useForgotPasswordPresenter = () => {
  const [step, setStep] = useState<ForgotStep>("email");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startResendTimer = () => {
    setResendSeconds(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  /** Step 1 — User submits their email */
  const onSendCode = async (inputEmail: string) => {
    setError("");
    const cleaned = sanitizeInput(inputEmail, 254);
    if (!cleaned || !isValidEmail(cleaned)) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);
    try {
      await OTPService.sendPasswordResetOtp(cleaned);
    } catch {
      // Intentionally silent — never reveal if email exists (security)
    } finally {
      setEmail(cleaned);
      setStep("otp");
      startResendTimer();
      setIsLoading(false);
    }
  };

  /** Step 2 — User submits the 6-digit code */
  const onVerifyCode = async (code: string) => {
    setError("");
    setIsLoading(true);
    try {
      await OTPService.verifyPasswordResetOtp(email, code);
      setStep("password");
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Invalid or expired code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /** Step 3 — User sets their new password */
  const onResetPassword = async (_currentPassword: string, newPassword: string) => {
    setError("");
    setIsLoading(true);
    try {
      await OTPService.resetPasswordWithOtp(email, newPassword);
      setStep("success");
    } catch (e) {
      const err = e as { message?: string };
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  /** Resend code from step 2 */
  const onResendCode = async () => {
    setError("");
    setIsSending(true);
    try {
      await OTPService.sendPasswordResetOtp(email);
    } catch {
      // Silent — always appears to succeed to prevent enumeration
    } finally {
      startResendTimer();
      setIsSending(false);
    }
  };

  /** Go back to email entry step from OTP step */
  const onBackToEmail = () => {
    setStep("email");
    setError("");
    setEmail("");
    if (timerRef.current) clearInterval(timerRef.current);
    setResendSeconds(0);
  };

  return {
    step,
    email,
    isLoading,
    isSending,
    error,
    resendSeconds,
    actions: {
      onSendCode,
      onVerifyCode,
      onResetPassword,
      onResendCode,
      onBackToEmail,
    },
  };
};
