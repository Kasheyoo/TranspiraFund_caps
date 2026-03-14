import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import { useAuth } from "../context/AuthContext";

export const useSettingsPresenter = (navigationCallback?: (screen: string) => void) => {
  const { userProfile: rawProfile } = useAuth();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [biometrics, setBiometrics] = useState(false);

  const userProfile = useMemo(() => {
    if (!rawProfile) return { name: "Loading...", role: "User", initials: "U" };
    const rawName = rawProfile.name || rawProfile.firstName || "User";
    const cleanName = rawName.replace(/^Engr\.\s+/i, "").trim();
    const nameParts = cleanName.split(" ");
    const initials =
      nameParts.length > 1
        ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
        : nameParts[0][0];
    return {
      name: cleanName,
      role: rawProfile.role || "Site Engineer",
      initials: initials.toUpperCase(),
    };
  }, [rawProfile]);

  useEffect(() => {
    AsyncStorage.getItem("notifications_enabled").then((val) => {
      setNotifEnabled(val === "true");
    });
  }, []);

  const toggleNotifications = async (value: boolean) => {
    setNotifEnabled(value);
    await AsyncStorage.setItem("notifications_enabled", value.toString());
    Alert.alert(
      value ? "Notifications On" : "Notifications Off",
      value
        ? "You will now receive alerts for project updates."
        : "You won't receive push alerts anymore.",
    );
  };

  return {
    data: { userProfile, notifEnabled, biometrics },
    actions: {
      onNavigate: navigationCallback,
      setNotifEnabled: toggleNotifications,
      setBiometrics,
    },
  };
};
