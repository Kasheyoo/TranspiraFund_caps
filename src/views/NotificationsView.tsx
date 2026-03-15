import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useMemo, useState } from "react";
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
import type { AppNotification } from "../types";

interface NotificationsData {
  notifications: AppNotification[];
  isLoading: boolean;
}

interface NotificationsActions {
  onPressItem: (item: AppNotification) => void;
  refresh: () => void;
  markAllAsRead?: () => void;
}

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

interface NotificationsViewProps {
  data: NotificationsData;
  actions: NotificationsActions;
}

export const NotificationsView = ({ data, actions }: NotificationsViewProps) => {
  const insets = useSafeAreaInsets();
  const { notifications = [], isLoading = false } = data || {};
  const [activeFilter, setActiveFilter] = useState("All");

  const filters = ["All", "Unread", "Read", "System"];

  const filteredData = useMemo(() => {
    if (activeFilter === "All") return notifications;
    if (activeFilter === "Unread")
      return notifications.filter((n) => n.status === "Unread");
    if (activeFilter === "Read")
      return notifications.filter((n) => n.status === "Read");
    if (activeFilter === "System")
      return notifications.filter((n) => n.type === "System");
    return notifications;
  }, [notifications, activeFilter]);

  const renderItem = ({ item }: { item: AppNotification }) => {
    const isUnread = item.status === "Unread";

    return (
      <TouchableOpacity
        style={[styles.card, isUnread && styles.unreadCard]}
        onPress={() => actions?.onPressItem(item)}
      >
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: isUnread
                ? COLORS.primary + "15"
                : COLORS.background,
            },
          ]}
        >
          <FontAwesome5
            name={item.type === "System" ? "cog" : "bell"}
            size={14}
            color={isUnread ? COLORS.primary : COLORS.textTertiary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <View style={styles.metaRow}>
            <Text style={styles.typeText}>{item.type || "Notification"}</Text>
            <Text style={styles.timeText}>
              {item.timestamp?.seconds
                ? getRelativeTime(item.timestamp.seconds)
                : "Just now"}
            </Text>
          </View>
          <Text style={[styles.messageText, isUnread && styles.unreadText]}>
            {item.Message || "No message content"}
          </Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={STYLES.container}>
      <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.title}>Notifications</Text>
        {notifications.some((n) => n.status === "Unread") && actions?.markAllAsRead && (
          <TouchableOpacity onPress={actions.markAllAsRead} style={styles.markAllBtn}>
            <FontAwesome5 name="check-double" size={12} color={COLORS.primary} />
            <Text style={styles.markAllText}>Mark All Read</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 24 }}
        >
          {filters.map((f) => (
            <TouchableOpacity
              key={f}
              onPress={() => setActiveFilter(f)}
              style={[
                styles.filterTab,
                activeFilter === f && styles.filterTabActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  activeFilter === f && styles.filterTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={actions?.refresh}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyContainer}>
              <FontAwesome5
                name="bell-slash"
                size={48}
                color={COLORS.background}
              />
              <Text style={styles.emptyText}>
                No {activeFilter.toLowerCase()} notifications
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 24,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  title: { fontSize: 28, fontWeight: "900", color: COLORS.textPrimary },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    marginBottom: 2,
  },
  markAllText: { fontSize: 11, fontWeight: "700", color: COLORS.primary },
  filterBar: { marginBottom: 8, height: 50 },
  filterTab: {
    paddingHorizontal: 16,
    height: 36,
    justifyContent: "center",
    borderRadius: 10,
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
  card: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "flex-start",
  },
  unreadCard: { borderColor: COLORS.primary + "30", backgroundColor: "#FFF" },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  timeText: { fontSize: 11, color: COLORS.textTertiary },
  messageText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  unreadText: { color: COLORS.textPrimary, fontWeight: "600" },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 4,
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textTertiary,
    marginTop: 16,
    fontStyle: "italic",
  },
});
