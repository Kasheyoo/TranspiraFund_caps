import { Image, StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { PrimaryButton } from "../components/SharedComponents";
import { COLORS } from "../constants";

interface LandingViewProps {
  onGetStarted: () => void;
}

const FEATURES = [
  {
    color: COLORS.primary,
    title: "Secure Access",
    desc: "End-to-end encrypted government portal",
  },
  {
    color: COLORS.success,
    title: "Geo-Tagged Evidence",
    desc: "GPS-verified project documentation",
  },
  {
    color: COLORS.warning,
    title: "Real-Time Tracking",
    desc: "Live budget and milestone monitoring",
  },
];

export const LandingView = ({ onGetStarted }: LandingViewProps) => {
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.backgroundDark} />

      {/* Dark Hero Section */}
      <View style={styles.hero}>
        {/* Decorative accent shape */}
        <View style={styles.decorShape} />

        <SafeAreaView edges={["top"]} style={styles.heroContent}>
          <Animated.View entering={FadeIn.duration(600)} style={styles.logoClip}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="cover"
            />
          </Animated.View>

          <Animated.Text
            entering={FadeIn.delay(100).duration(500)}
            style={styles.appName}
          >
            TranspiraFund
          </Animated.Text>

          <Animated.Text
            entering={FadeIn.delay(200).duration(500)}
            style={styles.tagline}
          >
            Project Engineer Mobile App
          </Animated.Text>
        </SafeAreaView>
      </View>

      {/* White Content Card */}
      <Animated.View
        entering={FadeInDown.delay(250).duration(600).springify().damping(18)}
        style={styles.card}
      >
        <View style={styles.cardInner}>
          <Text style={styles.sectionLabel}>WHAT YOU CAN DO</Text>

          {FEATURES.map((feature, index) => (
            <Animated.View
              key={feature.title}
              entering={FadeIn.delay(400 + index * 100).duration(400)}
              style={styles.featureRow}
            >
              <View style={[styles.featureDot, { backgroundColor: feature.color }]} />
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureDesc}>{feature.desc}</Text>
              </View>
            </Animated.View>
          ))}

          <View style={styles.divider} />

          <Animated.View entering={FadeIn.delay(700).duration(400)}>
            <PrimaryButton
              title="Get Started"
              onPress={onGetStarted}
              icon="arrow-right"
              style={{ width: "100%" }}
            />
          </Animated.View>

          <Text style={styles.version}>v1.0.6 — Official Use Only</Text>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.backgroundDark,
  },
  hero: {
    flex: 0.42,
    backgroundColor: COLORS.backgroundDark,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  decorShape: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 32,
    backgroundColor: "rgba(20, 184, 166, 0.12)",
    transform: [{ rotate: "45deg" }],
  },
  heroContent: {
    alignItems: "center",
    paddingTop: 24,
  },
  logoClip: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoImage: {
    width: 125,
    height: 125,
  },
  appName: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 0.2,
  },
  card: {
    flex: 0.58,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
  },
  cardInner: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: "space-between",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textTertiary,
    letterSpacing: 1.5,
    marginBottom: 20,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  featureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 8,
  },
  version: {
    fontSize: 11,
    color: COLORS.textTertiary,
    textAlign: "center",
    marginTop: 16,
    fontWeight: "600",
  },
});
