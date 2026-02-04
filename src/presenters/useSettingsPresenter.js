import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { UserService } from "../services/UserService";

export const useSettingsPresenter = (navigationCallback) => {
  const [userProfile, setUserProfile] = useState({
    name: "Loading...",
    role: "User",
    initials: "U",
  });

  // Toggles
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [biometrics, setBiometrics] = useState(false);

  // --- LOAD DATA ---
  useEffect(() => {
    const init = async () => {
      // 1. Load User for Profile Card
      const profile = await UserService.getUserProfile();
      if (profile) {
        const rawName = profile.name || "User";
        // Clean name (remove Engr.)
        const cleanName = rawName.replace(/^Engr\.\s+/i, "").trim();
        const nameParts = cleanName.split(" ");
        const initials =
          nameParts.length > 1
            ? nameParts[0][0] + nameParts[nameParts.length - 1][0]
            : nameParts[0][0];

        setUserProfile({
          name: cleanName,
          role: profile.role || "Site Engineer",
          initials: initials.toUpperCase(),
        });
      }

      // 2. Load Notification Preference
      const savedNotif = await AsyncStorage.getItem("notifications_enabled");
      setNotifEnabled(savedNotif === "true");
    };
    init();
  }, []);

  // --- TOGGLE NOTIFICATIONS ---
  const toggleNotifications = async (value) => {
    setNotifEnabled(value);
    await AsyncStorage.setItem("notifications_enabled", value.toString());

    if (value) {
      // Simulate asking for permission or registering token
      Alert.alert(
        "Notifications On",
        "You will now receive alerts for project updates.",
      );
    } else {
      Alert.alert(
        "Notifications Off",
        "You won't receive push alerts anymore.",
      );
    }
  };

  return {
    data: { userProfile, notifEnabled, biometrics },
    actions: {
      onNavigate: navigationCallback,
      setNotifEnabled: toggleNotifications,
      setBiometrics, // Local state only for now
    },
  };
};
