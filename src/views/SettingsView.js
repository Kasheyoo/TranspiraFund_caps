import { FontAwesome5 } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, STYLES } from "../constants";

export const SettingsView = ({ onLogout, onNavigate }) => {
  const insets = useSafeAreaInsets();
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const isExpoGo = Constants.appOwnership === "expo";

  useEffect(() => {
    (async () => {
      if (!isExpoGo) {
        const { status } = await Notifications.getPermissionsAsync();
        setIsPushEnabled(status === "granted");
      }
    })();
  }, [isExpoGo]);

  const handleToggleNotifications = async (value) => {
    if (isExpoGo) {
      Alert.alert(
        "Expo Go Limitation",
        "Push notifications require an APK or Development Build to function.",
      );
      setIsPushEnabled(false);
      return;
    }

    if (value) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please enable notifications in your device settings.",
          [{ text: "Open Settings", onPress: () => Linking.openSettings() }],
        );
        setIsPushEnabled(false);
        return;
      }
      setIsPushEnabled(true);
    } else {
      setIsPushEnabled(false);
    }
  };

  const SettingItem = ({
    icon,
    label,
    onPress,
    isSwitch,
    switchValue,
    onSwitchChange,
  }) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={isSwitch ? 1 : 0.7}
      onPress={!isSwitch ? onPress : null}
    >
      <View style={styles.iconBox}>
        <FontAwesome5 name={icon} size={16} color={COLORS.textSecondary} />
      </View>
      <Text style={styles.label}>{label}</Text>

      {isSwitch ? (
        <Switch
          value={switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: "#D1D1D6", true: COLORS.primary }}
          thumbColor="#FFFFFF"
        />
      ) : (
        <FontAwesome5
          name="chevron-right"
          size={12}
          color={COLORS.textTertiary}
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={STYLES.container}>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.sectionTitle}>GENERAL</Text>
        <View style={styles.section}>
          <SettingItem
            icon="user"
            label="Account Information"
            onPress={() => onNavigate("ProfileView")}
          />
          <SettingItem
            icon="bell"
            label="Push Notifications"
            isSwitch={true}
            switchValue={isPushEnabled}
            onSwitchChange={handleToggleNotifications}
          />
          <SettingItem
            icon="lock"
            label="Privacy & Security"
            onPress={() => onNavigate("SecurityView")}
          />
        </View>

        {/* ✅ RESTORED SUPPORT SECTION */}
        <Text style={styles.sectionTitle}>SUPPORT</Text>
        <View style={styles.section}>
          <SettingItem
            icon="question-circle"
            label="Help Center"
            onPress={() => onNavigate("HelpCenterView")}
          />
          <SettingItem
            icon="info-circle"
            label="About App"
            onPress={() => onNavigate("AboutAppView")}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textTertiary,
    marginBottom: 8,
    marginTop: 16,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  iconBox: { width: 32, alignItems: "center", marginRight: 8 },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  logoutBtn: { marginTop: 32, alignItems: "center", padding: 16 },
  logoutText: { color: COLORS.error, fontWeight: "700", fontSize: 16 },
});
