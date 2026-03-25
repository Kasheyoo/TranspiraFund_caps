import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, STYLES } from "../constants";

interface AboutAppViewProps {
  onBack: () => void;
}

export const AboutAppView = ({ onBack }: AboutAppViewProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={STYLES.container}>
      <View style={[styles.nav, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About App</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.logoBox}>
          <FontAwesome5 name="layer-group" size={60} color={COLORS.primary} />
        </View>
        <Text style={styles.appName}>TranspiraFund</Text>
        <Text style={styles.version}>Version 1.0.6 Stable</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Intelligent monitoring system for barangay-level infrastructure
            projects. Official Engineering Portal for LGUs.
          </Text>
        </View>
        <Text style={styles.copyright}>
          © 2026 Engineering Bureau. All Rights Reserved.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  nav: { flexDirection: "row", paddingHorizontal: 20, alignItems: "center" },
  backBtn: {
    width: 40,
    height: 40,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 16,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  logoBox: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.surface,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  appName: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary },
  version: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 30 },
  infoCard: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 20,
    elevation: 1,
  },
  infoText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  copyright: {
    position: "absolute",
    bottom: 40,
    fontSize: 13,
    color: COLORS.textTertiary,
  },
});
