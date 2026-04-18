import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { COLORS } from "../constants";
import type { Milestone } from "../types";

type GenerateResult = {
  ok: boolean;
  count?: number;
  projectType?: string;
  errorCode?:
    | "unauthenticated"
    | "invalid-argument"
    | "not-found"
    | "permission-denied"
    | "already-exists"
    | "internal"
    | "unknown";
  errorMessage?: string;
};

interface MilestoneGenerationModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: () => Promise<GenerateResult>;
  // Drafts that have not been confirmed yet — drives the review step.
  draftMilestones: Milestone[];
  // Persists local edits + flips confirmed: true on every draft, in one batch.
  onSaveAndConfirmAll: (
    edits: Record<string, Partial<Milestone>>,
  ) => Promise<boolean>;
  // Removes a single draft milestone via Cloud Function (rules block client delete).
  onDeleteMilestone: (m: Milestone) => Promise<boolean>;
}

type Phase = "idle" | "loading" | "review" | "confirming" | "confirmed" | "error";

const ERROR_COPY: Record<string, { title: string; body: string; canRetry: boolean }> = {
  unauthenticated:    { title: "Session Expired",     body: "Please sign in again to generate milestones.",                                   canRetry: false },
  "invalid-argument": { title: "Invalid Request",     body: "The project reference is invalid. Try reopening the project.",                    canRetry: false },
  "not-found":        { title: "Project Not Found",   body: "This project may have been deleted or you no longer have access.",                canRetry: false },
  "permission-denied":{ title: "Not Authorized",      body: "Only the assigned Project Engineer can generate milestones for this project.",    canRetry: false },
  "already-exists":   { title: "Already Drafted",     body: "Milestones already exist for this project. Open the review to edit them.",        canRetry: false },
  internal:           { title: "AI Unavailable",      body: "The milestone generator is temporarily unavailable. You can retry once.",         canRetry: true  },
  unknown:            { title: "Generation Failed",   body: "Something went wrong while generating milestones. Please try again.",             canRetry: true  },
};

const projectTypeLabel = (raw?: string): string => {
  if (!raw) return "Construction";
  return raw.split("_").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ");
};

