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
import { COLORS } from "../constants";
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

interface NotificationsViewProps {
  data: NotificationsData;
  actions: NotificationsActions;
}

const FILTERS = ["All", "Unread", "Read", "System"];

const getRelativeTime = (seconds: number): string => {
  const now  = Date.now();
  const diff = now - seconds * 1000;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getNotifIcon = (type = "", isUnread: boolean) => {
  const t = type.toLowerCase();
  if (t === "system") return { name: "cog",         color: "#7C3AED", bg: "#EDE9FE" };
  if (t === "alert")  return { name: "exclamation-circle", color: COLORS.error, bg: COLORS.errorSoft };
  if (t === "update") return { name: "pen",          color: "#D97706", bg: "#FEF3C7" };
  return isUnread
    ? { name: "bell",   color: COLORS.primary, bg: COLORS.primarySoft }
    : { name: "bell",   color: COLORS.textTertiary, bg: COLORS.background };
};

export const NotificationsView = ({ data, actions }: NotificationsViewProps) => {
  const insets = useSafeAreaInsets();
  const { notifications = [], isLoading = false } = data || {};
  const [activeFilter, setActiveFilter] = useState("All");

  const filteredData = useMemo(() => {
    if (activeFilter === "All")    return notifications;
    if (activeFilter === "Unread") return notifications.filter((n) => n.status === "Unread");
    if (activeFilter === "Read")   return notifications.filter((n) => n.status === "Read");
    if (activeFilter === "System") return notifications.filter((n) => n.type === "System");
    return notifications;
  }, [notifications, activeFilter]);

  const unreadCount = notifications.filter((n) => n.status === "Unread").length;

  const renderItem = ({ item, index }: { item: AppNotification; index: number }) => {
    const isUnread = item.status === "Unread";
    const icon     = getNotifIcon(item.type, isUnread);
    const isLast   = index === filteredData.length - 1;

    return (
      <TouchableOpacity
        style={[S.notifRow, isLast && S.notifRowLast, isUnread && S.notifRowUnread]}
        onPress={() => actions?.onPressItem(item)}
        activeOpacity={0.75}
      >
        {/* Icon box */}
        <View style={[S.notifIcon, { backgroundColor: icon.bg }]}>
          <FontAwesome5 name={icon.name} size={14} color={icon.color} />
        </View>

        {/* Content */}
        <View style={S.notifBody}>
          <View style={S.notifMeta}>
            <Text style={S.notifType}>{item.type || "Notification"}</Text>
            <Text style={S.notifTime}>
              {item.timestamp?.seconds ? getRelativeTime(item.timestamp.seconds) : "Just now"}
            </Text>
          </View>
          <Text style={[S.notifMessage, isUnread && S.notifMessageUnread]} numberOfLines={2}>
            {item.Message || "No message content"}
          </Text>
        </View>

        {/* Unread dot */}
        {isUnread && <View style={S.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={S.root}>

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <View style={[S.hero, { paddingTop: insets.top + 20 }]}>
        <View style={S.orb1} /><View style={S.orb2} />

        {/* Top row: title left · mark-all right */}
        <View style={S.heroTopRow}>
          <Text style={S.heroTitle}>Notifications</Text>
          {unreadCount > 0 && actions?.markAllAsRead && (
            <TouchableOpacity style={S.markAllBtn} onPress={actions.markAllAsRead} activeOpacity={0.8}>
              <FontAwesome5 name="check-double" size={11} color="rgba(255,255,255,0.85)" />
              <Text style={S.markAllText}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Unread count — only shown when there are unread items */}
        {unreadCount > 0 && (
          <View style={S.heroStatusRow}>
            <View style={S.unreadPill}>
              <Text style={S.unreadPillText}>{unreadCount} unread</Text>
            </View>
            <Text style={S.heroSub}>· tap a notification to open it</Text>
          </View>
        )}
      </View>

      {/* ══ FILTER CHIPS ══════════════════════════════════════════ */}
      <View style={S.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.filterScroll}
        >
          {FILTERS.map((f) => {
            const active = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[S.chip, active && S.chipActive]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.75}
              >
                <Text style={[S.chipText, active && S.chipTextActive]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ══ LIST ══════════════════════════════════════════════════ */}
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[S.listContent, { paddingBottom: insets.bottom + 110 }]}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={actions?.refresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={S.emptyBox}>
              <View style={S.emptyIconBox}>
                <FontAwesome5 name="bell-slash" size={22} color={COLORS.textTertiary} />
              </View>
              <Text style={S.emptyTitle}>No {activeFilter === "All" ? "" : activeFilter.toLowerCase() + " "}notifications</Text>
              <Text style={S.emptyBody}>Pull down to refresh your alerts.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // ── Hero ──────────────────────────────────────────────────────
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingBottom: 20,
    overflow: "hidden",
  },
  orb1: {
    position: "absolute", width: 220, height: 220, borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.06)", top: -70, right: -60,
  },
  orb2: {
    position: "absolute", width: 120, height: 120, borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.04)", bottom: -40, left: -20,
  },
  heroInner:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  heroLeft:     { flex: 1, paddingRight: 16 },
  heroTopRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  heroTitle:    { fontSize: 28, fontWeight: "900", color: "#fff" },
  heroStatusRow:{ flexDirection: "row", alignItems: "center", gap: 6 },
  heroSub:      { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.7)" },

  unreadPill: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10,
  },
  unreadPillText: { fontSize: 11, fontWeight: "800", color: "#fff" },

  // Bell icon
  bellRing: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.3)",
    flexShrink: 0,
  },
  bellCircle: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
  },
  bellBadge: {
    position: "absolute", top: 6, right: 6,
    backgroundColor: COLORS.error,
    borderRadius: 8, minWidth: 16, height: 16,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5, borderColor: "#fff",
  },
  bellBadgeText: { fontSize: 8, fontWeight: "900", color: "#fff" },

  // Mark all read — ghost button at bottom of hero
  markAllBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
  },
  markAllText: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.9)" },

  // ── Filter chips ──────────────────────────────────────────────
  filterWrap:   { backgroundColor: COLORS.primary, paddingBottom: 16 },
  filterScroll: { paddingHorizontal: 20, gap: 8, flexDirection: "row" },
  chip: {
    paddingHorizontal: 16, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
  },
  chipActive: {
    backgroundColor: "#fff",
    borderColor: "#fff",
  },
  chipText:       { fontSize: 13, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  chipTextActive: { color: COLORS.primary },

  // ── List ──────────────────────────────────────────────────────
  listContent: { paddingHorizontal: 18, paddingTop: 16 },

  notifRow: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 10,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 3,
  },
  notifRowLast:   { marginBottom: 0 },
  notifRowUnread: { borderColor: COLORS.primary + "30", backgroundColor: "#FAFFFE" },

  notifIcon: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  notifBody: { flex: 1 },
  notifMeta: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 4,
  },
  notifType: {
    fontSize: 10, fontWeight: "800", color: COLORS.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  notifTime:         { fontSize: 10, color: COLORS.textTertiary, fontWeight: "600" },
  notifMessage:      { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18, fontWeight: "500" },
  notifMessageUnread:{ color: COLORS.textPrimary, fontWeight: "600" },

  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6, flexShrink: 0,
  },

  // ── Empty state ───────────────────────────────────────────────
  emptyBox:     { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyIconBox: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  emptyBody:  { fontSize: 12, color: COLORS.textSecondary, textAlign: "center" },
});
