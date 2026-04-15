import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import type { Milestone, Project } from "../types";

interface MilestoneDetailsData {
  selectedMilestone: Milestone | null;
  project: Project | null;
  isLoading: boolean;
}

interface MilestoneDetailsActions {
  onRefresh: () => void;
  onSelectMilestone: (m: Milestone | null) => void;
  onAddProof: (m: Milestone) => void;
}

interface MilestoneDetailsViewProps {
  data: MilestoneDetailsData;
  actions: MilestoneDetailsActions;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { accent: string; bg: string; text: string }> = {
  "completed": { accent: COLORS.success, bg: COLORS.successSoft, text: COLORS.success },
  "pending":   { accent: COLORS.warning, bg: COLORS.warningSoft, text: COLORS.warning },
  "delayed":   { accent: COLORS.error,   bg: COLORS.errorSoft,   text: COLORS.error   },
};

export const MilestoneDetailsView = ({ data, actions }: MilestoneDetailsViewProps) => {
  const insets = useSafeAreaInsets();
  const { selectedMilestone: m, project, isLoading } = data;

  if (!m) return null;

  const statusKey  = m.status?.toString().toLowerCase() || "pending";
  const sc         = STATUS_MAP[statusKey] || STATUS_MAP["pending"];
  const isCompleted = statusKey === "completed";
  const proofs     = Array.isArray(m.proofs) ? [...m.proofs].reverse() : [];
  const proofCount = proofs.length;

  return (
    <View style={S.root}>

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <View style={[S.hero, { paddingTop: insets.top + 10 }]}>
        <View style={S.orb1} /><View style={S.orb2} />

        {/* Back */}
        <TouchableOpacity onPress={() => actions.onSelectMilestone(null)} style={S.backBtn} activeOpacity={0.8}>
          <FontAwesome5 name="arrow-left" size={14} color="#fff" />
        </TouchableOpacity>

        {/* Project breadcrumb */}
        {project ? (
          <View style={S.breadcrumb}>
            <FontAwesome5 name="hard-hat" size={9} color="rgba(255,255,255,0.6)" />
            <Text style={S.breadcrumbText} numberOfLines={1}>
              {project.projectName ?? project.title ?? "Project"}
            </Text>
          </View>
        ) : null}

        {/* Milestone title */}
        <Text style={S.heroTitle} numberOfLines={3}>{m.title}</Text>

        {/* Sequence + status */}
        <View style={S.heroBadgeRow}>
          {m.sequence !== undefined ? (
            <View style={S.seqChip}>
              <FontAwesome5 name="sort-numeric-up" size={9} color="rgba(255,255,255,0.75)" />
              <Text style={S.seqText}>Phase {m.sequence}</Text>
            </View>
          ) : null}
          <View style={[S.heroBadge, { backgroundColor: sc.bg }]}>
            <View style={[S.heroBadgeDot, { backgroundColor: sc.accent }]} />
            <Text style={[S.heroBadgeText, { color: sc.text }]}>
              {m.status || "Pending"}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[S.scroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ══ PROOF OF WORK HEADER ═══════════════════════════════ */}
        <View style={S.proofHeader}>
          <View>
            <Text style={S.proofHeaderTitle}>Proof of Work</Text>
            <Text style={S.proofHeaderSub}>
              {proofCount > 0
                ? `${proofCount} photo${proofCount !== 1 ? "s" : ""} submitted`
                : "No evidence submitted yet"}
            </Text>
          </View>

          {!isCompleted && (
            <TouchableOpacity
              style={S.addProofBtn}
              onPress={() => actions.onAddProof(m)}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome5 name="camera" size={13} color="#fff" />
                  <Text style={S.addProofBtnText}>Add Proof</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ══ PROOF GRID / LIST ══════════════════════════════════ */}
        {proofCount > 0 ? (
          <View style={S.proofList}>
            {proofs.map((p, i) => (
              <View key={i} style={S.proofCard}>
                {/* Photo */}
                <Image
                  source={{ uri: p.url }}
                  style={S.proofImage}
                  resizeMode="cover"
                />

                {/* Overlay badge */}
                <View style={S.proofOverlay}>
                  <View style={S.proofBadge}>
                    <FontAwesome5 name="camera" size={8} color="#fff" />
                    <Text style={S.proofBadgeNum}>#{proofCount - i}</Text>
                  </View>
                </View>

                {/* Info row */}
                <View style={S.proofInfo}>
                  <View style={S.proofInfoRow}>
                    <View style={[S.proofInfoIcon, { backgroundColor: COLORS.errorSoft }]}>
                      <FontAwesome5 name="map-marker-alt" size={10} color={COLORS.error} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.proofInfoLabel}>GPS LOCATION</Text>
                      <Text style={S.proofInfoValue} numberOfLines={1}>
                        {p.location || "No GPS data"}
                      </Text>
                    </View>
                  </View>

                  <View style={S.proofInfoDivider} />

                  <View style={S.proofInfoRow}>
                    <View style={[S.proofInfoIcon, { backgroundColor: COLORS.primarySoft }]}>
                      <FontAwesome5 name="clock" size={10} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.proofInfoLabel}>SUBMITTED</Text>
                      <Text style={S.proofInfoValue}>
                        {p.timestamp
                          ? new Date(p.timestamp).toLocaleString("en-PH", {
                              month: "short", day: "numeric", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : "Date unavailable"}
                      </Text>
                    </View>
                  </View>

                  {/* Coordinates row */}
                  {(p.latitude && p.longitude) ? (
                    <>
                      <View style={S.proofInfoDivider} />
                      <View style={S.proofInfoRow}>
                        <View style={[S.proofInfoIcon, { backgroundColor: COLORS.warningSoft }]}>
                          <FontAwesome5 name="crosshairs" size={10} color={COLORS.warning} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={S.proofInfoLabel}>COORDINATES</Text>
                          <Text style={S.proofInfoValue}>
                            {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                          </Text>
                        </View>
                      </View>
                    </>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        ) : (
          /* ══ EMPTY STATE ══════════════════════════════════════ */
          <View style={S.emptyBox}>
            <View style={S.emptyIconBox}>
              <FontAwesome5 name="camera" size={28} color={COLORS.primary} />
            </View>
            <Text style={S.emptyTitle}>No Evidence Yet</Text>
            <Text style={S.emptyBody}>
              Take a photo at the project site to submit your first proof of work. GPS coordinates will be recorded automatically.
            </Text>
            {!isCompleted && (
              <TouchableOpacity style={S.emptyBtn} onPress={() => actions.onAddProof(m)} activeOpacity={0.85}>
                {isLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><FontAwesome5 name="camera" size={14} color="#fff" /><Text style={S.emptyBtnText}>Take First Photo</Text></>
                }
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Completed notice */}
        {isCompleted && (
          <View style={S.completedNotice}>
            <FontAwesome5 name="check-circle" size={14} color={COLORS.success} />
            <Text style={S.completedText}>
              This milestone is marked as <Text style={{ fontWeight: "800" }}>Completed</Text>. No new proofs can be added.
            </Text>
          </View>
        )}

      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22, paddingBottom: 26, overflow: "hidden",
  },
  orb1: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "rgba(255,255,255,0.06)", top: -50, right: -40 },
  orb2: { position: "absolute", width: 100, height: 100, borderRadius: 50,  backgroundColor: "rgba(255,255,255,0.04)", bottom: -30, left: 20  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center", marginBottom: 12,
  },
  breadcrumb: {
    flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 8,
  },
  breadcrumbText: { fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: "600" },
  heroTitle: { fontSize: 20, fontWeight: "900", color: "#fff", lineHeight: 26, marginBottom: 10 },
  heroBadgeRow: { flexDirection: "row", gap: 7, flexWrap: "wrap" },
  seqChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10,
  },
  seqText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.9)" },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  heroBadgeDot:  { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 12, fontWeight: "800" },

  // Scroll
  scroll: { paddingHorizontal: 18, paddingTop: 18, gap: 14 },

  // Proof header
  proofHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center",
  },
  proofHeaderTitle: { fontSize: 18, fontWeight: "900", color: COLORS.textPrimary },
  proofHeaderSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  addProofBtn: {
    flexDirection: "row", alignItems: "center", gap: 7,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 13,
  },
  addProofBtnText: { fontSize: 13, fontWeight: "800", color: "#fff" },

  // Proof list
  proofList: { gap: 14 },
  proofCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 20, overflow: "hidden",
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 2, shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
  },
  proofImage: { width: "100%", height: 220 },
  proofOverlay: {
    position: "absolute", top: 12, right: 12,
  },
  proofBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  proofBadgeNum: { fontSize: 10, fontWeight: "800", color: "#fff" },

  proofInfo: { padding: 14, gap: 0 },
  proofInfoRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  proofInfoIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
  },
  proofInfoLabel: {
    fontSize: 9, fontWeight: "800", color: COLORS.textTertiary,
    letterSpacing: 0.6, marginBottom: 2, textTransform: "uppercase",
  },
  proofInfoValue: { fontSize: 12, fontWeight: "600", color: COLORS.textPrimary, lineHeight: 17 },
  proofInfoDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 38 },

  // Empty state
  emptyBox: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 32, alignItems: "center", gap: 10,
    borderWidth: 1.5, borderColor: COLORS.border, borderStyle: "dashed",
  },
  emptyIconBox: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary },
  emptyBody:  {
    fontSize: 13, color: COLORS.textSecondary,
    textAlign: "center", lineHeight: 19, paddingHorizontal: 8,
  },
  emptyBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14, marginTop: 6,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  // Completed notice
  completedNotice: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    backgroundColor: COLORS.successSoft,
    padding: 14, borderRadius: 14,
    borderWidth: 1, borderColor: "#A7F3D0",
  },
  completedText: { flex: 1, fontSize: 13, color: COLORS.success, lineHeight: 18 },
});
