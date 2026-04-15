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
  const date = new Date(seconds * 1000);
  const now  = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === now.toDateString())       return `Today · ${timeStr}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${timeStr}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` · ${timeStr}`;
};

const getActivityIcon = (action = ""): { name: string; color: string; bg: string } => {
  const a = action.toLowerCase();
  if (a.includes("sign") && a.includes("in"))  return { name: "sign-in-alt",      color: COLORS.primary, bg: COLORS.primarySoft };
  if (a.includes("sign") && a.includes("out")) return { name: "sign-out-alt",     color: "#6B7280",      bg: "#F3F4F6"          };
  if (a.includes("password"))                  return { name: "key",              color: "#7C3AED",      bg: "#EDE9FE"          };
  if (a.includes("proof") || a.includes("upload")) return { name: "camera",       color: "#0891B2",      bg: "#E0F2FE"          };
  if (a.includes("milestone"))                 return { name: "layer-group",      color: COLORS.warning, bg: COLORS.warningSoft };
  if (a.includes("delay"))                     return { name: "exclamation-circle",color: COLORS.error,  bg: COLORS.errorSoft   };
  if (a.includes("status") || a.includes("update")) return { name: "pen",         color: "#D97706",      bg: "#FEF3C7"          };
  return { name: "history", color: COLORS.primary, bg: COLORS.primarySoft };
};

// ── Stat card ─────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: string;
  count: number;
  label: string;
  color: string;
  bg: string;
}

const StatCard = ({ icon, count, label, color, bg }: StatCardProps) => (
  <View style={[S.statCard, { backgroundColor: bg }]}>
    <View style={[S.statIconBox, { backgroundColor: color + "20" }]}>
      <FontAwesome5 name={icon} size={15} color={color} />
    </View>
    <Text style={[S.statNum, { color }]}>{count}</Text>
    <Text style={S.statLabel}>{label}</Text>
  </View>
);

// ── Main view ─────────────────────────────────────────────────────────────────
export const DashboardView = ({ data, actions }: DashboardViewProps) => {
  const insets = useSafeAreaInsets();
  const { stats, recentLogs, engineerName, isLoading } = data;
  const total = (stats.progress || 0) + (stats.done || 0) + (stats.delay || 0) + (stats.draft || 0) + (stats.forMayor || 0);
  const firstName = engineerName?.split(" ")[0] || "Engineer";

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
        {/* ══ HERO HEADER ══════════════════════════════════════════ */}
        <View style={S.hero}>
          <View style={S.heroOrb1} /><View style={S.heroOrb2} />

          {/* Greeting */}
          <View style={S.heroContent}>
            <View style={S.greetRow}>
              <View>
                <Text style={S.greeting}>{getGreeting()},</Text>
                <Text style={S.name}>{firstName} 👷</Text>
              </View>
              <View style={S.avatarBox}>
                <Text style={S.avatarText}>
                  {engineerName?.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "PE"}
                </Text>
              </View>
            </View>

            {/* Role chip */}
            <View style={S.roleChip}>
              <FontAwesome5 name="hard-hat" size={10} color="rgba(255,255,255,0.8)" />
              <Text style={S.roleText}>Project Engineer · Const. Services Div.</Text>
            </View>
          </View>
        </View>

        {/* ══ STATS GRID ═══════════════════════════════════════════ */}
        <View style={S.statsSection}>
          {/* Total badge */}
          {total > 0 && (
            <View style={S.totalRow}>
              <Text style={S.totalLabel}>PROJECT OVERVIEW</Text>
              <View style={S.totalBadge}>
                <FontAwesome5 name="folder-open" size={10} color={COLORS.primary} />
                <Text style={S.totalBadgeText}>{total} Total</Text>
              </View>
            </View>
          )}

          <View style={S.statsRow}>
            <StatCard icon="spinner"            count={stats.progress  || 0} label="IN PROGRESS" color={COLORS.primary} bg={COLORS.primarySoft} />
            <StatCard icon="check-circle"       count={stats.done      || 0} label="COMPLETED"   color={COLORS.success} bg={COLORS.successSoft} />
            <StatCard icon="exclamation-circle" count={stats.delay     || 0} label="DELAYED"     color={COLORS.error}   bg={COLORS.errorSoft}   />
          </View>
          {/* Draft / For Mayor — only shown when count > 0 */}
          {((stats.draft || 0) + (stats.forMayor || 0)) > 0 && (
            <View style={[S.statsRow, { marginTop: 8 }]}>
              {(stats.draft || 0) > 0 && (
                <StatCard icon="file-alt"  count={stats.draft     || 0} label="DRAFT"     color="#64748B" bg="#F1F5F9" />
              )}
              {(stats.forMayor || 0) > 0 && (
                <StatCard icon="user-tie"  count={stats.forMayor  || 0} label="FOR MAYOR" color="#7C3AED" bg="#EDE9FE" />
              )}
            </View>
          )}
        </View>

        {/* ══ QUICK INFO STRIP ═══════════════════════════════════ */}
        <View style={S.infoStrip}>
          <View style={S.infoItem}>
            <FontAwesome5 name="building" size={12} color={COLORS.primary} />
            <Text style={S.infoText}>Construction Services Division</Text>
          </View>
          <View style={S.infoDot} />
          <View style={S.infoItem}>
            <FontAwesome5 name="wifi" size={11} color={COLORS.success} />
            <Text style={[S.infoText, { color: COLORS.success }]}>Live Sync</Text>
          </View>
        </View>

        {/* ══ RECENT ACTIVITY ════════════════════════════════════ */}
        <View style={S.activitySection}>
          <View style={S.activityHeader}>
            <Text style={S.activityTitle}>Recent Activity</Text>
            <TouchableOpacity
              onPress={actions.onViewAllActivity}
              style={S.seeAllBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={S.seeAllText}>See All</Text>
              <FontAwesome5 name="angle-right" size={12} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {recentLogs && recentLogs.length > 0 ? (
            recentLogs.map((log, i) => {
              const icon = getActivityIcon(log.action);
              const isLast = i === recentLogs.length - 1;
              return (
                <View key={log.id} style={[S.activityCard, isLast && { marginBottom: 0 }]}>
                  <View style={[S.activityIconBox, { backgroundColor: icon.bg }]}>
                    <FontAwesome5 name={icon.name} size={13} color={icon.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.activityAction}>{log.action}</Text>
                    {log.details ? (
                      <Text style={S.activityDetail} numberOfLines={1}>{log.details}</Text>
                    ) : null}
                    <Text style={S.activityTime}>
                      {log.timestamp?.seconds ? formatTimestamp(log.timestamp.seconds) : "Recently"}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={S.emptyActivity}>
              <View style={S.emptyIconBox}>
                <FontAwesome5 name="clipboard-list" size={24} color={COLORS.textTertiary} />
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

  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    overflow: "hidden",
    marginBottom: -16,
  },
  heroOrb1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.06)", top: -60, right: -50 },
  heroOrb2: { position: "absolute", width: 120, height: 120, borderRadius: 60,  backgroundColor: "rgba(255,255,255,0.04)", bottom: -40, left: -20 },
  heroContent: { zIndex: 1 },

  greetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  greeting: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  name:     { fontSize: 26, fontWeight: "900", color: "#fff", marginTop: 2 },

  avatarBox: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
  },
  avatarText: { fontSize: 15, fontWeight: "900", color: "#fff" },

  roleChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignSelf: "flex-start",
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 10,
  },
  roleText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.9)" },

  // Stats
  statsSection: {
    marginHorizontal: 18, marginTop: 28, marginBottom: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
  },
  totalRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 14,
  },
  totalLabel: {
    fontSize: 10, fontWeight: "900", color: COLORS.textTertiary, letterSpacing: 0.8,
  },
  totalBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: COLORS.primarySoft, paddingHorizontal: 9,
    paddingVertical: 4, borderRadius: 9,
    borderWidth: 1, borderColor: COLORS.accentBorder,
  },
  totalBadgeText: { fontSize: 11, fontWeight: "800", color: COLORS.primary },

  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1, borderRadius: 16, paddingVertical: 14,
    paddingHorizontal: 8, alignItems: "center",
    gap: 6,
  },
  statIconBox: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  statNum:   { fontSize: 24, fontWeight: "900", color: COLORS.textPrimary },
  statLabel: {
    fontSize: 9, fontWeight: "800", color: COLORS.textSecondary,
    letterSpacing: 0.5, textAlign: "center",
  },

  // Info strip
  infoStrip: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 18, marginBottom: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border, gap: 10,
  },
  infoItem:  { flexDirection: "row", alignItems: "center", gap: 6 },
  infoText:  { fontSize: 11, fontWeight: "600", color: COLORS.textSecondary },
  infoDot:   { width: 3, height: 3, borderRadius: 2, backgroundColor: COLORS.border },

  // Activity
  activitySection: {
    marginHorizontal: 18,
    backgroundColor: COLORS.surface,
    borderRadius: 22, padding: 18,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  activityHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 16,
  },
  activityTitle: { fontSize: 16, fontWeight: "800", color: COLORS.textPrimary },
  seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  seeAllText: { fontSize: 13, fontWeight: "700", color: COLORS.primary },

  activityCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    marginBottom: 2,
  },
  activityIconBox: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  activityAction: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary, lineHeight: 18 },
  activityDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1, fontWeight: "500" },
  activityTime:   { fontSize: 11, color: COLORS.textTertiary, marginTop: 3, fontWeight: "600" },

  // Empty
  emptyActivity: { alignItems: "center", paddingVertical: 28, gap: 8 },
  emptyIconBox: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  emptyBody:  { fontSize: 12, color: COLORS.textSecondary, textAlign: "center" },
});
