import { updatePassword } from "firebase/auth";
import { useState } from "react";
import { View } from "react-native";
import { SuccessOverlay } from "../../components/SuccessOverlay";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebaseConfig";
import { callFn } from "../../services/CloudFunctionService";
import { NewPasswordView } from "../../views/NewPasswordView";

export function ForcePasswordChangeScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const { refreshProfile } = useAuth();

  const handleConfirmNewPassword = async (
    _currentPassword: string,
    newPassword: string,
  ) => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user || !user.email) {
        setErrorMessage("No authenticated user found.");
        return;
      }

      // User just logged in + passed OTP — session is fresh
      await updatePassword(user, newPassword);

      // Cloud Function sets mustChangePassword: false AND logs to
      // both projEngAuditTrails + depwAuditTrails (Admin SDK)
      await callFn("completePasswordChange");

      // Show branded success overlay
      setShowSuccess(true);
    } catch (error) {
      const fbErr = error as { code?: string; message?: string };

      if (fbErr.code === "auth/requires-recent-login") {
        setErrorMessage("Session expired. Please log out and log in again.");
      } else if (fbErr.code === "auth/weak-password") {
        setErrorMessage("Password is too weak. Please use a stronger password.");
      } else {
        setErrorMessage(
          fbErr.message || "Failed to update password. Please try again.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuccessDismiss = async () => {
    setShowSuccess(false);
    await refreshProfile();
  };

  return (
    <View style={{ flex: 1 }}>
      <NewPasswordView
        actions={{ onConfirmNewPassword: handleConfirmNewPassword }}
        isLoading={isLoading}
        showCurrentPassword={false}
        errorMessage={errorMessage}
      />
      <SuccessOverlay
        visible={showSuccess}
        title="Password Updated"
        message="Your password has been set successfully. Welcome to TranspiraFund!"
        buttonText="Go to Dashboard"
        onDismiss={handleSuccessDismiss}
      />
    </View>
  );
}
