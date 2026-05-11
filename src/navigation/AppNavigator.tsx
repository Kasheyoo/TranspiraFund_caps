import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { PrivacyOverlay } from "../components/PrivacyOverlay";
import { WelcomeOverlay } from "../components/WelcomeOverlay";
import { DeviceLockRequiredScreen } from "../components/DeviceLockRequiredScreen";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";
import { ForcePasswordChangeScreen } from "./screens/ForcePasswordChangeScreen";
import { OTPVerificationScreen } from "./screens/OTPVerificationScreen";
import { isDeviceSecure } from "../utils/deviceSecurity";

export function AppNavigator() {
  const { user, isOTPVerified, isFirstTimeUser, userProfile, claimsLoaded } =
    useAuth();

  const [appActive, setAppActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => {
      setAppActive(s === "active");
    });
    return () => sub.remove();
  }, []);

  const [deviceSecure, setDeviceSecure] = useState<boolean | null>(null);
  const recheckDeviceSecurity = useCallback(() => {
    isDeviceSecure().then(setDeviceSecure);
  }, []);
  useEffect(() => {
    recheckDeviceSecurity();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") recheckDeviceSecurity();
    });
    return () => sub.remove();
  }, [recheckDeviceSecurity]);

  const firstName =
    userProfile?.firstName ||
    userProfile?.name?.split(" ")[0] ||
    "Engineer";

  let gate: React.ReactNode;
  if (!user) {

    gate = <AuthNavigator />;
  } else if (!claimsLoaded) {

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

    gate = <OTPVerificationScreen />;
  } else if (isFirstTimeUser) {

    gate = <ForcePasswordChangeScreen />;
  } else if (deviceSecure === null) {

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
  } else if (deviceSecure === false) {
    gate = <DeviceLockRequiredScreen onRecheck={recheckDeviceSecurity} />;
  } else {

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
