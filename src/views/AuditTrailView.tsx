import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import type { AuditTrail, UserProfile } from "../types";

interface AuditTrailViewProps {
  logs: AuditTrail[];
  isLoading: boolean;
  actorCache: Record<string, UserProfile>;
  onRefresh: () => void;
  onBack: () => void;
}

const getActionIcon = (action = ""): { name: string; color: string; bg: string } => {
  const a = action.toLowerCase();
  if (a.includes("sign") && a.includes("in"))
    return { name: "sign-in-alt",        color: COLORS.primary,  bg: COLORS.primarySoft };
  if (a.includes("sign") && a.includes("out"))
    return { name: "sign-out-alt",        color: "#6B7280",       bg: "#F3F4F6" };
  if (a.includes("password"))
    return { name: "key",                 color: "#7C3AED",       bg: "#EDE9FE" };
  if (a.includes("proof") || a.includes("upload"))
    return { name: "cloud-upload-alt",    color: "#0891B2",       bg: "#E0F2FE" };
  if (a.includes("photo"))
    return { name: "camera",              color: "#DB2777",       bg: "#FCE7F3" };
  if (a.includes("milestone"))
    return { name: "layer-group",         color: COLORS.warning,  bg: COLORS.warningSoft };
  if (a.includes("delay"))
    return { name: "exclamation-circle",  color: COLORS.error,    bg: COLORS.errorSoft };
  if (a.includes("status") || a.includes("update"))
    return { name: "pen",                 color: "#D97706",       bg: "#FEF3C7" };
  return { name: "history", color: COLORS.primary, bg: COLORS.primarySoft };
};

