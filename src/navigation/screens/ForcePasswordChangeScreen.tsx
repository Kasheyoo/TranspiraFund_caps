import { updatePassword } from "firebase/auth";
import { useState } from "react";
import { View } from "react-native";
import { SuccessOverlay } from "../../components/SuccessOverlay";
import { useAuth } from "../../context/AuthContext";
import { auth } from "../../firebaseConfig";
import { NewPasswordView } from "../../views/NewPasswordView";

const BASE_URL =
  "https://asia-southeast1-transpirafund-webapp.cloudfunctions.net";

/** Authenticated Cloud Function call */
async function callFn(
  name: string,
  data: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  const user = auth.currentUser;
  if (!user) throw new Error("Not authenticated.");

  const token = await user.getIdToken(true);
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
    throw new Error(json?.error?.message || `Request failed (${response.status})`);
  }
  return (json.result ?? json) as Record<string, unknown>;
}

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
      // both audit_logs + depwAuditTrails (Admin SDK)
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
