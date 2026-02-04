import { FontAwesome5 } from "@expo/vector-icons";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";

export const DashboardView = ({ data, actions }) => {
  const insets = useSafeAreaInsets();
  const { stats, recentLogs, engineerName, isLoading } = data;

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
          <Text style={styles.greetingText}>Good Day,</Text>
          <Text style={styles.engineerText}>
            {engineerName || "Lead Engineer"}
          </Text>
        </View>

        {/* ✅ FIXED SPACING: 3-Column Grid for construction status */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: "#EBF2FF" }]}>
            <Text style={[styles.statNumber, { color: COLORS.primary }]}>
              {stats.progress || 0}
            </Text>
            <Text style={styles.statLabel}>IN PROGRESS</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: "#E7F7EF" }]}>
            <Text style={[styles.statNumber, { color: COLORS.success }]}>
              {stats.done || 0}
            </Text>
            <Text style={styles.statLabel}>COMPLETED</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: "#FFEBEB" }]}>
            <Text style={[styles.statNumber, { color: "#FF4D4D" }]}>
              {stats.delay || 0}
            </Text>
            <Text style={styles.statLabel}>DELAYED</Text>
          </View>
        </View>

        <Text style={styles.sectionHeading}>RECENT ACTIVITY</Text>

        {recentLogs && recentLogs.length > 0 ? (
          recentLogs.map((log) => (
            <View key={log.id} style={styles.activityCard}>
              <View style={styles.activityIcon}>
                <FontAwesome5
                  name="history"
                  size={12}
                  color={
                    log.action?.toLowerCase() === "delayed"
                      ? "#FF4D4D"
                      : COLORS.primary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.activityMessage}>
                  {log.action}: {log.details}
                </Text>
                <Text style={styles.activityTime}>
                  {log.timestamp?.seconds
                    ? new Date(log.timestamp.seconds * 1000).toLocaleString(
                        [],
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )
                    : "Recently"}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No recent activity found.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },
  headerSection: { marginTop: 20, marginBottom: 24, paddingHorizontal: 4 },
  greetingText: { fontSize: 14, fontWeight: "600", color: "#8E8E93" },
  engineerText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#1A1C1E",
    marginTop: 2,
  },

  // ✅ REFINED GRID SPACING
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8, // Reduced gap to prevent overflow
    marginBottom: 32,
  },
  statCard: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 4, // Tightened horizontal padding
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  statNumber: { fontSize: 20, fontWeight: "900" }, // Slightly smaller font for 3 columns
  statLabel: {
    fontSize: 8,
    fontWeight: "800",
    color: "#8E8E93",
    marginTop: 4,
    letterSpacing: 0.3,
    textAlign: "center",
  },

  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8E8E93",
    marginBottom: 16,
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  activityCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F2F2F7",
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#F0F4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  activityMessage: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1C1E",
    lineHeight: 18,
  },
  activityTime: {
    fontSize: 10,
    color: "#8E8E93",
    marginTop: 4,
    fontWeight: "600",
  },
  emptyState: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: "#C7C7CC", fontStyle: "italic", fontSize: 13 },
});
