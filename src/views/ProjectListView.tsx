import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import { ProjectModel } from "../models/ProjectModel";
import type { Project } from "../types";

interface ProjectListData {
  projects: Project[];
  allProjects: Project[];
  isLoading: boolean;
  isRefreshing: boolean;
  activeFilter: string;
}

interface ProjectListActions {
  onSelectProject: (id: string) => void;
  loadProjects: () => void;
  setFilter: (filter: string) => void;
  onRefresh: () => void;
}

interface ProjectListViewProps {
  data: ProjectListData;
  actions: ProjectListActions;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { accent: string; bg: string; text: string; icon: string }> = {
  "In Progress": { accent: COLORS.primary,  bg: COLORS.primarySoft, text: COLORS.primary,  icon: "spinner"            },
  "Completed":   { accent: COLORS.success,  bg: COLORS.successSoft, text: COLORS.success,  icon: "check-circle"       },
  "Delayed":     { accent: COLORS.error,    bg: COLORS.errorSoft,   text: COLORS.error,    icon: "exclamation-circle" },
  "Pending":     { accent: COLORS.warning,  bg: COLORS.warningSoft, text: COLORS.warning,  icon: "clock"              },
  "Draft":       { accent: "#64748B",       bg: "#F1F5F9",          text: "#64748B",       icon: "file-alt"           },
  "For Mayor":   { accent: "#7C3AED",       bg: "#EDE9FE",          text: "#7C3AED",       icon: "user-tie"           },
};
const DEFAULT_SC = { accent: COLORS.textTertiary, bg: COLORS.track, text: COLORS.textTertiary, icon: "circle" };

// Statuses that all map to "In Progress" on mobile
const ACTIVE_ALIASES: Record<string, true> = { "Draft": true, "For Mayor": true, "Ongoing": true, "ongoing": true };
const displayStatus = (raw: string) => ACTIVE_ALIASES[raw] ? "In Progress" : raw;

const FILTERS = ["All", "In Progress", "Completed", "Delayed"];

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatBudget = (v?: number) => {
  if (!v) return null;
  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `₱${(v / 1_000).toFixed(1)}K`;
  return `₱${v.toLocaleString()}`;
};

// ── Summary stats bar ─────────────────────────────────────────────────────────
const StatsBar = ({ projects }: { projects: Project[] }) => {
  const counts = useMemo(() => {
    const c: Record<string, number> = { "In Progress": 0, "Completed": 0, "Delayed": 0 };
    projects.forEach((p) => {
      const display = displayStatus(ProjectModel.deriveStatus(p));
      if (c[display] !== undefined) c[display]++;
    });
    return c;
  }, [projects]);

  return (
    <View style={statsStyles.row}>
      {(["In Progress", "Completed", "Delayed"] as const).map((s) => {
        const sc = STATUS_MAP[s];
        return (
          <View key={s} style={[statsStyles.cell, { borderTopColor: sc.accent }]}>
            <Text style={[statsStyles.num, { color: sc.accent }]}>{counts[s]}</Text>
            <Text style={statsStyles.label}>{s}</Text>
          </View>
        );
      })}
    </View>
  );
};

const statsStyles = StyleSheet.create({
  row: { flexDirection: "row", marginHorizontal: 18, marginTop: 24, marginBottom: 14, gap: 8 },
  cell: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderTopWidth: 3,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
  },
  num:   { fontSize: 20, fontWeight: "900", color: COLORS.textPrimary },
  label: { fontSize: 10, fontWeight: "700", color: COLORS.textTertiary, marginTop: 2 },
});

