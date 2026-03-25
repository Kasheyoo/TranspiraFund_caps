import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect, useState } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { COLORS } from "../constants";

interface WelcomeOverlayProps {
  firstName: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export function WelcomeOverlay({ firstName }: WelcomeOverlayProps) {
  const [visible, setVisible] = useState(true);

  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.94);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    // Fade in (400ms) → hold (2000ms) → fade out (600ms) = ~3s total
    opacity.value = withSequence(
      withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) }),
      withDelay(2000, withTiming(0, { duration: 600, easing: Easing.in(Easing.quad) })),
    );
    scale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.05)) });

    const timer = setTimeout(() => setVisible(false), 3100);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      {/* Background orbs */}
      <View style={styles.orbTop} />
      <View style={styles.orbMid} />
      <View style={styles.orbBottom} />

      <Animated.View style={[styles.content, contentStyle]}>
        {/* Auth badge */}
        <View style={styles.badge}>
          <FontAwesome5 name="check-circle" size={12} color="#4ADE80" />
          <Text style={styles.badgeText}>AUTHENTICATED</Text>
        </View>

        {/* Welcome text */}
        <Text style={styles.welcomeSmall}>Welcome,</Text>
        <Text style={styles.oneLiner} numberOfLines={1} adjustsFontSizeToFit>
          <Text style={styles.engineerPart}>Engineer </Text>
          <Text style={styles.namePart}>{firstName}</Text>
        </Text>

        {/* App identity */}
        <Text style={styles.appSub}>TranspiraFund</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
  },
  orbTop: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -120,
    right: -80,
  },
  orbMid: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.02)",
    top: SCREEN_HEIGHT * 0.35,
    left: -100,
  },
  orbBottom: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: "rgba(0,0,0,0.08)",
    bottom: -180,
    left: -150,
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(74,222,128,0.15)",
    borderWidth: 1,
    borderColor: "rgba(74,222,128,0.35)",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    marginBottom: 28,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4ADE80",
    letterSpacing: 1.5,
  },
  welcomeSmall: {
    fontSize: 17,
    fontWeight: "500",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  oneLiner: {
    textAlign: "center",
    marginBottom: 24,
  },
  engineerPart: {
    fontSize: 32,
    fontWeight: "600",
    color: "rgba(255,255,255,0.85)",
    letterSpacing: 0.4,
  },
  namePart: {
    fontSize: 38,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.25)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  appSub: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 1,
  },
});
