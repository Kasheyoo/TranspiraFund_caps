import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, STYLES } from "../constants";

interface SettingsViewProps {
  onLogout: () => void;
  onNavigate: (screen: string) => void;
}

interface SettingItemProps {
  icon: string;
  label: string;
  onPress?: () => void;
  isSwitch?: boolean;
  switchValue?: boolean;
  onSwitchChange?: (value: boolean) => void;
}

export const SettingsView = ({ onLogout, onNavigate }: SettingsViewProps) => {
  const insets = useSafeAreaInsets();
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as any,
        );
        setIsPushEnabled(granted);
      }
    })();
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
      if (Platform.OS === "android") {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as any,
        );
        if (result === PermissionsAndroid.RESULTS.GRANTED) {
          setIsPushEnabled(true);
        } else {
          Alert.alert(
            "Permission Denied",
            "Please enable notifications in your device settings.",
            [{ text: "Open Settings", onPress: () => Linking.openSettings() }],
          );
          setIsPushEnabled(false);
        }
      }
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
  }: SettingItemProps) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={isSwitch ? 1 : 0.7}
      onPress={!isSwitch ? onPress : undefined}
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
