import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useState } from "react";
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
import { ToastMessage } from "../components/ToastMessage";
import { ConfirmModal } from "../components/ConfirmModal";
import { ProofImageViewer } from "../components/ProofImageViewer";
import type { Milestone, Project, Proof } from "../types";

type ToastType = "success" | "error" | "info";

interface MilestoneDetailsData {
  selectedMilestone: Milestone | null;
  project: Project | null;
  isLoading: boolean;
  toast?: { visible: boolean; type: ToastType; message: string };
}

interface MilestoneDetailsActions {
  onRefresh: () => void;
  onSelectMilestone: (m: Milestone | null) => void;
  onAddProof: (m: Milestone) => void;
  onConfirmMilestone?: (m: Milestone) => Promise<boolean>;
  onMarkCompleted?: (m: Milestone) => Promise<boolean>;
  onDismissToast?: () => void;
}

interface MilestoneDetailsViewProps {
  data: MilestoneDetailsData;
  actions: MilestoneDetailsActions;
}

// Detects the legacy "lat, lng" string stored in older proofs (before
// server-side reverse geocoding shipped). When `location` is just numbers,
// the COORDINATES row already covers it — don't render it twice as a place.
const COORD_STRING_RE = /^\s*-?\d+\.\d+\s*,\s*-?\d+\.\d+\s*$/;
const isCoordString = (s?: string) => !!s && COORD_STRING_RE.test(s);

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { accent: string; bg: string; text: string }> = {
  "completed": { accent: COLORS.success, bg: COLORS.successSoft, text: COLORS.success },
  "pending":   { accent: COLORS.warning, bg: COLORS.warningSoft, text: COLORS.warning },
  "delayed":   { accent: COLORS.error,   bg: COLORS.errorSoft,   text: COLORS.error   },
};

