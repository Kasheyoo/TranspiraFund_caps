import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PrimaryButton } from "../components/SharedComponents";
import { COLORS } from "../constants";

interface LandingViewProps {
  onGetStarted: () => void;
}

export const LandingView = ({ onGetStarted }: LandingViewProps) => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

      <View style={styles.content}>
        <View style={styles.topSection}>
          <View style={styles.logoCircle}>
            <View style={styles.logoInner}>
              <FontAwesome5 name="layer-group" size={36} color={COLORS.primary} />
            </View>
          </View>
          <Text style={styles.appName}>TranspiraFund</Text>
          <Text style={styles.tagline}>LGU Financial Management System</Text>
        </View>

        <View style={styles.illustrationContainer}>
          <View style={styles.illustrationBg}>
            <FontAwesome5 name="chart-line" size={48} color={COLORS.primary} />
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureChip}>
              <FontAwesome5 name="shield-alt" size={12} color={COLORS.success} />
              <Text style={styles.featureText}>Secure</Text>
            </View>
            <View style={styles.featureChip}>
              <FontAwesome5 name="map-marker-alt" size={12} color={COLORS.primary} />
              <Text style={styles.featureText}>GPS Verified</Text>
            </View>
            <View style={styles.featureChip}>
              <FontAwesome5 name="clock" size={12} color={COLORS.warning} />
              <Text style={styles.featureText}>Real-time</Text>
            </View>
          </View>
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            Manage projects, track milestones, and monitor budgets with geo-tagged evidence logging.
          </Text>
        </View>

        <View style={styles.bottomSection}>
          <PrimaryButton
            title="Get Started"
            onPress={onGetStarted}
            style={{ width: "100%" }}
          />
          <Text style={styles.version}>v1.0.6 — Official Use Only</Text>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { flex: 1, justifyContent: "space-between", padding: 24 },
  topSection: { alignItems: "center", marginTop: 60 },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoInner: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  appName: {
    fontSize: 30,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    fontWeight: "600",
  },
  illustrationContainer: { alignItems: "center" },
  illustrationBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    gap: 10,
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  featureText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  descriptionContainer: { paddingHorizontal: 16 },
  description: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 24,
  },
  bottomSection: { alignItems: "center", marginBottom: 20 },
  version: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 16,
    fontWeight: "600",
  },
});
