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

const getActionIcon = (action = ""): { name: string; color: string; bg: string } => {
  const a = action.toLowerCase();
  if (a.includes("sign") && a.includes("in"))
    return { name: "sign-in-alt", color: COLORS.primary, bg: COLORS.primarySoft };
  if (a.includes("sign") && a.includes("out"))
    return { name: "sign-out-alt", color: "#6B7280", bg: "#F3F4F6" };
  if (a.includes("password"))
    return { name: "key", color: "#7C3AED", bg: "#EDE9FE" };
  if (a.includes("proof") || a.includes("upload"))
    return { name: "cloud-upload-alt", color: "#0891B2", bg: "#E0F2FE" };
  if (a.includes("delay"))
    return { name: "exclamation-triangle", color: COLORS.error, bg: COLORS.error + "15" };
  if (a.includes("status") || a.includes("update"))
    return { name: "pen", color: "#D97706", bg: "#FEF3C7" };
  return { name: "history", color: COLORS.primary, bg: COLORS.primarySoft };
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const formatTimestamp = (seconds: number): string => {
  const date = new Date(seconds * 1000);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (isToday) return `Today · ${timeStr}`;
  if (isYesterday) return `Yesterday · ${timeStr}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + ` · ${timeStr}`;
};

export const DashboardView = ({ data, actions }: DashboardViewProps) => {
  const insets = useSafeAreaInsets();
  const { stats, recentLogs, engineerName, isLoading } = data;
  const totalProjects = (stats.progress || 0) + (stats.done || 0) + (stats.delay || 0);

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={actions.onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.headerSection}>
          <Text style={styles.greetingText}>{getGreeting()},</Text>
          <Text style={styles.engineerText}>
            {engineerName || "Lead Engineer"}
          </Text>
          {totalProjects > 0 && (
            <View style={styles.totalBadge}>
              <FontAwesome5 name="folder" size={10} color={COLORS.primary} />
              <Text style={styles.totalText}>
                {totalProjects} Total Project{totalProjects !== 1 ? "s" : ""}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: "#EBF2FF" }]}>
            <View style={styles.statIconBox}>
              <FontAwesome5 name="clock" size={14} color={COLORS.primary} />
            </View>
            <Text style={[styles.statNumber, { color: COLORS.primary }]}>
              {stats.progress || 0}
            </Text>
            <Text style={styles.statLabel}>IN PROGRESS</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: "#E7F7EF" }]}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.success + "20" }]}>
              <FontAwesome5 name="check-circle" size={14} color={COLORS.success} />
            </View>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>
              {stats.done || 0}
            </Text>
            <Text style={styles.statLabel}>COMPLETED</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: "#FFEBEB" }]}>
            <View style={[styles.statIconBox, { backgroundColor: COLORS.error + "20" }]}>
              <FontAwesome5 name="exclamation-triangle" size={14} color={COLORS.error} />
            </View>
            <Text style={[styles.statNumber, { color: COLORS.error }]}>
              {stats.delay || 0}
            </Text>
            <Text style={styles.statLabel}>DELAYED</Text>
          </View>
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>RECENT ACTIVITY</Text>
          <TouchableOpacity onPress={actions.onViewAllActivity} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentLogs && recentLogs.length > 0 ? (
          recentLogs.map((log) => {
            const icon = getActionIcon(log.action);
            return (
              <View key={log.id} style={styles.activityCard}>
                <View style={[styles.activityIcon, { backgroundColor: icon.bg }]}>
                  <FontAwesome5 name={icon.name} size={12} color={icon.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityMessage}>
                    {log.action}: {log.details}
                  </Text>
                  <Text style={styles.activityTime}>
                    {log.timestamp?.seconds
                      ? formatTimestamp(log.timestamp.seconds)
                      : "Recently"}
                  </Text>
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <FontAwesome5 name="clipboard-list" size={36} color={COLORS.border} />
            <Text style={styles.emptyText}>No recent activity found.</Text>
            <Text style={styles.emptySubText}>Pull down to refresh</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  headerSection: { marginTop: 20, marginBottom: 24, paddingHorizontal: 4 },
  greetingText: { fontSize: 15, fontWeight: "600", color: COLORS.textSecondary },
  engineerText: {
    fontSize: 24,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginTop: 10,
    gap: 6,
  },
  totalText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.primary,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumber: { fontSize: 22, fontWeight: "900" },
  statLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textSecondary,
    marginTop: 4,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textSecondary,
    letterSpacing: 1,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.primary,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityMessage: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 4,
    fontWeight: "600",
  },
  emptyState: { paddingVertical: 50, alignItems: "center" },
  emptyText: {
    color: COLORS.textTertiary,
    fontWeight: "600",
    fontSize: 15,
    marginTop: 12,
  },
  emptySubText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
});
