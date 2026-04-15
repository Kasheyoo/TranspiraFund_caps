import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import type { AuditTrail, DashboardStats } from "../types";

interface DashboardData {
  stats: DashboardStats;
  recentLogs: AuditTrail[];
  engineerName: string;
  isLoading: boolean;
}

interface DashboardActions {
  onRefresh: () => void;
  onViewAllActivity: () => void;
}

interface DashboardViewProps {
  data: DashboardData;
  actions: DashboardActions;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
};

const formatTimestamp = (seconds: number): string => {
  const date      = new Date(seconds * 1000);
  const now       = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === now.toDateString())       return `Today · ${timeStr}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${timeStr}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` · ${timeStr}`;
};

const getActivityIcon = (action = ""): { name: string; color: string; bg: string } => {
  const a = action.toLowerCase();
  if (a.includes("sign") && a.includes("in"))      return { name: "sign-in-alt",       color: COLORS.primary, bg: COLORS.primarySoft };
  if (a.includes("sign") && a.includes("out"))     return { name: "sign-out-alt",      color: "#6B7280",      bg: "#F3F4F6"          };
  if (a.includes("password"))                      return { name: "key",               color: "#7C3AED",      bg: "#EDE9FE"          };
  if (a.includes("proof") || a.includes("upload")) return { name: "camera",            color: "#0891B2",      bg: "#E0F2FE"          };
  if (a.includes("milestone"))                     return { name: "layer-group",       color: COLORS.warning, bg: COLORS.warningSoft };
  if (a.includes("delay"))                         return { name: "exclamation-circle", color: COLORS.error,  bg: COLORS.errorSoft   };
  if (a.includes("status") || a.includes("update")) return { name: "pen",             color: "#D97706",      bg: "#FEF3C7"          };
  return { name: "history", color: COLORS.primary, bg: COLORS.primarySoft };
};

// ── Main view ─────────────────────────────────────────────────────────────────
export const DashboardView = ({ data, actions }: DashboardViewProps) => {
  const insets = useSafeAreaInsets();
  const { stats, recentLogs, engineerName, isLoading } = data;

  const total     = (stats.progress || 0) + (stats.done || 0) + (stats.delay || 0);
  const firstName = engineerName?.split(" ")[0] || "Engineer";
  const initials  = engineerName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "PE";

  return (
    <View style={[S.root, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={S.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={actions.onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >

        {/* ══ HERO ══════════════════════════════════════════════════ */}
        <View style={S.hero}>
          <View style={S.orb1} /><View style={S.orb2} />

          <View style={S.heroInner}>
            {/* Left: greeting + name + division */}
            <View style={S.heroLeft}>
              <Text style={S.greeting}>{getGreeting()}</Text>
              <Text style={S.name}>{firstName} 👷</Text>
              <View style={S.divisionRow}>
                <FontAwesome5 name="hard-hat" size={10} color="rgba(255,255,255,0.7)" />
                <Text style={S.divisionText}>Construction Services Division</Text>
              </View>
            </View>

            {/* Right: circular avatar */}
            <View style={S.avatar}>
              <Text style={S.avatarText}>{initials}</Text>
            </View>
          </View>
        </View>

        {/* ══ FLOATING STATS CARD ════════════════════════════════════ */}
        <View style={S.statsCard}>
          {/* Header row */}
          <View style={S.statsCardHeader}>
            <Text style={S.statsCardLabel}>PROJECT OVERVIEW</Text>
            {total > 0 && (
              <View style={S.totalPill}>
                <FontAwesome5 name="folder-open" size={9} color={COLORS.primary} />
                <Text style={S.totalPillText}>{total} Total</Text>
              </View>
            )}
          </View>

          {/* 3 stat columns */}
          <View style={S.statsCols}>
            {/* In Progress */}
            <View style={S.statCol}>
              <View style={[S.statIconBox, { backgroundColor: COLORS.primarySoft }]}>
                <FontAwesome5 name="spinner" size={14} color={COLORS.primary} />
              </View>
              <Text style={[S.statNum, { color: COLORS.primary }]}>{stats.progress || 0}</Text>
              <Text style={S.statLabel}>In Progress</Text>
            </View>

            <View style={S.statDivider} />

            {/* Completed */}
            <View style={S.statCol}>
              <View style={[S.statIconBox, { backgroundColor: COLORS.successSoft }]}>
                <FontAwesome5 name="check-circle" size={14} color={COLORS.success} />
              </View>
              <Text style={[S.statNum, { color: COLORS.success }]}>{stats.done || 0}</Text>
              <Text style={S.statLabel}>Completed</Text>
            </View>

            <View style={S.statDivider} />

            {/* Delayed */}
            <View style={S.statCol}>
              <View style={[S.statIconBox, { backgroundColor: COLORS.errorSoft }]}>
                <FontAwesome5 name="exclamation-circle" size={14} color={COLORS.error} />
              </View>
              <Text style={[S.statNum, { color: COLORS.error }]}>{stats.delay || 0}</Text>
              <Text style={S.statLabel}>Delayed</Text>
            </View>
          </View>
        </View>

        {/* ══ RECENT ACTIVITY ════════════════════════════════════════ */}
        <View style={S.activityCard}>
          {/* Header */}
          <View style={S.activityHeader}>
            <View>
              <Text style={S.activityTitle}>Recent Activity</Text>
              <Text style={S.activitySub}>Your latest field actions</Text>
            </View>
            <TouchableOpacity
              onPress={actions.onViewAllActivity}
              style={S.seeAllBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={S.seeAllText}>See All</Text>
              <FontAwesome5 name="chevron-right" size={10} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Log entries */}
          {recentLogs && recentLogs.length > 0 ? (
            recentLogs.map((log, i) => {
              const icon   = getActivityIcon(log.action);
              const isLast = i === recentLogs.length - 1;
              return (
                <View
                  key={log.id}
                  style={[S.logRow, isLast && S.logRowLast]}
                >
                  <View style={[S.logIcon, { backgroundColor: icon.bg }]}>
                    <FontAwesome5 name={icon.name} size={13} color={icon.color} />
                  </View>
                  <View style={S.logBody}>
                    <Text style={S.logAction}>{log.action}</Text>
                    {log.details ? (
                      <Text style={S.logDetail} numberOfLines={1}>{log.details}</Text>
                    ) : null}
                  </View>
                  <Text style={S.logTime}>
                    {log.timestamp?.seconds ? formatTimestamp(log.timestamp.seconds) : "Recently"}
                  </Text>
                </View>
              );
            })
          ) : (
            <View style={S.emptyBox}>
              <View style={S.emptyIconBox}>
                <FontAwesome5 name="clipboard-list" size={22} color={COLORS.textTertiary} />
              </View>
              <Text style={S.emptyTitle}>No Recent Activity</Text>
              <Text style={S.emptyBody}>Pull down to refresh your activity log.</Text>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root:   { flex: 1, backgroundColor: COLORS.background },
  scroll: { paddingBottom: 140 },

  // ── Hero ──────────────────────────────────────────────────────
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 36,
    overflow: "hidden",
  },
  orb1: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)", top: -70, right: -60 },
  orb2: { position: "absolute", width: 110, height: 110, borderRadius: 55,  backgroundColor: "rgba(255,255,255,0.04)", bottom: -35, left: -15 },

  heroInner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroLeft: { flex: 1, paddingRight: 16 },

  greeting:     { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.7)", marginBottom: 2 },
  name:         { fontSize: 28, fontWeight: "900", color: "#fff", marginBottom: 10 },
  divisionRow:  { flexDirection: "row", alignItems: "center", gap: 6 },
  divisionText: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.75)" },

  // Avatar — proper circle
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2.5, borderColor: "rgba(255,255,255,0.4)",
    flexShrink: 0,
  },
  avatarText: { fontSize: 18, fontWeight: "900", color: "#fff" },

  // ── Floating stats card ────────────────────────────────────────
  statsCard: {
    marginHorizontal: 18,
    marginTop: -20,
    backgroundColor: COLORS.surface,
    borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 6, shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 14,
    marginBottom: 16,
  },
  statsCardHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  statsCardLabel: {
    fontSize: 10, fontWeight: "900", color: COLORS.textTertiary, letterSpacing: 0.8,
  },
  totalPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9,
    borderWidth: 1, borderColor: COLORS.accentBorder,
  },
  totalPillText: { fontSize: 11, fontWeight: "800", color: COLORS.primary },

  statsCols:  { flexDirection: "row", alignItems: "center" },
  statCol:    { flex: 1, alignItems: "center", gap: 6 },
  statDivider:{ width: 1, height: 52, backgroundColor: COLORS.border, marginHorizontal: 4 },
  statIconBox:{ width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  statNum:    { fontSize: 26, fontWeight: "900" },
  statLabel:  { fontSize: 10, fontWeight: "700", color: COLORS.textSecondary, textAlign: "center" },

  // ── Recent Activity ────────────────────────────────────────────
  activityCard: {
    marginHorizontal: 18,
    backgroundColor: COLORS.surface,
    borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  activityHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 16,
  },
  activityTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary },
  activitySub:   { fontSize: 11, color: COLORS.textTertiary, marginTop: 2, fontWeight: "500" },
  seeAllBtn:  { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  seeAllText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },

  logRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  logRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  logIcon: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  logBody:   { flex: 1 },
  logAction: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary, lineHeight: 17 },
  logDetail: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontWeight: "500" },
  logTime:   { fontSize: 10, color: COLORS.textTertiary, fontWeight: "600", flexShrink: 0 },

  // Empty state
  emptyBox: { alignItems: "center", paddingVertical: 24, gap: 8 },
  emptyIconBox: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  emptyBody:  { fontSize: 12, color: COLORS.textSecondary, textAlign: "center" },
});
