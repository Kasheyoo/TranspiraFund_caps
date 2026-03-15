import { updatePassword } from "firebase/auth";
import { doc, updateDoc } from "firebase/firestore";
import { useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "../../context/AuthContext";
import { auth, db } from "../../firebaseConfig";
import { validatePassword } from "../../utils/security";
import { NewPasswordView } from "../../views/NewPasswordView";

export function ForcePasswordChangeScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const { refreshProfile } = useAuth();

  const handleConfirmNewPassword = async (newPassword: string) => {
    const validation = validatePassword(newPassword);
    if (!validation.isValid) {
      Alert.alert(
        "Weak Password",
        "Password must be at least 8 characters with uppercase, lowercase, number, and special character.",
      );
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert("Error", "No authenticated user found.");
        return;
      }

      await updatePassword(user, newPassword);

      // Mark firstTimeAccess as false in Firestore
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, { firstTimeAccess: false });

      // Refresh the auth context profile
      await refreshProfile();

      Alert.alert(
        "Password Updated",
        "Your password has been set. Welcome to TranspiraFund!",
      );
    } catch (error) {
      console.error("Force Password Change Error:", error);
      Alert.alert("Error", "Failed to update password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <NewPasswordView
      actions={{ onConfirmNewPassword: handleConfirmNewPassword }}
      isLoading={isLoading}
    />
  );
}
