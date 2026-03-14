import { FontAwesome5 } from "@expo/vector-icons";
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
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <FontAwesome5 name="building" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.appName}>TranspiraFund</Text>
          <Text style={styles.tagline}>LGU Financial Management System</Text>
        </View>

        <View style={styles.illustrationContainer}>
          <FontAwesome5
            name="chart-line"
            size={120}
            color={COLORS.primary}
            opacity={0.2}
          />
        </View>

        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            Manage projects, track milestones, and monitor budgets efficiently.
          </Text>
        </View>

        <PrimaryButton
          title="Get Started"
          onPress={onGetStarted}
          style={{ width: "100%", marginTop: 40 }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  content: { flex: 1, justifyContent: "center", alignItems: "center" },
  logoContainer: { alignItems: "center", marginBottom: 40 },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.textDark,
    marginBottom: 8,
  },
  tagline: { fontSize: 16, color: COLORS.textGrey, textAlign: "center" },
  illustrationContainer: { marginVertical: 30 },
  descriptionContainer: { paddingHorizontal: 20 },
  description: {
    fontSize: 16,
    color: COLORS.textGrey,
    textAlign: "center",
    lineHeight: 24,
  },
});