export const MilestoneDetailsView = ({ data, actions }: MilestoneDetailsViewProps) => {
  const insets = useSafeAreaInsets();
  const { selectedMilestone: m, project, isLoading, toast } = data;

  if (!m) return null;

  const statusKey  = m.status?.toString().toLowerCase() || "pending";
  const sc         = STATUS_MAP[statusKey] || STATUS_MAP["pending"];
  const isCompleted = statusKey === "completed";
  const proofs     = Array.isArray(m.proofs) ? [...m.proofs].reverse() : [];
  const proofCount = proofs.length;
  const PROOF_LIMIT = 5;
  const atProofLimit = proofCount >= PROOF_LIMIT;
  const needsReview = m.confirmed === false;
  const isAiGenerated = !!m.generatedBy;

  const handleConfirm = async () => {
    if (!actions.onConfirmMilestone) return;
    await actions.onConfirmMilestone(m);
  };

  // In-app confirm for Mark Completed — replaces the native Alert so the
  // dialog matches the rest of the app's design system instead of the OS.
  const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
  const [confirmingComplete, setConfirmingComplete] = useState(false);

  // Fullscreen proof viewer. Engineer/time/coords are already burnt into the
  // JPEG banner by the server — we only surface the Location chip (opens Maps)
  // and capture-time chip, matching the web lightbox.
  const [viewerProof, setViewerProof] = useState<Proof | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number>(0);

  const openProofViewer = (p: Proof, indexFromNewest: number) => {
    setViewerProof(p);
    setViewerIndex(indexFromNewest);
  };

  const canMarkCompleted = !isCompleted && !needsReview && proofCount > 0;
  const openMarkCompleted = () => {
    if (!actions.onMarkCompleted) return;
    setConfirmCompleteOpen(true);
  };
  const submitMarkCompleted = async () => {
    if (!actions.onMarkCompleted) return;
    try {
      setConfirmingComplete(true);
      await actions.onMarkCompleted(m);
    } finally {
      setConfirmingComplete(false);
      setConfirmCompleteOpen(false);
    }
  };

  return (
    <View style={S.root}>

      {/* ══ TOAST OVERLAY ════════════════════════════════════════ */}
      {toast ? (
        <ToastMessage
          visible={toast.visible}
          type={toast.type}
          message={toast.message}
          onHide={() => actions.onDismissToast?.()}
        />
      ) : null}

      {/* ══ MARK-COMPLETED CONFIRM (in-app, not OS Alert) ═══════ */}
      <ConfirmModal
        visible={confirmCompleteOpen}
        tone="success"
        icon="flag-checkered"
        title="Mark as Completed?"
        message={`Confirm that "${m.title}" is finished. This updates the project progress and notifies HCSD. You can still view the proofs after.`}
        confirmLabel="Mark Completed"
        cancelLabel="Cancel"
        isBusy={confirmingComplete}
        onConfirm={submitMarkCompleted}
        onCancel={() => setConfirmCompleteOpen(false)}
      />

      {/* ══ PROOF FULLSCREEN VIEWER ══════════════════════════════ */}
      <ProofImageViewer
        proof={viewerProof}
        indexLabel={viewerProof ? `#${viewerIndex} of ${proofCount}` : undefined}
        onClose={() => setViewerProof(null)}
      />

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

        {/* ══ SPEC CARD (AI metadata) ════════════════════════════ */}
        {(m.description || m.weightPercentage || m.suggestedDurationDays || isAiGenerated) ? (
          <View style={S.specCard}>
            {isAiGenerated ? (
              <View style={S.aiTag}>
                <FontAwesome5 name="robot" size={10} color={COLORS.primary} />
                <Text style={S.aiTagText}>AI-DRAFTED · {m.generatedBy?.toUpperCase()}</Text>
              </View>
            ) : null}

            {m.description ? (
              <View style={S.specBlock}>
                <Text style={S.specLabel}>WHAT TO VERIFY ON-SITE</Text>
                <Text style={S.specBody}>{m.description}</Text>
              </View>
            ) : null}

            {(m.weightPercentage !== undefined || m.suggestedDurationDays !== undefined) ? (
              <View style={S.specMetrics}>
                {m.weightPercentage !== undefined ? (
                  <View style={S.specMetric}>
                    <FontAwesome5 name="balance-scale" size={11} color={COLORS.primary} />
                    <Text style={S.specMetricLabel}>WEIGHT</Text>
                    <Text style={S.specMetricValue}>{m.weightPercentage}%</Text>
                  </View>
                ) : null}
                {m.suggestedDurationDays !== undefined ? (
                  <View style={S.specMetric}>
                    <FontAwesome5 name="calendar-alt" size={11} color={COLORS.primary} />
                    <Text style={S.specMetricLabel}>SUGGESTED</Text>
                    <Text style={S.specMetricValue}>
                      {m.suggestedDurationDays} day{m.suggestedDurationDays !== 1 ? "s" : ""}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ══ REVIEW & CONFIRM (blocks proofs until confirmed) ═══ */}
        {needsReview ? (
          <View style={S.confirmCard}>
            <View style={S.confirmIconRing}>
              <FontAwesome5 name="search" size={18} color={COLORS.warning} />
            </View>
            <Text style={S.confirmTitle}>Review & Confirm</Text>
            <Text style={S.confirmBody}>
              Read the phase description above. If it matches the work you'll perform, confirm to unlock proof uploads. Otherwise contact HCSD to revise it.
            </Text>
            <TouchableOpacity
              style={S.confirmBtn}
              onPress={handleConfirm}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome5 name="check" size={13} color="#fff" />
                  <Text style={S.confirmBtnText}>Confirm Milestone</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ══ PROOF OF WORK HEADER ═══════════════════════════════ */}
        <View style={S.proofHeader}>
          <View style={{ flex: 1 }}>
            <Text style={S.proofHeaderTitle}>Proof of Work</Text>
            <Text style={S.proofHeaderSub}>
              {proofCount > 0
                ? `${proofCount} of ${PROOF_LIMIT} photo${proofCount !== 1 ? "s" : ""} submitted`
                : `No evidence yet · up to ${PROOF_LIMIT}`}
            </Text>
          </View>

          {!isCompleted && !needsReview && (
            atProofLimit ? (
              <View style={S.proofLimitChip}>
                <FontAwesome5 name="check-double" size={11} color={COLORS.success} />
                <Text style={S.proofLimitChipText}>Limit reached</Text>
              </View>
            ) : (
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
            )
          )}
        </View>

        {/* ══ PROOF GRID / LIST ══════════════════════════════════ */}
        {proofCount > 0 ? (
          <View style={S.proofList}>
            {proofs.map((p, i) => (
              <View key={i} style={S.proofCard}>
                {/* Photo — tap to open fullscreen viewer with burnt-in banner visible */}
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => openProofViewer(p, proofCount - i)}
                >
                  <Image
                    source={{ uri: p.url }}
                    style={S.proofImage}
                    resizeMode="cover"
                  />
                </TouchableOpacity>

                {/* Overlay badge */}
                <View style={S.proofOverlay}>
                  <View style={S.proofBadge}>
                    <FontAwesome5 name="camera" size={8} color="#fff" />
                    <Text style={S.proofBadgeNum}>#{proofCount - i}</Text>
                  </View>
                </View>

                {/* Info row */}
                <View style={S.proofInfo}>
                  {/* LOCATION — human-readable place from server reverse-geocode.
                      Hidden when the value is just a coord string (legacy proof
                      pre-geocoding) since the COORDINATES row already covers it. */}
                  {p.location && !isCoordString(p.location) ? (
                    <>
                      <View style={S.proofInfoRow}>
                        <View style={[S.proofInfoIcon, { backgroundColor: COLORS.errorSoft }]}>
                          <FontAwesome5 name="map-marker-alt" size={10} color={COLORS.error} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={S.proofInfoLabel}>LOCATION</Text>
                          <Text style={S.proofInfoValue} numberOfLines={2}>
                            {p.location}
                          </Text>
                        </View>
                      </View>
                      <View style={S.proofInfoDivider} />
                    </>
                  ) : null}

                  <View style={S.proofInfoRow}>
                    <View style={[S.proofInfoIcon, { backgroundColor: COLORS.primarySoft }]}>
                      <FontAwesome5 name="clock" size={10} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={S.proofInfoLabel}>CAPTURED</Text>
                      <Text style={S.proofInfoValue}>
                        {(() => {
                          // capturedAt is a Firestore Timestamp for new proofs.
                          // Old proofs only stored ms-epoch on `timestamp` — still
                          // read as a fallback so pre-contract records render.
                          const raw = p.capturedAt ?? p.timestamp;
                          let ms: number | null = null;
                          if (typeof raw === "number") ms = raw;
                          else if (raw && typeof raw === "object" && "seconds" in raw) {
                            ms = raw.seconds * 1000 + Math.floor((raw.nanoseconds ?? 0) / 1e6);
                          }
                          return ms ? new Date(ms).toLocaleString("en-PH", {
                            month: "short", day: "numeric", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          }) : "Date unavailable";
                        })()}
                      </Text>
                    </View>
                  </View>

                  {/* Coordinates row — prefer gps.{lat,lng}, fall back to flat
                      latitude/longitude on pre-contract proofs. */}
                  {(() => {
                    const lat = p.gps?.lat ?? p.latitude;
                    const lng = p.gps?.lng ?? p.longitude;
                    if (lat == null || lng == null) return null;
                    return (
                      <>
                        <View style={S.proofInfoDivider} />
                        <View style={S.proofInfoRow}>
                          <View style={[S.proofInfoIcon, { backgroundColor: COLORS.warningSoft }]}>
                            <FontAwesome5 name="crosshairs" size={10} color={COLORS.warning} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={S.proofInfoLabel}>
                              COORDINATES
                              {typeof p.accuracy === "number" && p.accuracy > 0
                                ? ` · ±${p.accuracy}m`
                                : ""}
                            </Text>
                            <Text style={S.proofInfoValue}>
                              {lat.toFixed(5)}, {lng.toFixed(5)}
                            </Text>
                          </View>
                        </View>
                      </>
                    );
                  })()}
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
            {!isCompleted && !needsReview && (
              <TouchableOpacity style={S.emptyBtn} onPress={() => actions.onAddProof(m)} activeOpacity={0.85}>
                {isLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><FontAwesome5 name="camera" size={14} color="#fff" /><Text style={S.emptyBtnText}>Take First Photo</Text></>
                }
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ══ MARK AS COMPLETED (gated on proof) ════════════════ */}
        {!isCompleted && !needsReview && actions.onMarkCompleted ? (
          <View style={S.markDoneCard}>
            <View style={S.markDoneHeader}>
              <View style={S.markDoneIconRing}>
                <FontAwesome5
                  name={canMarkCompleted ? "flag-checkered" : "lock"}
                  size={16}
                  color={canMarkCompleted ? COLORS.success : COLORS.textTertiary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.markDoneTitle}>
                  {canMarkCompleted ? "Ready to Close This Phase?" : "Attach Proof First"}
                </Text>
                <Text style={S.markDoneBody}>
                  {canMarkCompleted
                    ? "Marking this phase completed locks new proofs and updates project progress for HCSD."
                    : "Take at least one geotagged photo above. The Mark Completed button will unlock once HCSD has evidence on file."}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[S.markDoneBtn, !canMarkCompleted && S.markDoneBtnDisabled]}
              onPress={openMarkCompleted}
              activeOpacity={0.85}
              disabled={!canMarkCompleted || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome5
                    name="check-double"
                    size={13}
                    color={canMarkCompleted ? "#fff" : COLORS.textTertiary}
                  />
                  <Text
                    style={[
                      S.markDoneBtnText,
                      !canMarkCompleted && { color: COLORS.textTertiary },
                    ]}
                  >
                    Mark as Completed
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : null}

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
  proofLimitChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.successSoft,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12,
    borderWidth: 1, borderColor: "#A7F3D0",
  },
  proofLimitChipText: { fontSize: 11, fontWeight: "800", color: COLORS.success },

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

  // ── Spec card (AI-generated description / weight / duration) ─
  specCard: {
    backgroundColor: COLORS.surface, borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  aiTag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1, borderColor: COLORS.accentBorder,
    paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8,
    alignSelf: "flex-start", marginBottom: 12,
  },
  aiTagText: { fontSize: 9, fontWeight: "900", color: COLORS.primary, letterSpacing: 0.6 },
  specBlock: { marginBottom: 12 },
  specLabel: {
    fontSize: 9, fontWeight: "900", color: COLORS.textTertiary,
    letterSpacing: 0.7, marginBottom: 6,
  },
  specBody: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19 },
  specMetrics: {
    flexDirection: "row", gap: 10,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  specMetric: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.background, borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  specMetricLabel: { fontSize: 9, fontWeight: "800", color: COLORS.textTertiary, letterSpacing: 0.5 },
  specMetricValue: { fontSize: 12, fontWeight: "800", color: COLORS.textPrimary, marginLeft: "auto" },

  // ── Confirm card ─────────────────────────────────────────────
  confirmCard: {
    backgroundColor: COLORS.warningSoft,
    borderRadius: 18, padding: 18, alignItems: "center",
    borderWidth: 1, borderColor: "#FDE68A",
  },
  confirmIconRing: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    marginBottom: 10,
    borderWidth: 1, borderColor: "#FDE68A",
  },
  confirmTitle: { fontSize: 15, fontWeight: "900", color: COLORS.warning, marginBottom: 6 },
  confirmBody: {
    fontSize: 12, color: COLORS.warning, textAlign: "center",
    lineHeight: 17, fontWeight: "600", marginBottom: 14,
    paddingHorizontal: 6,
  },
  confirmBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14,
  },
  confirmBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  // ── Mark as Completed card ───────────────────────────────────
  markDoneCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18, padding: 16, gap: 14,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  markDoneHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  markDoneIconRing: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: COLORS.successSoft,
    alignItems: "center", justifyContent: "center",
  },
  markDoneTitle: { fontSize: 14, fontWeight: "800", color: COLORS.textPrimary, marginBottom: 3 },
  markDoneBody: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  markDoneBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.success,
    paddingVertical: 13, borderRadius: 14,
  },
  markDoneBtnDisabled: {
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
  },
  markDoneBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
