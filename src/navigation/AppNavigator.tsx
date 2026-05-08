import { useEffect, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { PrivacyOverlay } from "../components/PrivacyOverlay";
import { WelcomeOverlay } from "../components/WelcomeOverlay";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { ForcePasswordChangeScreen } from "./screens/ForcePasswordChangeScreen";
import { OTPVerificationScreen } from "./screens/OTPVerificationScreen";

export function AppNavigator() {
  const { user, isOTPVerified, isFirstTimeUser, userProfile, claimsLoaded } =
    useAuth();

  // Drives the privacy overlay — true while the app is in the foreground.
  // We mask the UI on inactive/background so the recent-apps thumbnail and
  // the brief inactive flicker (e.g. notification shade pull) never expose
  // project content.
  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      setAppActive(s === "active");
    });
    return () => sub.remove();
  }, []);

  const firstName =
    userProfile?.firstName ||
    userProfile?.name?.split(" ")[0] ||
    "Engineer";

  let gate: React.ReactNode;
  if (!user) {
    // Not logged in or still resolving → show Landing / Login screens
    gate = <AuthNavigator />;
  } else if (!claimsLoaded) {
    // Logged in but custom claims (tenantId, role) not yet read from the ID
    // token. Hold here so downstream screens never fire unfiltered queries
    // before the tenant session is initialized.
    gate = (
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
  } else if (!isOTPVerified) {
    // Logged in but OTP not yet verified → require 6-digit email code
    gate = <OTPVerificationScreen />;
  } else if (isFirstTimeUser) {
    // First-time login → force password change before entering the app
    gate = <ForcePasswordChangeScreen />;
  } else {
    // Fully authenticated and verified → main app with welcome animation
    gate = (
      <>
        <MainNavigator />
        <WelcomeOverlay firstName={firstName} />
      </>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {gate}
      <PrivacyOverlay visible={!appActive} />
    </View>
  );
}
