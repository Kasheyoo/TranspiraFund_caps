import { FontAwesome5 } from "@expo/vector-icons";
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

export const NotificationsView = ({ data, actions }) => {
  const insets = useSafeAreaInsets();
  const { notifications = [], isLoading = false } = data || {};
  const [activeFilter, setActiveFilter] = useState("All");

  // ✅ ADDED: "Read" to the filter list
  const filters = ["All", "Unread", "Read", "System"];

  const filteredData = useMemo(() => {
    if (activeFilter === "All") return notifications;

    // ✅ Updated logic to match Firestore 'status' strings
    if (activeFilter === "Unread")
      return notifications.filter((n) => n.status === "Unread");

    if (activeFilter === "Read")
      return notifications.filter((n) => n.status === "Read");

    if (activeFilter === "System")
      return notifications.filter((n) => n.type === "System");

    return notifications;
  }, [notifications, activeFilter]);

  const renderItem = ({ item }) => {
    const isUnread = item.status === "Unread"; //

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
              {/* ✅ Timestamp conversion logic */}
              {item.timestamp?.seconds
                ? new Date(item.timestamp.seconds * 1000).toLocaleDateString()
                : "Just now"}
            </Text>
          </View>
          <Text style={[styles.messageText, isUnread && styles.unreadText]}>
            {/* ✅ Mapping to 'Message' field */}
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
          !isLoading && (
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
          )
        }
      />
    </View>
  );
};

// ... keep previous styles ...
const styles = StyleSheet.create({
  header: { paddingHorizontal: 24, marginBottom: 12 },
  title: { fontSize: 28, fontWeight: "900", color: COLORS.textPrimary },
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
