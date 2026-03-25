import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect } from "react";
import { Dimensions, Image, StatusBar, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { PrimaryButton } from "../components/SharedComponents";
import { COLORS } from "../constants";

interface LandingViewProps {
  onGetStarted: () => void;
}

const PILLARS = [
  { icon: "camera", label: "Proof Submission" },
  { icon: "clipboard-check", label: "Site Oversight" },
  { icon: "chart-bar", label: "Progress Reports" },
];

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const isSmall = SCREEN_HEIGHT < 700;

const SPLASH_LOGO_SIZE = isSmall ? 140 : 160;

export const LandingView = ({ onGetStarted }: LandingViewProps) => {
  const insets = useSafeAreaInsets();

  // Splash overlay fades OUT, landing content fades IN — crossfade
  const splashOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    // Hold so user sees the splash logo, then fade out
    splashOpacity.value = withDelay(
      1000,
      withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) }),
    );
    // Landing content fades in slightly after splash starts fading
    contentOpacity.value = withDelay(
      1150,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
    );
  }, [splashOpacity, contentOpacity]);

  const splashStyle = useAnimatedStyle(() => ({
    opacity: splashOpacity.value,
    // Hide from touch once faded
    pointerEvents: splashOpacity.value > 0.05 ? "auto" : "none",
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: interpolate(contentOpacity.value, [0, 1], [10, 0]) }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <View style={styles.bgAccentTop} />
      <View style={styles.bgAccentMid} />
      <View style={styles.bgAccentBottom} />

      {/* ── Landing page (always rendered, fades in) ── */}
      <Animated.View style={[styles.content, contentStyle, {
        paddingTop: insets.top + 24,
        paddingBottom: insets.bottom + 24,
      }]}>
        <View style={styles.heroGroup}>
          <View style={styles.badge}>
            <FontAwesome5 name="landmark" size={8} color="rgba(255,255,255,0.9)" />
            <Text style={styles.badgeText}>REPUBLIC OF THE PHILIPPINES</Text>
          </View>

          <View style={styles.masthead}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/logo.png")}
                style={styles.logoImage}
                resizeMode="cover"
              />
            </View>
            <Text style={styles.mastheadTitle}>TranspiraFund</Text>
            <Text style={styles.mastheadSubtitle}>Project Engineer Portal</Text>
          </View>

          <Text style={styles.tagline}>
            Document and oversee{"\n"}city-funded barangay projects
          </Text>

          <View style={styles.pillarRow}>
            {PILLARS.map((pillar) => (
              <View key={pillar.label} style={styles.pillarChip}>
                <View style={styles.pillarIconWrap}>
                  <FontAwesome5 name={pillar.icon} size={14} color={COLORS.primary} />
                </View>
                <Text style={styles.pillarLabel}>{pillar.label}</Text>
              </View>
            ))}
          </View>

          <View style={styles.trustRow}>
            <View style={styles.trustItem}>
              <FontAwesome5 name="lock" size={10} color="rgba(255,255,255,0.6)" />
              <Text style={styles.trustText}>256-bit Encrypted</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <FontAwesome5 name="map-pin" size={10} color="rgba(255,255,255,0.6)" />
              <Text style={styles.trustText}>GPS Verified</Text>
            </View>
            <View style={styles.trustDot} />
            <View style={styles.trustItem}>
              <FontAwesome5 name="clock" size={10} color="rgba(255,255,255,0.6)" />
              <Text style={styles.trustText}>Real-Time</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionContainer}>
          <PrimaryButton
            title="Sign In to Portal"
            onPress={onGetStarted}
            icon="arrow-right"
            iconPosition="right"
            style={styles.primaryBtn}
          />
          <Text style={styles.version}>v1.0.0 · Authorized Personnel Only</Text>
        </View>
      </Animated.View>

      {/* ── Splash overlay (absolutely positioned, fades out) ── */}
      <Animated.View style={[styles.splashOverlay, splashStyle]}>
        <View style={styles.splashLogoContainer}>
          <Image
            source={require("../../assets/images/logo.png")}
            style={styles.splashLogoImage}
            resizeMode="cover"
          />
        </View>
        <Text style={styles.splashName}>TranspiraFund</Text>
        <Text style={styles.splashSub}>Project Engineer Portal</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  bgAccentTop: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: "rgba(255,255,255,0.04)",
    top: -120,
    right: -80,
  },
  bgAccentMid: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(255,255,255,0.02)",
    top: SCREEN_HEIGHT * 0.35,
    left: -100,
  },
  bgAccentBottom: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: 250,
    backgroundColor: "rgba(0,0,0,0.08)",
    bottom: -180,
    left: -150,
  },

  // ── Landing layout ──
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  heroGroup: {
    alignItems: "center",
    width: "100%",
    maxWidth: 400,
    marginBottom: 32,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 16,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 1.8,
  },
  masthead: {
    alignItems: "center",
    width: "100%",
    marginBottom: 24,
  },
  logoContainer: {
    width: isSmall ? 96 : 112,
    height: isSmall ? 96 : 112,
    borderRadius: isSmall ? 48 : 56,
    overflow: "hidden",
    marginBottom: 16,
  },
  logoImage: {
    width: isSmall ? 96 : 112,
    height: isSmall ? 96 : 112,
  },
  mastheadTitle: {
    fontSize: isSmall ? 26 : 30,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  mastheadSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: isSmall ? 15 : 17,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: isSmall ? 22 : 26,
    marginBottom: 24,
    letterSpacing: 0.2,
  },
  pillarRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
    width: "100%",
  },
  pillarChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillarIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  pillarLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  trustItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trustText: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 0.3,
  },
  trustDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  actionContainer: {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 8,
  },
  primaryBtn: {
    width: "100%",
    height: 56,
    borderRadius: 16,
    backgroundColor: COLORS.textPrimary,
    elevation: 8,
    shadowColor: "#000",
  },
  version: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    textAlign: "center",
    marginTop: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  // ── Splash overlay ──
  splashOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  splashLogoContainer: {
    width: SPLASH_LOGO_SIZE,
    height: SPLASH_LOGO_SIZE,
    borderRadius: SPLASH_LOGO_SIZE / 2,
    overflow: "hidden",
    marginBottom: 24,
  },
  splashLogoImage: {
    width: SPLASH_LOGO_SIZE,
    height: SPLASH_LOGO_SIZE,
  },
  splashName: {
    fontSize: isSmall ? 30 : 36,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  splashSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "600",
    marginTop: 6,
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
