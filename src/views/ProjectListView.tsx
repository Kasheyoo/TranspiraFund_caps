import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, STYLES } from "../constants";
import type { Project } from "../types";

interface ProjectListData {
  projects: Project[];
  isLoading: boolean;
  activeFilter: string;
}

interface ProjectListActions {
  onSelectProject: (id: string) => void;
  loadProjects: () => void;
  setFilter: (filter: string) => void;
}

interface ProjectListViewProps {
  data: ProjectListData;
  actions: ProjectListActions;
}

export const ProjectListView = ({ data, actions }: ProjectListViewProps) => {
  const insets = useSafeAreaInsets();
  const filters = ["All", "In Progress", "Completed", "Delayed"];

  const renderItem = ({ item }: { item: Project }) => (
    <TouchableOpacity
      style={[STYLES.card, styles.projectCard]}
      onPress={() => actions.onSelectProject(item.id)}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <FontAwesome5 name="city" size={18} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {item.projectTitle || item.title}
          </Text>
          <View style={styles.infoRow}>
            <FontAwesome5
              name="user-tie"
              size={10}
              color={COLORS.textTertiary}
            />
            <Text style={styles.infoText}>{item.engineer || "Unassigned"}</Text>
          </View>
        </View>
        <View
          style={[
            styles.badge,
            {
              backgroundColor:
                item.status === "Completed" ? COLORS.successSoft : "#FFF9E6",
            },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              {
                color: item.status === "Completed" ? COLORS.success : "#B28900",
              },
            ]}
          >
            {item.status || "Pending"}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.statsRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.statLabel}>LOCATION</Text>
          <Text style={styles.statValue} numberOfLines={1}>
            {item.location || "Not Set"}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.statLabel}>PROGRESS</Text>
          <Text style={[styles.statValue, { color: COLORS.primary }]}>
            {item.progress || 0}%
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={STYLES.container}>
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.headerTitle}>Projects List</Text>
        <Text style={styles.headerSub}>
          Monitor construction status and progress
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => actions.setFilter(f)}
              style={[
                styles.filterTab,
                data.activeFilter === f && styles.filterTabActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  data.activeFilter === f && styles.filterTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={data.projects}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={data.isLoading}
            onRefresh={actions.loadProjects}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <FontAwesome5
              name="folder-open"
              size={40}
              color={COLORS.background}
            />
            <Text style={styles.empty}>No projects match this filter.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, marginBottom: 10 },
  headerTitle: { fontSize: 28, fontWeight: "900", color: COLORS.textPrimary },
  headerSub: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  filterContainer: { marginBottom: 10, height: 50 },
  filterTab: {
    paddingHorizontal: 16,
    height: 40,
    justifyContent: "center",
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterTabActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary },
  filterTextActive: { color: "white" },
  projectCard: { marginBottom: 16, padding: 20 },
  cardHeader: { flexDirection: "row", gap: 14, alignItems: "center" },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  infoText: { fontSize: 12, color: COLORS.textTertiary, fontWeight: "600" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  divider: { height: 1, backgroundColor: "#F1F3F5", marginVertical: 16 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.textTertiary,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  statValue: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  emptyBox: { alignItems: "center", marginTop: 60 },
  empty: {
    textAlign: "center",
    marginTop: 16,
    color: COLORS.textTertiary,
    fontStyle: "italic",
  },
});