export const MilestoneGenerationModal = ({
  visible,
  onClose,
  onGenerate,
  draftMilestones,
  onSaveAndConfirmAll,
  onDeleteMilestone,
}: MilestoneGenerationModalProps) => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);

  // Per-milestone local edits — only the keys the engineer actually changed
  // are persisted on Confirm All. Stored by milestone id so deleted drafts
  // automatically drop out.
  const [edits, setEdits] = useState<Record<string, Partial<Milestone>>>({});

  // When the modal opens, decide where to land:
  //   • drafts already exist  → jump straight to review (resume flow)
  //   • drafts don't exist    → idle (show the call-to-action)
  // When it closes, reset phase + clear local edits so the next open is fresh.
  useEffect(() => {
    if (visible) {
      setEdits({});
      setGenResult(null);
      if (draftMilestones.length > 0) setPhase("review");
      else setPhase("idle");
    } else {
      setPhase("idle");
      setGenResult(null);
      setEdits({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // After a successful generate, the parent's listener feeds the new drafts
  // into `draftMilestones`. As soon as they arrive, transition into review.
  useEffect(() => {
    if (phase === "loading" && draftMilestones.length > 0) {
      setPhase("review");
    }
  }, [phase, draftMilestones.length]);

  const handleStart = async () => {
    setPhase("loading");
    const r = await onGenerate();
    setGenResult(r);
    if (!r.ok) setPhase("error");
    // success: the listener-driven effect above moves us into "review"
  };

  const handleRetry = () => {
    setGenResult(null);
    setPhase("idle");
  };

  const sortedDrafts = useMemo(
    () => [...draftMilestones].sort((a, b) => (a.sequence || 0) - (b.sequence || 0)),
    [draftMilestones],
  );

  // Apply a partial edit to a milestone. Stored only — nothing hits Firestore
  // until Confirm All.
  const updateEdit = (id: string, patch: Partial<Milestone>) => {
    setEdits((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const valueFor = <K extends keyof Milestone>(m: Milestone, key: K): Milestone[K] => {
    const e = edits[m.id];
    return (e && key in e ? (e[key] as Milestone[K]) : m[key]);
  };

  const handleDelete = (m: Milestone) => {
    Alert.alert(
      "Remove this phase?",
      `"${valueFor(m, "title") ?? m.title}" will be discarded. You can always re-generate later if you change your mind.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            const ok = await onDeleteMilestone(m);
            if (ok) {
              setEdits((prev) => {
                const { [m.id]: _drop, ...rest } = prev;
                return rest;
              });
            }
          },
        },
      ],
    );
  };

  const handleConfirmAll = async () => {
    if (sortedDrafts.length === 0) return;
    setPhase("confirming");
    const ok = await onSaveAndConfirmAll(edits);
    if (ok) {
      setPhase("confirmed");
      // Auto-dismiss so the user lands back in project details with the
      // freshly-confirmed phases visible (Generate UI is gone by then).
      setTimeout(onClose, 1400);
    } else {
      setPhase("review");
    }
  };

  const totalWeight = sortedDrafts.reduce((sum, m) => {
    const w = valueFor(m, "weightPercentage");
    return sum + (typeof w === "number" ? w : 0);
  }, 0);

  const allowBackdropClose = phase !== "loading" && phase !== "confirming";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={allowBackdropClose ? onClose : undefined}
    >
      <TouchableWithoutFeedback onPress={allowBackdropClose ? onClose : undefined}>
        <View style={S.backdrop} />
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        style={S.kbWrap}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        pointerEvents="box-none"
      >
        <View
          style={[S.card, phase === "review" && S.cardReview]}
          pointerEvents="box-none"
        >
          <View style={S.orb1} /><View style={S.orb2} />

          {/* ── Idle ── */}
          {phase === "idle" && (
            <View style={S.padded}>
              <View style={S.iconRing}>
                <View style={S.iconCircle}>
                  <FontAwesome5 name="robot" size={28} color={COLORS.primary} />
                </View>
              </View>

              <View style={S.aiBadge}>
                <FontAwesome5 name="bolt" size={9} color={COLORS.primary} />
                <Text style={S.aiBadgeText}>POWERED BY CLAUDE HAIKU 4.5</Text>
              </View>

              <Text style={S.title}>Generate Milestones with AI</Text>
              <Text style={S.desc}>
                Claude will draft 5–12 construction phases for this project. You'll review every phase, edit anything that needs adjusting, and remove what doesn't apply — nothing is saved to the project until you confirm.
              </Text>

              <View style={S.divider} />

              {[
                { icon: "edit",          text: "Edit titles and descriptions inline" },
                { icon: "trash-alt",     text: "Remove phases that don't apply" },
                { icon: "check-double",  text: "Confirm to lock in the workflow" },
              ].map((item) => (
                <View key={item.icon} style={S.featureRow}>
                  <View style={S.featureIcon}>
                    <FontAwesome5 name={item.icon} size={11} color={COLORS.primary} />
                  </View>
                  <Text style={S.featureText}>{item.text}</Text>
                </View>
              ))}

              <View style={S.actionRow}>
                <TouchableOpacity style={S.secondaryBtn} onPress={onClose} activeOpacity={0.85}>
                  <Text style={S.secondaryBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={S.primaryBtn} onPress={handleStart} activeOpacity={0.85}>
                  <FontAwesome5 name="magic" size={13} color="#fff" />
                  <Text style={S.primaryBtnText}>Generate Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Loading ── */}
          {phase === "loading" && (
            <View style={S.padded}>
              <View style={S.iconRing}>
                <View style={S.iconCircle}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              </View>
              <Text style={S.title}>Generating Milestones…</Text>
              <Text style={S.desc}>
                Claude is analyzing the project metadata and drafting phases. This usually takes 5–15 seconds.
              </Text>
              <View style={S.loadingHint}>
                <FontAwesome5 name="info-circle" size={11} color={COLORS.textTertiary} />
                <Text style={S.loadingHintText}>Don't close the app</Text>
              </View>
            </View>
          )}

          {/* ── Review (the main editor) ── */}
          {phase === "review" && (
            <View style={S.reviewWrap}>
              {/* Header */}
              <View style={S.reviewHeader}>
                <View style={{ flex: 1 }}>
                  <View style={S.reviewBadge}>
                    <FontAwesome5 name="robot" size={9} color={COLORS.primary} />
                    <Text style={S.reviewBadgeText}>
                      {projectTypeLabel(genResult?.projectType)} · DRAFT
                    </Text>
                  </View>
                  <Text style={S.reviewTitle}>Review Milestones</Text>
                  <Text style={S.reviewSub}>
                    {sortedDrafts.length} phase{sortedDrafts.length !== 1 ? "s" : ""} drafted · {totalWeight}% total weight
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={S.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <FontAwesome5 name="times" size={14} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Editable list */}
              <ScrollView
                style={S.reviewScroll}
                contentContainerStyle={S.reviewScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {sortedDrafts.length === 0 ? (
                  <View style={S.allRemovedBox}>
                    <FontAwesome5 name="exclamation-circle" size={20} color={COLORS.warning} />
                    <Text style={S.allRemovedText}>
                      All draft phases were removed. Re-generate to start over.
                    </Text>
                    <TouchableOpacity
                      style={[S.primaryBtn, { marginTop: 14 }]}
                      onPress={handleStart}
                      activeOpacity={0.85}
                    >
                      <FontAwesome5 name="magic" size={13} color="#fff" />
                      <Text style={S.primaryBtnText}>Re-generate</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  sortedDrafts.map((m, idx) => (
                    <View key={m.id} style={S.draftCard}>
                      {/* Top row: phase number + actions */}
                      <View style={S.draftTopRow}>
                        <View style={S.phaseDot}>
                          <Text style={S.phaseDotText}>{m.sequence ?? idx + 1}</Text>
                        </View>
                        <Text style={S.phaseLabel}>PHASE {m.sequence ?? idx + 1}</Text>
                        {typeof m.weightPercentage === "number" && (
                          <View style={S.draftWeight}>
                            <FontAwesome5 name="balance-scale" size={9} color={COLORS.primary} />
                            <Text style={S.draftWeightText}>{m.weightPercentage}%</Text>
                          </View>
                        )}
                        {typeof m.suggestedDurationDays === "number" && (
                          <View style={S.draftDuration}>
                            <FontAwesome5 name="calendar-alt" size={9} color={COLORS.textTertiary} />
                            <Text style={S.draftDurationText}>{m.suggestedDurationDays}d</Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => handleDelete(m)}
                          style={S.deleteBtn}
                          activeOpacity={0.7}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        >
                          <FontAwesome5 name="trash-alt" size={12} color={COLORS.error} />
                        </TouchableOpacity>
                      </View>

                      {/* Title */}
                      <Text style={S.fieldLabel}>TITLE</Text>
                      <TextInput
                        value={(valueFor(m, "title") as string) ?? ""}
                        onChangeText={(t) => updateEdit(m.id, { title: t })}
                        placeholder="Phase title"
                        placeholderTextColor={COLORS.textTertiary}
                        style={S.titleInput}
                        multiline
                      />

                      {/* Description */}
                      <Text style={[S.fieldLabel, { marginTop: 10 }]}>DESCRIPTION</Text>
                      <TextInput
                        value={(valueFor(m, "description") as string) ?? ""}
                        onChangeText={(t) => updateEdit(m.id, { description: t })}
                        placeholder="What field activity proves this phase is done?"
                        placeholderTextColor={COLORS.textTertiary}
                        style={S.descInput}
                        multiline
                      />
                    </View>
                  ))
                )}
              </ScrollView>

              {/* Footer */}
              {sortedDrafts.length > 0 && (
                <View style={S.reviewFooter}>
                  <TouchableOpacity style={S.secondaryBtn} onPress={onClose} activeOpacity={0.85}>
                    <Text style={S.secondaryBtnText}>Save Later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={S.primaryBtn} onPress={handleConfirmAll} activeOpacity={0.85}>
                    <FontAwesome5 name="check-double" size={13} color="#fff" />
                    <Text style={S.primaryBtnText}>Confirm All</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ── Confirming (loading state for Confirm All) ── */}
          {phase === "confirming" && (
            <View style={S.padded}>
              <View style={S.iconRing}>
                <View style={S.iconCircle}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              </View>
              <Text style={S.title}>Confirming Milestones…</Text>
              <Text style={S.desc}>
                Saving your edits and locking in the workflow. Just a moment.
              </Text>
            </View>
          )}

          {/* ── Confirmed (auto-dismiss) ── */}
          {phase === "confirmed" && (
            <View style={S.padded}>
              <View style={[S.iconRing, { backgroundColor: COLORS.successSoft, borderColor: "#A7F3D0" }]}>
                <View style={S.iconCircle}>
                  <FontAwesome5 name="check" size={30} color={COLORS.success} />
                </View>
              </View>
              <Text style={S.title}>Milestones Confirmed</Text>
              <Text style={S.desc}>
                Your construction phases are now live in the project details. You can start uploading proof of work.
              </Text>
            </View>
          )}

          {/* ── Error ── */}
          {phase === "error" && genResult?.errorCode && (
            <View style={S.padded}>
              {(() => {
                const copy = ERROR_COPY[genResult.errorCode] || ERROR_COPY.unknown;
                return (
                  <>
                    <View style={[S.iconRing, { backgroundColor: COLORS.errorSoft, borderColor: "#FECACA" }]}>
                      <View style={S.iconCircle}>
                        <FontAwesome5 name="exclamation-triangle" size={26} color={COLORS.error} />
                      </View>
                    </View>
                    <Text style={S.title}>{copy.title}</Text>
                    <Text style={S.desc}>{copy.body}</Text>
                    <View style={S.actionRow}>
                      <TouchableOpacity style={S.secondaryBtn} onPress={onClose} activeOpacity={0.85}>
                        <Text style={S.secondaryBtnText}>Close</Text>
                      </TouchableOpacity>
                      {copy.canRetry ? (
                        <TouchableOpacity style={S.primaryBtn} onPress={handleRetry} activeOpacity={0.85}>
                          <FontAwesome5 name="redo" size={13} color="#fff" />
                          <Text style={S.primaryBtnText}>Try Again</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </>
                );
              })()}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const S = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)" },
  kbWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center", justifyContent: "center", paddingHorizontal: 18,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 28, width: "100%",
    alignItems: "center", overflow: "hidden",
    elevation: 24, shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 24,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardReview: {
    // Fixed height in review mode so the inner ScrollView has bounds to flex into.
    height: "88%",
    width: "100%",
    alignItems: "stretch",
  },
  padded: { padding: 28, alignItems: "center", width: "100%" },

  orb1: {
    position: "absolute", width: 180, height: 180, borderRadius: 90,
    backgroundColor: COLORS.primarySoft, top: -70, right: -60,
  },
  orb2: {
    position: "absolute", width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primarySoft, bottom: -40, left: -30,
  },

  iconRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16, borderWidth: 2, borderColor: COLORS.accentBorder,
  },
  iconCircle: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },

  aiBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1, borderColor: COLORS.accentBorder,
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, marginBottom: 14,
  },
  aiBadgeText: { fontSize: 10, fontWeight: "900", color: COLORS.primary, letterSpacing: 0.6 },

  title: {
    fontSize: 20, fontWeight: "900", color: COLORS.textPrimary,
    textAlign: "center", marginBottom: 10,
  },
  desc: {
    fontSize: 13, color: COLORS.textSecondary, textAlign: "center",
    lineHeight: 20, fontWeight: "500", marginBottom: 6,
  },

  divider: { height: 1, backgroundColor: COLORS.border, width: "100%", marginVertical: 14 },

  featureRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    alignSelf: "stretch", marginBottom: 10,
  },
  featureIcon: {
    width: 30, height: 30, borderRadius: 9,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  featureText: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, flex: 1 },

  actionRow: {
    flexDirection: "row", gap: 10, marginTop: 18, alignSelf: "stretch",
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.primary,
    paddingVertical: 14, borderRadius: 16,
  },
  primaryBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },
  secondaryBtn: {
    flex: 1,
    paddingVertical: 14, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: "700", color: COLORS.textSecondary },

  loadingHint: {
    flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6,
  },
  loadingHintText: { fontSize: 11, color: COLORS.textTertiary, fontWeight: "600" },

  // ── Review step ────────────────────────────────────────────────
  reviewWrap: { width: "100%", flex: 1 },
  reviewHeader: {
    flexDirection: "row", alignItems: "flex-start",
    paddingHorizontal: 22, paddingTop: 22, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  reviewBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1, borderColor: COLORS.accentBorder,
    paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8,
    alignSelf: "flex-start", marginBottom: 8,
  },
  reviewBadgeText: { fontSize: 9, fontWeight: "900", color: COLORS.primary, letterSpacing: 0.6 },
  reviewTitle: { fontSize: 18, fontWeight: "900", color: COLORS.textPrimary },
  reviewSub:   { fontSize: 11, color: COLORS.textSecondary, fontWeight: "600", marginTop: 3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: COLORS.background,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: COLORS.border,
  },
  reviewScroll: { flex: 1 },
  reviewScrollContent: {
    paddingHorizontal: 18, paddingVertical: 14, gap: 12,
  },

  draftCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  draftTopRow: {
    flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 10,
  },
  phaseDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.primarySoft,
    borderWidth: 1, borderColor: COLORS.accentBorder,
    alignItems: "center", justifyContent: "center",
  },
  phaseDotText: { fontSize: 10, fontWeight: "900", color: COLORS.primary },
  phaseLabel: { fontSize: 9, fontWeight: "900", color: COLORS.textTertiary, letterSpacing: 0.6, flex: 1 },

  draftWeight: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  draftWeightText: { fontSize: 9, fontWeight: "800", color: COLORS.primary },
  draftDuration: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  draftDurationText: { fontSize: 9, fontWeight: "800", color: COLORS.textSecondary },

  deleteBtn: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: COLORS.errorSoft,
    borderWidth: 1, borderColor: "#FECACA",
    alignItems: "center", justifyContent: "center",
  },

  fieldLabel: {
    fontSize: 9, fontWeight: "900", color: COLORS.textTertiary,
    letterSpacing: 0.6, marginBottom: 6,
  },
  titleInput: {
    fontSize: 14, fontWeight: "700", color: COLORS.textPrimary,
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
    minHeight: 40,
  },
  descInput: {
    fontSize: 12, color: COLORS.textSecondary,
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
    minHeight: 64, textAlignVertical: "top",
    lineHeight: 17,
  },

  reviewFooter: {
    flexDirection: "row", gap: 10,
    paddingHorizontal: 18, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },

  allRemovedBox: {
    alignItems: "center", padding: 24, gap: 8,
    backgroundColor: COLORS.warningSoft,
    borderRadius: 16, borderWidth: 1, borderColor: "#FDE68A",
  },
  allRemovedText: {
    fontSize: 13, color: COLORS.warning, textAlign: "center",
    fontWeight: "600", lineHeight: 18,
  },
});