// ── Project card ──────────────────────────────────────────────────────────────
const ProjectCard = ({ item, onPress }: { item: Project; onPress: () => void }) => {
  const status = displayStatus(ProjectModel.deriveStatus(item));
  const sc     = STATUS_MAP[status] || DEFAULT_SC;
  const progress = item.progress || 0;
  const budget   = formatBudget(item.contractAmount ?? item.budget);

  const completedMs = item.milestones?.filter(
    (m) => m.status?.toString().toLowerCase() === "completed",
  ).length ?? 0;
  const totalMs = item.milestones?.length ?? 0;

  return (
    <TouchableOpacity style={S.card} onPress={onPress} activeOpacity={0.85}>
      {/* Status accent bar */}
      <View style={[S.accentBar, { backgroundColor: sc.accent }]} />

      <View style={S.cardBody}>
        {/* ── Top row: icon + title + badge ── */}
        <View style={S.topRow}>
          <View style={[S.iconBox, { backgroundColor: sc.bg }]}>
            <FontAwesome5 name="hard-hat" size={17} color={sc.accent} />
          </View>

          <View style={S.titleCol}>
            <Text style={S.cardTitle} numberOfLines={2}>
              {item.title || item.projectName || "Untitled Project"}
            </Text>
          </View>

          <View style={[S.badge, { backgroundColor: sc.bg }]}>
            <Text style={[S.badgeText, { color: sc.text }]}>{status}</Text>
          </View>
        </View>

        {/* ── Meta chips ── */}
        <View style={S.chipsRow}>
          {item.location ? (
            <Chip icon="map-marker-alt" label={item.location} maxWidth={130} />
          ) : null}
          {item.fundingSource ? (
            <Chip icon="hand-holding-usd" label={item.fundingSource} maxWidth={120} color={COLORS.primary} soft />
          ) : null}
          {budget ? (
            <Chip icon="coins" label={budget} color={COLORS.success} soft />
          ) : null}
          {item.completionDate ? (
            <Chip icon="calendar-check" label={item.completionDate} />
          ) : null}
        </View>

        {/* ── Progress ── */}
        <View style={S.progressSection}>
          <View style={S.progressLabelRow}>
            <View style={S.msRow}>
              <FontAwesome5 name="layer-group" size={9} color={COLORS.textTertiary} />
              <Text style={S.msText}>{completedMs}/{totalMs} milestones</Text>
            </View>
            <Text style={[S.pctText, { color: sc.accent }]}>{progress}%</Text>
          </View>
          <View style={S.track}>
            <View style={[S.fill, { width: `${progress}%`, backgroundColor: sc.accent }]} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Inline chip component ─────────────────────────────────────────────────────
const Chip = ({
  icon, label, color, soft, maxWidth,
}: { icon: string; label: string; color?: string; soft?: boolean; maxWidth?: number }) => (
  <View style={[
    S.chip,
    soft && { backgroundColor: (color || COLORS.textTertiary) + "18", borderColor: (color || COLORS.textTertiary) + "40" },
    maxWidth ? { maxWidth } : {},
  ]}>
    <FontAwesome5 name={icon} size={9} color={color || COLORS.textTertiary} />
    <Text style={[S.chipText, color && { color }]} numberOfLines={1}>{label}</Text>
  </View>
);

// ── Main view ─────────────────────────────────────────────────────────────────
export const ProjectListView = ({ data, actions }: ProjectListViewProps) => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const base = data.activeFilter === "All"
      ? data.projects
      : data.projects.filter((p) => displayStatus(ProjectModel.deriveStatus(p)) === data.activeFilter);
    if (!search.trim()) return base;
    const q = search.toLowerCase();
    return base.filter((p) =>
      (p.title || p.projectName || "").toLowerCase().includes(q) ||
      (p.engineer || "").toLowerCase().includes(q) ||
      (p.location || p.barangay || "").toLowerCase().includes(q) ||
      (p.fundingSource || "").toLowerCase().includes(q),
    );
  }, [data.projects, data.activeFilter, search]);

  return (
    <View style={S.root}>

      {/* ══ TEAL HERO HEADER ══════════════════════════════════════ */}
      <View style={[S.hero, { paddingTop: insets.top + 16 }]}>
        <View style={S.heroOrb1} /><View style={S.heroOrb2} />
        <View style={S.heroContent}>
          <View style={S.heroRow}>
            <View>
              <Text style={S.heroLabel}>CONSTRUCTION SERVICES DIVISION</Text>
              <Text style={S.heroTitle}>Projects</Text>
            </View>
            <View style={S.liveChip}>
              <View style={S.liveDot} />
              <Text style={S.liveText}>LIVE</Text>
            </View>
          </View>
          {/* Inline search inside hero */}
          <View style={S.searchBar}>
            <FontAwesome5 name="search" size={13} color={COLORS.textTertiary} />
            <TextInput
              style={S.searchInput}
              placeholder="Search projects, engineer, location…"
              placeholderTextColor={COLORS.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoCorrect={false}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <FontAwesome5 name="times-circle" size={14} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* ══ STATS BAR ═══════════════════════════════════════════ */}
      <StatsBar projects={data.allProjects} />

      {/* ══ FILTER TABS ═════════════════════════════════════════ */}
      <View style={S.filterWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.filterScroll}>
          {FILTERS.map((f) => {
            const active = data.activeFilter === f;
            const sc = STATUS_MAP[f];
            return (
              <TouchableOpacity
                key={f}
                onPress={() => actions.setFilter(f)}
                style={[S.tab, active && { backgroundColor: sc ? sc.accent : COLORS.primary, borderColor: sc ? sc.accent : COLORS.primary }]}
                activeOpacity={0.8}
              >
                {f !== "All" && sc && (
                  <View style={[S.tabDot, { backgroundColor: active ? "rgba(255,255,255,0.85)" : sc.accent }]} />
                )}
                <Text style={[S.tabText, active && { color: "#fff", fontWeight: "800" }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ══ LIST ════════════════════════════════════════════════ */}
      {data.isLoading && data.projects.length === 0 ? (
        <View style={S.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={S.loadingText}>Loading projects…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <ProjectCard item={item} onPress={() => actions.onSelectProject(item.id)} />
          )}
          contentContainerStyle={[S.listContent, { paddingBottom: insets.bottom + 110 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={data.isRefreshing}
              onRefresh={actions.onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={S.emptyBox}>
              <View style={S.emptyIconBox}>
                <FontAwesome5 name="folder-open" size={28} color={COLORS.textTertiary} />
              </View>
              <Text style={S.emptyTitle}>No Projects Found</Text>
              <Text style={S.emptyBody}>
                {search ? "Try a different search term." : `No "${data.activeFilter}" projects yet.`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Hero header
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22, paddingBottom: 22, overflow: "hidden",
    marginBottom: -12,
  },
  heroOrb1: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.06)", top: -50, right: -40 },
  heroOrb2: { position: "absolute", width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.04)", bottom: -30, left: -10 },
  heroContent: { zIndex: 1 },
  heroRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  heroLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.65)", letterSpacing: 0.8, marginBottom: 2 },
  heroTitle: { fontSize: 28, fontWeight: "900", color: "#fff" },
  liveChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.18)", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 5, marginTop: 4,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#6EE7B7" },
  liveText: { fontSize: 10, fontWeight: "900", color: "#fff", letterSpacing: 0.5 },

  // Search (inside hero)
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#fff", borderRadius: 14,
    paddingHorizontal: 14, height: 46,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.06)",
    elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.textPrimary, paddingVertical: 0 },

  // Filter tabs
  filterWrap:   { marginBottom: 6 },
  filterScroll: { paddingHorizontal: 24, gap: 7 },
  tab: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border,
  },
  tabDot:  { width: 6, height: 6, borderRadius: 3 },
  tabText: { fontSize: 12, fontWeight: "700", color: COLORS.textSecondary },

  // List
  listContent: { paddingHorizontal: 20, paddingTop: 16 },

  // Card
  card: {
    flexDirection: "row", backgroundColor: COLORS.surface,
    borderRadius: 18, marginBottom: 12, overflow: "hidden",
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
  },
  accentBar: { width: 4 },
  cardBody:  { flex: 1, padding: 15 },

  topRow:    { flexDirection: "row", alignItems: "flex-start", gap: 11, marginBottom: 10 },
  iconBox: {
    width: 42, height: 42, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  titleCol:    { flex: 1 },
  cardTitle:   { fontSize: 14, fontWeight: "800", color: COLORS.textPrimary, lineHeight: 19, marginBottom: 3 },
  engineerRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  engineerText: { fontSize: 11, color: COLORS.textTertiary, fontWeight: "600", flex: 1 },
  badge: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 7, flexShrink: 0,
  },
  badgeText: { fontSize: 9, fontWeight: "900", textTransform: "uppercase", letterSpacing: 0.4 },

  // Chips
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 10 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: COLORS.background, borderRadius: 7,
    paddingHorizontal: 7, paddingVertical: 3,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: "600", flexShrink: 1 },

  // Progress
  progressSection: {},
  progressLabelRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6,
  },
  msRow:    { flexDirection: "row", alignItems: "center", gap: 5 },
  msText:   { fontSize: 11, color: COLORS.textTertiary, fontWeight: "600" },
  pctText:  { fontSize: 13, fontWeight: "900" },
  track:    { height: 5, backgroundColor: COLORS.track, borderRadius: 3, overflow: "hidden" },
  fill:     { height: "100%", borderRadius: 3 },

  // Loading / empty
  loadingBox:  { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  loadingText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: "600" },
  emptyBox:    { alignItems: "center", paddingTop: 64, paddingHorizontal: 32 },
  emptyIconBox: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center", marginBottom: 16,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 6 },
  emptyBody:  { fontSize: 14, color: COLORS.textSecondary, textAlign: "center", lineHeight: 20 },
});
