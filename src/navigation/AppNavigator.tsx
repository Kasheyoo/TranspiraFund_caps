import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { WelcomeOverlay } from "../components/WelcomeOverlay";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { ForcePasswordChangeScreen } from "./screens/ForcePasswordChangeScreen";
import { OTPVerificationScreen } from "./screens/OTPVerificationScreen";

export function AppNavigator() {
  const { user, isOTPVerified, isFirstTimeUser, userProfile, claimsLoaded } =
    useAuth();

  // Not logged in or still resolving → show Landing / Login screens
  if (!user) return <AuthNavigator />;

  // Logged in but custom claims (tenantId, role) not yet read from the ID
  // token. Hold here so downstream screens never fire unfiltered queries
  // before the tenant session is initialized.
  if (!claimsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F766E",
        }}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

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
