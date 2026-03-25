import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect, useState } from "react";
import {
  Alert,
  Linking,
  PermissionsAndroid,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAuth } from "../context/AuthContext";
import { COLORS, STYLES } from "../constants";
import { LogoutModal } from "../components/LogoutModal";

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
  danger?: boolean;
}

export const SettingsView = ({ onLogout, onNavigate }: SettingsViewProps) => {
  const insets = useSafeAreaInsets();
  const { userProfile } = useAuth();
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [isLogoutVisible, setIsLogoutVisible] = useState(false);

  const displayName = userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
    : userProfile?.name || "User";
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const roleDisplay =
    userProfile?.role === "PROJ_ENG" ? "Project Engineer" : userProfile?.role || "Engineer";

  useEffect(() => {
    (async () => {
      const granted = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS as any,
      );
      setIsPushEnabled(granted);
    })();
  }, []);

  const handleToggleNotifications = async (value: boolean) => {
    if (value) {
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
    } else {
      setIsPushEnabled(false);
    }
  };

  const handleLogout = () => {
    setIsLogoutVisible(true);
  };

  const confirmLogout = () => {
    setIsLogoutVisible(false);
    onLogout();
  };

  const SettingItem = ({
    icon,
    label,
    onPress,
    isSwitch,
    switchValue,
    onSwitchChange,
    danger,
  }: SettingItemProps) => (
    <TouchableOpacity
      style={styles.item}
      activeOpacity={isSwitch ? 1 : 0.7}
      onPress={!isSwitch ? onPress : undefined}
    >
      <View style={[styles.iconBox, danger && { backgroundColor: COLORS.errorSoft }]}>
        <FontAwesome5
          name={icon}
          size={14}
          color={danger ? COLORS.error : COLORS.textSecondary}
        />
      </View>
      <Text style={[styles.label, danger && { color: COLORS.error }]}>{label}</Text>

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
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }}>
        {/* User profile card */}
        <TouchableOpacity
          style={styles.profileCard}
          onPress={() => onNavigate("ProfileView")}
          activeOpacity={0.8}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileRole}>{roleDisplay}</Text>
          </View>
          <FontAwesome5 name="chevron-right" size={12} color={COLORS.textTertiary} />
        </TouchableOpacity>

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

        <Text style={styles.sectionTitle}>ACTIVITY</Text>
        <View style={styles.section}>
          <SettingItem
            icon="history"
            label="Audit Trail"
            onPress={() => onNavigate("AuditTrail")}
          />
        </View>

        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.section}>
          <SettingItem
            icon="sign-out-alt"
            label="Log Out"
            onPress={handleLogout}
            danger
          />
        </View>

        <Text style={styles.versionText}>TranspiraFund v1.0.6</Text>
      </ScrollView>

      <LogoutModal
        visible={isLogoutVisible}
        onClose={() => setIsLogoutVisible(false)}
        onConfirm={confirmLogout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "900", color: COLORS.textPrimary },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    padding: 16,
    borderRadius: 16,
    marginBottom: 24,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  avatarText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
  profileName: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary },
  profileRole: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginTop: 2 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textTertiary,
    marginBottom: 8,
    marginTop: 8,
    letterSpacing: 0.5,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.background,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  label: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  versionText: {
    textAlign: "center",
    color: COLORS.textTertiary,
    fontSize: 12,
    fontWeight: "500",
    marginTop: 24,
  },
});
