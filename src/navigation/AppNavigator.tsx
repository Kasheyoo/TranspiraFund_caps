import { ActivityIndicator, View } from "react-native";
import { COLORS } from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { ForcePasswordChangeScreen } from "./screens/ForcePasswordChangeScreen";
import { OTPVerificationScreen } from "./screens/OTPVerificationScreen";

export function AppNavigator() {
  const { user, isOTPVerified, isFirstTimeUser } = useAuth();

  // Not logged in or still resolving → show Landing / Login screens
  if (!user) return <AuthNavigator />;

  // Logged in but OTP not yet verified → require 6-digit email code
  if (!isOTPVerified) return <OTPVerificationScreen />;

  // First-time login → force password change before entering the app
  if (isFirstTimeUser) return <ForcePasswordChangeScreen />;

  // Fully authenticated and verified → main app
  return <MainNavigator />;
}
