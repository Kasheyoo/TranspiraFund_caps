import { FontAwesome5 } from "@expo/vector-icons";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, STYLES } from "../constants";

export const HelpCenterView = ({ onBack }) => {
  const insets = useSafeAreaInsets();

  const HelpItem = ({ icon, title, desc, onPress }) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.iconContainer}>
        <FontAwesome5 name={icon} size={18} color={COLORS.primary} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.itemTitle}>{title}</Text>
        <Text style={styles.itemDesc}>{desc}</Text>
      </View>
      <FontAwesome5
        name="chevron-right"
        size={12}
        color={COLORS.textTertiary}
      />
    </TouchableOpacity>
  );

  return (
    <View style={STYLES.container}>
      <View style={[styles.nav, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <FontAwesome5
            name="arrow-left"
            size={18}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help Center</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={styles.sectionTitle}>How can we help you?</Text>

        <HelpItem
          icon="envelope"
          title="Email Support"
          desc="Get help from our technical team"
          onPress={() => Linking.openURL("mailto:support@transpirafund.gov.ph")}
        />

        <HelpItem
          icon="book"
          title="User Manual"
          desc="Guide for LGU Engineering Staff"
        />
        <HelpItem
          icon="shield-alt"
          title="Security & Privacy"
          desc="How we handle your data"
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  nav: {
    flexDirection: "row",
    paddingHorizontal: 20,
    alignItems: "center",
    marginBottom: 10,
  },
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    color: COLORS.textPrimary,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    backgroundColor: "#F0F4FF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: { flex: 1, marginLeft: 16 },
  itemTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  itemDesc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
});
