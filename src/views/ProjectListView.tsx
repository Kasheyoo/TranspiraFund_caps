import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";
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

const STATUS_COLORS: Record<string, { accent: string; bg: string; text: string }> = {
  "In Progress": { accent: COLORS.primary,   bg: COLORS.primarySoft,  text: COLORS.primary   },
  "Completed":   { accent: COLORS.success,   bg: COLORS.successSoft,  text: COLORS.success   },
  "Delayed":     { accent: COLORS.error,     bg: COLORS.errorSoft,    text: COLORS.error     },
  "Pending":     { accent: COLORS.warning,   bg: COLORS.warningSoft,  text: COLORS.warning   },
};

const DEFAULT_STATUS = { accent: COLORS.textTertiary, bg: COLORS.track, text: COLORS.textTertiary };

const FILTERS = ["All", "In Progress", "Completed", "Delayed", "Pending"];

const formatBudget = (amount?: number): string => {
  if (!amount) return null as unknown as string;
  if (amount >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₱${(amount / 1_000).toFixed(0)}K`;
  return `₱${amount.toLocaleString()}`;
};

const ProjectCard = ({
  item,
  onPress,
}: {
  item: Project;
  onPress: () => void;
}) => {
  const status = item.status || "Pending";
  const sc = STATUS_COLORS[status] || DEFAULT_STATUS;
  const progress = item.progress || 0;
  const budget = formatBudget(item.budget || item.contractAmount);
  const completedMilestones = item.milestones?.filter(
    (m) => m.status?.toString().toLowerCase() === "completed",
  ).length ?? 0;
  const totalMilestones = item.milestones?.length ?? 0;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.88}
    >
      {/* Left accent bar */}
      <View style={[styles.accentBar, { backgroundColor: sc.accent }]} />

      <View style={styles.cardInner}>
        {/* Header row */}
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: sc.bg }]}>
            <FontAwesome5 name="hard-hat" size={18} color={sc.accent} />
          </View>

          <View style={{ flex: 1, marginRight: 8 }}>
            <Text style={styles.cardTitle} numberOfLines={2}>
              {item.projectTitle || item.title || "Untitled Project"}
            </Text>
            <View style={styles.metaRow}>
              <FontAwesome5 name="user-tie" size={10} color={COLORS.textTertiary} />
              <Text style={styles.metaText} numberOfLines={1}>
                {item.engineer || "Unassigned"}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
            <Text style={[styles.statusText, { color: sc.text }]}>
              {status}
            </Text>
          </View>
        </View>

        {/* Info chips row */}
        <View style={styles.chipsRow}>
          {item.location ? (
            <View style={styles.chip}>
              <FontAwesome5 name="map-marker-alt" size={9} color={COLORS.textTertiary} />
              <Text style={styles.chipText} numberOfLines={1}>{item.location}</Text>
            </View>
          ) : null}

          {item.completionDate ? (
            <View style={styles.chip}>
              <FontAwesome5 name="calendar-check" size={9} color={COLORS.textTertiary} />
              <Text style={styles.chipText}>{item.completionDate}</Text>
            </View>
          ) : null}

          {budget ? (
            <View style={[styles.chip, styles.budgetChip]}>
              <FontAwesome5 name="coins" size={9} color={COLORS.primary} />
              <Text style={[styles.chipText, { color: COLORS.primary, fontWeight: "800" }]}>
                {budget}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Progress row */}
        <View style={styles.progressSection}>
          <View style={styles.progressLabelRow}>
            <View style={styles.milestoneRow}>
              <FontAwesome5 name="tasks" size={9} color={COLORS.textTertiary} />
              <Text style={styles.milestoneText}>
                {completedMilestones}/{totalMilestones} milestones
              </Text>
            </View>
            <Text style={[styles.progressPct, { color: sc.accent }]}>
              {progress}%
            </Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${progress}%`,
                  backgroundColor: sc.accent,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const ProjectListView = ({ data, actions }: ProjectListViewProps) => {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");

  const searchedProjects = useMemo(() => {
    const base =
      data.activeFilter === "All"
        ? data.projects
        : data.projects.filter((p) => p.status === data.activeFilter);
    if (!searchQuery.trim()) return base;
    const q = searchQuery.toLowerCase();
    return base.filter(
      (p) =>
        (p.projectTitle || p.title || "").toLowerCase().includes(q) ||
        (p.engineer || "").toLowerCase().includes(q) ||
        (p.location || "").toLowerCase().includes(q),
    );
  }, [data.projects, data.activeFilter, searchQuery]);

  return (
    <View style={[styles.root, { backgroundColor: COLORS.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Projects</Text>
          <View style={styles.liveChip}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
        </View>
        <Text style={styles.headerSub}>
          {data.projects.length} project{data.projects.length !== 1 ? "s" : ""} · synced from web
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <FontAwesome5 name="search" size={13} color={COLORS.textTertiary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by title, engineer, location…"
            placeholderTextColor={COLORS.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <FontAwesome5 name="times-circle" size={14} color={COLORS.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {FILTERS.map((f) => {
            const isActive = data.activeFilter === f;
            const sc = STATUS_COLORS[f];
            return (
              <TouchableOpacity
                key={f}
                onPress={() => actions.setFilter(f)}
                style={[
                  styles.filterTab,
                  isActive && {
                    backgroundColor: sc ? sc.accent : COLORS.primary,
                    borderColor: sc ? sc.accent : COLORS.primary,
                  },
                ]}
                activeOpacity={0.8}
              >
                {f !== "All" && sc && (
                  <View
                    style={[
                      styles.filterDot,
                      { backgroundColor: isActive ? "rgba(255,255,255,0.8)" : sc.accent },
                    ]}
                  />
                )}
                <Text
                  style={[
                    styles.filterText,
                    isActive && { color: "#fff", fontWeight: "800" },
                  ]}
                >
                  {f}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      {data.isLoading && data.projects.length === 0 ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading projects…</Text>
        </View>
      ) : (
        <FlatList
          data={searchedProjects}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ProjectCard
              item={item}
              onPress={() => actions.onSelectProject(item.id)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <FontAwesome5 name="folder-open" size={28} color={COLORS.textTertiary} />
              </View>
              <Text style={styles.emptyTitle}>No Projects Found</Text>
              <Text style={styles.emptyBody}>
                {searchQuery
                  ? "No results match your search."
                  : `No projects with status "${data.activeFilter}".`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  header: { paddingHorizontal: 24, marginBottom: 16 },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  headerTitle: { fontSize: 30, fontWeight: "900", color: COLORS.textPrimary },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: COLORS.successSoft,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#6EE7B7",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: COLORS.success },
  liveText: { fontSize: 11, fontWeight: "800", color: COLORS.success },
  headerSub: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "500" },

  // Search
  searchWrap: { paddingHorizontal: 24, marginBottom: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },

  // Filters
  filterWrap: { marginBottom: 8 },
  filterScroll: { paddingHorizontal: 24, gap: 8 },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  filterDot: { width: 6, height: 6, borderRadius: 3 },
  filterText: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary },

  // List
  listContent: { paddingHorizontal: 24, paddingTop: 12, paddingBottom: 110 },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  accentBar: { width: 4, borderRadius: 0 },
  cardInner: { flex: 1, padding: 16 },

  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.textPrimary,
    lineHeight: 20,
    marginBottom: 4,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaText: { fontSize: 12, color: COLORS.textTertiary, fontWeight: "600", flex: 1 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    flexShrink: 0,
  },
  statusText: { fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.3 },

  // Chips
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.background,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 160,
  },
  budgetChip: {
    backgroundColor: COLORS.primarySoft,
    borderColor: COLORS.accentBorder,
  },
  chipText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
    flexShrink: 1,
  },

  // Progress
  progressSection: {},
  progressLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  milestoneRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  milestoneText: { fontSize: 11, color: COLORS.textTertiary, fontWeight: "600" },
  progressPct: { fontSize: 13, fontWeight: "800" },
  progressTrack: {
    height: 5,
    backgroundColor: COLORS.track,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },

  // Loading
  loadingState: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "600" },

  // Empty
  emptyState: { alignItems: "center", paddingTop: 60, paddingHorizontal: 24 },
  emptyIconBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 6 },
  emptyBody: { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20 },
});
