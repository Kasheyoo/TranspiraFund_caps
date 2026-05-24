import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
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

const ACTIVE_TRANSITION = { duration: 200, easing: Easing.out(Easing.cubic) };

interface TabButtonProps {
  tab: { name: string; icon: string; label: string };
  active: boolean;
  hasBadge: boolean;
  badgeCount: number;
  onPress: () => void;
}

const TabButton = ({ tab, active, hasBadge, badgeCount, onPress }: TabButtonProps) => {
  const progress = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(active ? 1 : 0, ACTIVE_TRANSITION);
  }, [active, progress]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [20, 28]),
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ["rgba(0,0,0,0)", COLORS.primary],
    ),
  }));

  const iconWrapStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ["rgba(0,0,0,0)", COLORS.primarySoft],
    ),
  }));

  const activeIconStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const inactiveIconStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      progress.value,
      [0, 1],
      [COLORS.textTertiary, COLORS.primary],
    ),
    fontWeight: progress.value > 0.5 ? "800" : "600",
  }));

  return (
    <Pressable
      style={({ pressed }) => [
        S.tab,
        pressed && { transform: [{ scale: 0.94 }], opacity: 0.85 },
      ]}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      android_ripple={null}
    >
      <Animated.View style={[S.indicator, indicatorStyle]} />

      <Animated.View style={[S.iconWrap, iconWrapStyle]}>
        <Animated.View style={[StyleSheet.absoluteFill, S.iconLayer, inactiveIconStyle]}>
          <FontAwesome5 name={tab.icon} size={20} color={COLORS.textTertiary} />
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, S.iconLayer, activeIconStyle]}>
          <FontAwesome5 name={tab.icon} size={20} color={COLORS.primary} />
        </Animated.View>

        {hasBadge && (
          <View style={S.badge}>
            <Text style={S.badgeText}>
              {badgeCount > 9 ? "9+" : badgeCount}
            </Text>
          </View>
        )}
      </Animated.View>

      <Animated.Text style={[S.label, labelStyle]}>{tab.label}</Animated.Text>
    </Pressable>
  );
};

export const BottomNavBar = ({
  currentScreen,
  onNavigate,
  notificationCount = 0,
}: BottomNavBarProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[S.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={S.bar}>
        {TABS.map((tab) => (
          <TabButton
            key={tab.name}
            tab={tab}
            active={currentScreen === tab.name}
            hasBadge={tab.name === "Notifications" && notificationCount > 0}
            badgeCount={notificationCount}
            onPress={() => onNavigate(tab.name)}
          />
        ))}
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

  indicator: {
    height: 3,
    borderRadius: 2,
    marginBottom: 6,
  },

  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  iconLayer: {
    alignItems: "center",
    justifyContent: "center",
  },

  label: {
    fontSize: 10,
    letterSpacing: 0.2,
  },

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
