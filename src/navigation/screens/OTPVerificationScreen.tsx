import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebaseConfig";
import { callFn } from "../../services/CloudFunctionService";
import { OTPService } from "../../services/OTPService";
import { sanitizeOTPError } from "../../utils/security";
import { OTPVerificationView } from "../../views/OTPVerificationView";

const RESEND_COOLDOWN = 60;

export function OTPVerificationScreen() {
  const { setIsOTPVerified, userProfile } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [resendSeconds, setResendSeconds] = useState(RESEND_COOLDOWN);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const email = auth.currentUser?.email ?? "";

  const startResendTimer = () => {
    setResendSeconds(RESEND_COOLDOWN);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendSeconds((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    // Send OTP as soon as this screen mounts (right after login)
    const sendInitial = async () => {
      setIsSending(true);
      try {
        await OTPService.sendCode();
        startResendTimer();
      } catch (e: unknown) {
        setErrorMessage(sanitizeOTPError(e, "send") + " Tap 'Resend Code' to try again.");
        setResendSeconds(0); // Allow immediate resend
      } finally {
        setIsSending(false);
      }
    };
    sendInitial();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (code: string) => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      const success = await OTPService.verifyCode(code);
      if (success) {
        // Log sign-in to projEngAuditTrails only (not DEPW — login is noise for them)
        const firstName = userProfile?.firstName || userProfile?.name?.split(" ")[0] || "Engineer";
        callFn("logMobileAuditTrail", {
          action: "Signed In",
          details: firstName,
          syncToDEPW: false,
        }).catch(() => {}); // Non-blocking

        setIsOTPVerified(true); // AppNavigator proceeds to main app / force password change
      } else {
        setErrorMessage("Invalid or expired code. Tap the error to clear and try again.");
      }
    } catch (e: unknown) {
      setErrorMessage(sanitizeOTPError(e, "verify"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setErrorMessage("");
    setIsSending(true);
    try {
      await OTPService.sendCode();
      startResendTimer();
      Alert.alert("Code Sent", "A new 6-digit code has been sent to your email.");
    } catch (e: unknown) {
      setErrorMessage(sanitizeOTPError(e, "send"));
    } finally {
      setIsSending(false);
    }
  };

  const handleBack = () => {
    // Sign out — AppNavigator will return to AuthNavigator (Landing/Login)
    auth.signOut();
  };

  return (
    <OTPVerificationView
      email={email}
      isLoading={isLoading}
      isSending={isSending}
      errorMessage={errorMessage}
      resendSeconds={resendSeconds}
      onSubmit={handleSubmit}
      onResend={handleResend}
      onBack={handleBack}
    />
  );
}