const formatTimestamp = (seconds: number): string => {
  const date      = new Date(seconds * 1000);
  const now       = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const timeStr = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (date.toDateString() === now.toDateString())       return `Today · ${timeStr}`;
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${timeStr}`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + ` · ${timeStr}`;
};

// ── Actor avatar (photo or initials) ─────────────────────────
const ActorAvatar = ({ profile, email }: { profile?: UserProfile; email?: string }) => {
  const photoURL = profile?.photoURL;
  const name = profile?.firstName
    ? `${profile.firstName} ${profile.lastName || ""}`.trim()
    : profile?.name || email || "?";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <View style={S.actorAvatar}>
      {photoURL ? (
        <Image source={{ uri: photoURL }} style={S.actorAvatarImg} />
      ) : (
        <Text style={S.actorAvatarText}>{initials}</Text>
      )}
    </View>
  );
};

export const AuditTrailView = ({ logs, isLoading, actorCache, onRefresh, onBack }: AuditTrailViewProps) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={S.root}>

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <View style={[S.hero, { paddingTop: insets.top + 16 }]}>
        <View style={S.orb1} /><View style={S.orb2} />

        <View style={S.heroRow}>
          <TouchableOpacity style={S.backBtn} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <FontAwesome5 name="arrow-left" size={15} color="#fff" />
          </TouchableOpacity>

          <View style={S.heroCenter}>
            <Text style={S.heroTitle}>Audit Trail</Text>
            <Text style={S.heroSub}>Your field activity log</Text>
          </View>

          {logs.length > 0 ? (
            <View style={S.countChip}>
              <Text style={S.countText}>{logs.length}</Text>
            </View>
          ) : (
            <View style={{ width: 44 }} />
          )}
        </View>
      </View>

      {/* ══ CONTENT ═══════════════════════════════════════════════ */}
      <ScrollView
        contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {isLoading && logs.length === 0 ? (
          <View style={S.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : logs.length > 0 ? (
          <>
            <Text style={S.sectionLabel}>ALL ACTIVITY</Text>
            <View style={S.logCard}>
              {logs.map((log, i) => {
                const icon    = getActionIcon(log.action);
                const isLast  = i === logs.length - 1;
                const actorUid = log.actorUid ?? log.uid;
                const actor   = actorUid ? actorCache[actorUid] : undefined;
                const actorName = actor?.firstName
                  ? `${actor.firstName} ${actor.lastName || ""}`.trim()
                  : actor?.name || log.email || "Unknown";

                return (
                  <View key={log.id || i.toString()}>
                    <View style={[S.logRow, isLast && S.logRowLast]}>
                      {/* Action icon */}
                      <View style={[S.logIcon, { backgroundColor: icon.bg }]}>
                        <FontAwesome5 name={icon.name} size={13} color={icon.color} />
                      </View>

                      {/* Text block */}
                      <View style={S.logBody}>
                        <Text style={S.logAction}>{log.action}</Text>
                        {(() => {
                          const d = log.details;
                          const text = typeof d === "string" ? d : d?.message;
                          return text ? (
                            <Text style={S.logDetail} numberOfLines={2}>{text}</Text>
                          ) : null;
                        })()}

                        {/* Actor + timestamp row — hydrated from users/{uid} */}
                        <View style={S.logMeta}>
                          <ActorAvatar profile={actor} email={log.email} />
                          <Text style={S.logMetaText} numberOfLines={1}>
                            {actorName}
                          </Text>
                          <View style={S.logMetaDot} />
                          <Text style={S.logTime}>
                            {(() => {
                              const t = log.createdAt ?? log.timestamp;
                              return t?.seconds ? formatTimestamp(t.seconds) : "Recently";
                            })()}
                          </Text>
                        </View>
                      </View>
                    </View>
                    {!isLast && <View style={S.rowDivider} />}
                  </View>
                );
              })}
            </View>
          </>
        ) : (
          <View style={S.emptyBox}>
            <View style={S.emptyIconBox}>
              <FontAwesome5 name="clipboard-list" size={22} color={COLORS.textTertiary} />
            </View>
            <Text style={S.emptyTitle}>No Activity Yet</Text>
            <Text style={S.emptyBody}>Your field actions will appear here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // ── Hero ──────────────────────────────────────────────────────
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingBottom: 24,
    overflow: "hidden",
  },
  orb1: {
    position: "absolute", width: 180, height: 180, borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.06)", top: -50, right: -40,
  },
  orb2: {
    position: "absolute", width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.04)", bottom: -30, left: -15,
  },
  heroRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.28)",
  },
  heroCenter: { flex: 1, alignItems: "center" },
  heroTitle:  { fontSize: 18, fontWeight: "900", color: "#fff" },
  heroSub:    { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.7)", marginTop: 2 },
  countChip: {
    width: 44, height: 40, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.28)",
  },
  countText: { fontSize: 13, fontWeight: "900", color: "#fff" },

  // ── Content ───────────────────────────────────────────────────
  scroll:       { paddingHorizontal: 18, paddingTop: 20 },
  sectionLabel: {
    fontSize: 10, fontWeight: "900", color: COLORS.textTertiary,
    letterSpacing: 1, marginBottom: 10, paddingHorizontal: 2,
  },

  logCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    borderWidth: 1, borderColor: COLORS.border,
    overflow: "hidden",
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  logRow: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 16, paddingVertical: 14, gap: 14,
  },
  logRowLast: { paddingBottom: 16 },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 70 },

  logIcon: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  logBody:   { flex: 1 },
  logAction: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, lineHeight: 19 },
  logDetail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, fontWeight: "500", lineHeight: 16 },

  // Actor + timestamp row
  logMeta: {
    flexDirection: "row", alignItems: "center", marginTop: 7, gap: 5, flexWrap: "wrap",
  },
  actorAvatar: {
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  actorAvatarImg: { width: 18, height: 18, borderRadius: 9 },
  actorAvatarText: { fontSize: 8, fontWeight: "900", color: "#fff" },
  logMetaText: {
    fontSize: 11, fontWeight: "700", color: COLORS.textSecondary,
    flexShrink: 1, maxWidth: 120,
  },
  logMetaDot: {
    width: 3, height: 3, borderRadius: 2,
    backgroundColor: COLORS.textTertiary, flexShrink: 0,
  },
  logTime: { fontSize: 11, color: COLORS.textTertiary, fontWeight: "600" },

  // ── Loading ───────────────────────────────────────────────────
  loadingBox: { paddingTop: 60, alignItems: "center" },

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
