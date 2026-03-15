import { useState } from "react";
import { Alert } from "react-native";
import { OTPService } from "../services/OTPService";
import { resetRateLimiter, sanitizeInput } from "../utils/security";

export const useForgotPasswordPresenter = (onClose: () => void) => {
  const [employeeId, setEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmployeeIdChange = (text: string) => {
    setEmployeeId(text);
  };

  const handleResetPassword = async () => {
    const cleanId = sanitizeInput(employeeId, 254);
    if (!cleanId) {
      Alert.alert("Error", "Please enter your email or Employee ID");
      return;
    }

    // Rate limiting
    const rateLimitCheck = resetRateLimiter.check("reset_password");
    if (!rateLimitCheck.allowed) {
      Alert.alert(
        "Too Many Requests",
        `Please wait ${rateLimitCheck.lockoutSeconds} seconds before trying again.`,
      );
      return;
    }

    setIsLoading(true);
    try {
      // Uses web app's sendPasswordReset Cloud Function — branded email via Gmail
      await OTPService.sendPasswordReset(cleanId);
      resetRateLimiter.recordAttempt("reset_password");

      // Always show the same message - don't reveal if account exists
      Alert.alert(
        "Request Processed",
        "If a matching account exists, a password reset link has been sent to the registered email.",
        [
          {
            text: "OK",
            onPress: () => {
              setEmployeeId("");
              onClose();
            },
          },
        ],
      );
    } catch {
      // Still show generic message to prevent email enumeration
      Alert.alert(
        "Request Processed",
        "If a matching account exists, a password reset link has been sent to the registered email.",
        [
          {
            text: "OK",
            onPress: () => {
              setEmployeeId("");
              onClose();
            },
          },
        ],
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEmployeeId("");
    onClose();
  };

  return {
    data: { employeeId, isLoading },
    actions: { handleEmployeeIdChange, handleResetPassword, handleCancel },
  };
};
