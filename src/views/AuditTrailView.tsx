import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import type { AuditTrail } from "../types";

interface AuditTrailViewProps {
  logs: AuditTrail[];
  isLoading: boolean;
  onRefresh: () => void;
  onBack: () => void;
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

const formatTimestamp = (seconds: number): string => {
  const date = new Date(seconds * 1000);
  const dateStr = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${dateStr} · ${timeStr}`;
};

export const AuditTrailView = ({
  logs,
  isLoading,
  onRefresh,
  onBack,
}: AuditTrailViewProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <FontAwesome5 name="arrow-left" size={18} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Audit Trail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <Text style={styles.sectionHeading}>ALL ACTIVITY</Text>

        {isLoading && logs.length === 0 ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : logs.length > 0 ? (
          logs.map((log) => {
            const icon = getActionIcon(log.action);
            return (
              <View key={log.id || Math.random().toString()} style={styles.activityCard}>
                <View style={[styles.activityIcon, { backgroundColor: icon.bg }]}>
                  <FontAwesome5 name={icon.name} size={14} color={icon.color} />
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
            <Text style={styles.emptyText}>No activity found.</Text>
            <Text style={styles.emptySubText}>Pull down to refresh</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    padding: 8,
    width: 40,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16 },
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
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  activityMessage: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
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
