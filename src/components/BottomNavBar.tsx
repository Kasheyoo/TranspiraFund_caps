import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";

interface BottomNavBarProps {
  currentScreen: string;
  onNavigate: (screen: string) => void;
  notificationCount?: number;
}

const TABS = [
  { name: "Dashboard",     icon: "home",         label: "Home"      },
  { name: "Projects",      icon: "hard-hat",     label: "Projects"  },
  { name: "Notifications", icon: "bell",         label: "Alerts"    },
  { name: "Settings",      icon: "user-circle",  label: "Account"   },
];

export const BottomNavBar = ({
  currentScreen,
  onNavigate,
  notificationCount = 0,
}: BottomNavBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[S.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={S.bar}>
        {TABS.map((tab) => {
          const active    = currentScreen === tab.name;
          const hasBadge  = tab.name === "Notifications" && notificationCount > 0;

          return (
            <TouchableOpacity
              key={tab.name}
              style={S.tab}
              onPress={() => onNavigate(tab.name)}
              activeOpacity={0.75}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              {/* Active indicator pill at top */}
              <View style={[S.indicator, active && S.indicatorActive]} />

              {/* Icon container */}
              <View style={[S.iconWrap, active && S.iconWrapActive]}>
                <FontAwesome5
                  name={tab.icon}
                  size={20}
                  color={active ? COLORS.primary : COLORS.textTertiary}
                />

                {/* Notification badge */}
                {hasBadge && (
                  <View style={S.badge}>
                    <Text style={S.badgeText}>
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </Text>
                  </View>
                )}
              </View>

              {/* Label */}
              <Text style={[S.label, active && S.labelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const S = StyleSheet.create({
  outer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "transparent",
  },

  bar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 26,
    width: "92%",
    paddingTop: 6,
    paddingBottom: 10,
    paddingHorizontal: 8,
    justifyContent: "space-around",
    alignItems: "flex-start",

    // Shadow — feels like it's floating
    shadowColor: "#0F766E",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 14,

    borderWidth: 1,
    borderColor: "rgba(15,118,110,0.08)",
  },

  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
    minHeight: 56,
    gap: 4,
  },

  // Top indicator line
  indicator: {
    height: 3,
    width: 20,
    borderRadius: 2,
    backgroundColor: "transparent",
    marginBottom: 6,
  },
  indicatorActive: {
    backgroundColor: COLORS.primary,
    width: 28,
  },

  // Icon pill
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconWrapActive: {
    backgroundColor: COLORS.primarySoft,
  },

  // Label
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textTertiary,
    letterSpacing: 0.2,
  },
  labelActive: {
    fontWeight: "800",
    color: COLORS.primary,
  },

  // Notification badge
  badge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: COLORS.error,
    borderRadius: 9,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
  },
});
