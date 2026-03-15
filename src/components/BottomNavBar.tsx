import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";

interface BottomNavBarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  notificationCount?: number;
}

export const BottomNavBar = ({
  currentScreen,
  onNavigate,
  notificationCount = 0,
}: BottomNavBarProps) => {
  const insets = useSafeAreaInsets();

  const tabs = [
    { name: "Dashboard", icon: "home", label: "Home" },
    { name: "Projects", icon: "folder", label: "Projects" },
    { name: "Notifications", icon: "bell", label: "Alerts" },
    { name: "Settings", icon: "cog", label: "Settings" },
  ];

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, Platform.OS === "android" ? 12 : 20) },
      ]}
    >
      <View style={styles.floatingBar}>
        {tabs.map((tab) => {
          const active = currentScreen === tab.name;
          const showBadge = tab.name === "Notifications" && notificationCount > 0;

          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tab, active && styles.activeTab]}
              onPress={() => onNavigate(tab.name)}
              activeOpacity={0.7}
            >
              <View style={styles.iconWrapper}>
                <FontAwesome5
                  name={tab.icon}
                  size={18}
                  color={active ? COLORS.primary : COLORS.textTertiary}
                  solid={active}
                />
                {showBadge && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? COLORS.primary : COLORS.textTertiary },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  floatingBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: "92%",
    justifyContent: "space-around",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    minWidth: 60,
  },
  activeTab: {
    backgroundColor: COLORS.primarySoft,
  },
  iconWrapper: {
    position: "relative",
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -10,
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
});
