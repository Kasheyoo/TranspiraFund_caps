import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  Image,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../constants";
import type { Milestone, Project } from "../types";

interface MilestoneDetailsData {
  selectedMilestone: Milestone | null;
  project: Project | null;
  isLoading: boolean;
}

interface MilestoneDetailsActions {
  onRefresh: () => void;
  onSelectMilestone: (m: Milestone | null) => void;
  onAddProof: (m: Milestone) => void;
}

interface MilestoneDetailsViewProps {
  data: MilestoneDetailsData;
  actions: MilestoneDetailsActions;
}

export const MilestoneDetailsView = ({ data, actions }: MilestoneDetailsViewProps) => {
  const { selectedMilestone: m, isLoading } = data || {};

  if (!m) return null;

  const statusLower = m.status?.toString().toLowerCase();
  const isCompleted = statusLower === "completed";

  const proofs = Array.isArray(m.proofs) ? [...m.proofs].reverse() : [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => actions.onSelectMilestone(null)}
          style={styles.backBtn}
        >
          <FontAwesome5
            name="arrow-left"
            size={18}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Milestone Details</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={actions.onRefresh}
            colors={[COLORS.primary]}
          />
        }
      >
        <Text style={styles.title}>{m.title}</Text>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: isCompleted ? COLORS.success + "15" : "#FFF9E6",
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: isCompleted ? COLORS.success : "#B28900" },
            ]}
          >
            {m.status || "Pending"}
          </Text>
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.sectionLabel}>EVIDENCE LOG</Text>
          {!isCompleted && (
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => actions.onAddProof(m)}
            >
              <FontAwesome5 name="camera" size={12} color="white" />
              <Text style={styles.addBtnText}>Add Proof</Text>
            </TouchableOpacity>
          )}
        </View>

        {proofs.length > 0 ? (
          proofs.map((p, i) => (
            <View key={i} style={styles.card}>
              <Image source={{ uri: p.url }} style={styles.image} />
              <View style={styles.cardInfo}>
                <View style={styles.coordRow}>
                  <FontAwesome5
                    name="map-marker-alt"
                    size={10}
                    color={COLORS.primary}
                  />
                  <Text style={styles.locText}>
                    {" "}
                    {p.location || "No GPS Data"}
                  </Text>
                </View>
                <Text style={styles.dateText}>
                  {p.timestamp
                    ? new Date(p.timestamp).toLocaleString()
                    : "Date N/A"}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome5 name="images" size={40} color={COLORS.border} />
            <Text style={styles.emptyText}>No evidence logs found.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  header: {
    marginTop: 50,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 12,
    color: COLORS.textPrimary,
  },
  scrollContent: { padding: 20 },
  title: { fontSize: 24, fontWeight: "800", color: COLORS.textPrimary },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  badgeText: { fontWeight: "800", fontSize: 11, textTransform: "uppercase" },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  sectionLabel: { fontWeight: "800", color: COLORS.textTertiary, fontSize: 12 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addBtnText: { color: "white", fontWeight: "700", fontSize: 13 },
  card: {
    backgroundColor: "white",
    borderRadius: 16,
    marginBottom: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEE",
  },
  image: { width: "100%", height: 200 },
  cardInfo: { padding: 12 },
  coordRow: { flexDirection: "row", alignItems: "center" },
  locText: { fontWeight: "700", color: COLORS.textPrimary, fontSize: 13 },
  dateText: { fontSize: 11, color: COLORS.textTertiary, marginTop: 4 },
  emptyState: { alignItems: "center", marginTop: 40, opacity: 0.5 },
  emptyText: { marginTop: 10, fontWeight: "600", color: COLORS.textTertiary },
});
