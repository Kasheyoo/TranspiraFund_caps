import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import type { AuditLog, DashboardStats } from "../types";

interface DashboardData {
  stats: DashboardStats;
  recentLogs: AuditLog[];
  engineerName: string;
  isLoading: boolean;
}

interface DashboardActions {
  onRefresh: () => void;
}

interface DashboardViewProps {
  data: DashboardData;
  actions: DashboardActions;
}

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
};

const getRelativeTime = (seconds: number): string => {
  const now = Date.now();
  const diff = now - seconds * 1000;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(seconds * 1000).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
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

        <Text style={styles.sectionHeading}>RECENT ACTIVITY</Text>

        {recentLogs && recentLogs.length > 0 ? (
          recentLogs.map((log) => {
            const isDelayed = log.action?.toLowerCase() === "delayed";
            return (
              <View key={log.id} style={styles.activityCard}>
                <View
                  style={[
                    styles.activityIcon,
                    isDelayed && { backgroundColor: COLORS.error + "15" },
                  ]}
                >
                  <FontAwesome5
                    name={isDelayed ? "exclamation-circle" : "history"}
                    size={12}
                    color={isDelayed ? COLORS.error : COLORS.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.activityMessage}>
                    {log.action}: {log.details}
                  </Text>
                  <Text style={styles.activityTime}>
                    {log.timestamp?.seconds
                      ? getRelativeTime(log.timestamp.seconds)
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
  greetingText: { fontSize: 14, fontWeight: "600", color: COLORS.textSecondary },
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
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.primary + "20",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statNumber: { fontSize: 22, fontWeight: "900" },
  statLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: COLORS.textSecondary,
    marginTop: 4,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: COLORS.textSecondary,
    marginBottom: 16,
    letterSpacing: 1,
    paddingHorizontal: 4,
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
    fontSize: 13,
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
    fontSize: 14,
    marginTop: 12,
  },
  emptySubText: {
    color: COLORS.textTertiary,
    fontSize: 12,
    marginTop: 4,
  },
});
