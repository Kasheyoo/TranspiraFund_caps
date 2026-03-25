import { View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { WelcomeOverlay } from "../components/WelcomeOverlay";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { ForcePasswordChangeScreen } from "./screens/ForcePasswordChangeScreen";
import { OTPVerificationScreen } from "./screens/OTPVerificationScreen";

export function AppNavigator() {
  const { user, isOTPVerified, isFirstTimeUser, userProfile } = useAuth();

  // Not logged in or still resolving → show Landing / Login screens
  if (!user) return <AuthNavigator />;

  // Logged in but OTP not yet verified → require 6-digit email code
  if (!isOTPVerified) return <OTPVerificationScreen />;

  // First-time login → force password change before entering the app
  if (isFirstTimeUser) return <ForcePasswordChangeScreen />;

  // Fully authenticated and verified → main app with welcome animation
  const firstName =
    userProfile?.firstName ||
    userProfile?.name?.split(" ")[0] ||
    "Engineer";

  return (
    <View style={{ flex: 1 }}>
      <MainNavigator />
      <WelcomeOverlay firstName={firstName} />
    </View>
  );
}
