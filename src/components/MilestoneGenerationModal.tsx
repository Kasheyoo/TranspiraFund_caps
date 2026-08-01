import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  ZoomOut,
} from "react-native-reanimated";
import { COLORS } from "../constants";
import type { Milestone } from "../types";
import {
  applyAddition,
  applyDeletion,
  applyDurationOverride,
  applyTextEdit,
  checkTitleStructure,
  cumulativeDayMarkers,
  flushDurationBuffers,
  fromMilestones,
  MAX_PHASES,
  redistributeDurations,
  totalDurationDays,
  totalWeight as totalWeightOf,
  validateDraft,
  type DraftPhase,
} from "../utils/milestonePlan";

type GenerateResult = {
  ok: boolean;
  count?: number;
  usedFallback?: boolean;
  fallbackSourceProject?: string;
  windowDays?: number | null;
  scheduledDays?: number;
  overflowDays?: number;
  errorCode?:
    | "unauthenticated"
    | "invalid-argument"
    | "not-found"
    | "permission-denied"
    | "already-exists"
    | "resource-exhausted"
    | "failed-precondition"
    | "deadline-exceeded"
    | "unavailable"
    | "internal"
    | "milestone-validation-failed"
    | "milestone-generator-misconfigured"
    | "unknown";
  errorMessage?: string;
};

interface MilestoneGenerationModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: () => Promise<GenerateResult>;

  draftMilestones: Milestone[];

  onSaveAndConfirmAll: (
    draft: DraftPhase[],
  ) => Promise<{ ok: boolean; errorMessage?: string }>;

  // Optional semantic (Layer B) title check. When absent or unreachable,
  // Layer A structural checks remain the only client-side gate.
  onValidateTitle?: (title: string) => Promise<{ valid: boolean; reason?: string }>;

  // Project window basis for the calendar-days chip row and add/delete
  // redistribution. null when project dates are missing/invalid — the modal
  // hides the numeric chips and shows a neutral placeholder in that case.
  windowDays?: number | null;
  startDate?: string | null;
  completionDate?: string | null;
}

type Phase = "idle" | "loading" | "review" | "confirming" | "confirmed" | "error";

const ERROR_COPY: Record<string, { title: string; body: string; canRetry: boolean }> = {
  unauthenticated:    { title: "Session Expired",     body: "Please sign in again to generate milestones.",                                   canRetry: false },
  "invalid-argument": { title: "Invalid Request",     body: "The project reference is invalid. Try reopening the project.",                    canRetry: false },
  "not-found":        { title: "Project Not Found",   body: "This project may have been deleted or you no longer have access.",                canRetry: false },
  "permission-denied":{ title: "Not Authorized",      body: "Only the assigned Project Engineer can generate milestones for this project.",    canRetry: false },
  "already-exists":   { title: "Already Drafted",     body: "Milestones already exist for this project. Open the review to edit them.",        canRetry: false },
  "resource-exhausted":{ title: "Daily Limit Reached", body: "You've reached the daily milestone-generation limit. Please try again later.",   canRetry: false },
  "failed-precondition":{ title: "Project classification incomplete", body: "This project's name has not been verified as a city-funded barangay-level infrastructure project. Please contact the Head of Construction Services to re-verify the project before generating milestones.", canRetry: false },
  "milestone-validation-failed":{ title: "Milestones could not be generated", body: "The system was unable to produce milestones that align with the project's infrastructure scope and duration. Please notify the Head of Construction Services.", canRetry: false },
  "milestone-generator-misconfigured": { title: "Milestone Generator Offline", body: "The milestone generator is not properly configured on the server. Please report this to the Head of Construction Services so they can restore the service. Retrying will not help until it is fixed.", canRetry: false },
  "deadline-exceeded": { title: "Took Too Long",      body: "The request timed out. Check your connection and try again.",                     canRetry: true  },
  unavailable:        { title: "Server Busy",         body: "The milestone generator is temporarily busy. Please try again in a moment.",      canRetry: true  },
  internal:           { title: "AI Unavailable",      body: "The milestone generator is temporarily unavailable. You can retry once.",         canRetry: true  },
  unknown:            { title: "Generation Failed",   body: "Something went wrong while generating milestones. Please try again.",             canRetry: true  },
};

export const MilestoneGenerationModal = ({
  visible,
  onClose,
  onGenerate,
  draftMilestones,
  onSaveAndConfirmAll,
  onValidateTitle,
  windowDays,
  startDate,
  completionDate,
}: MilestoneGenerationModalProps) => {
  const [phase, setPhase] = useState<Phase>(() =>
    visible && draftMilestones.length > 0 ? "review" : "idle",
  );
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // Local draft array — every edit/add/delete goes through milestonePlan
  // utilities so weight totals stay at 100% and sequences stay dense 1..N.
  const [draft, setDraft] = useState<DraftPhase[]>(() =>
    visible && draftMilestones.length > 0 ? fromMilestones(draftMilestones) : [],
  );
  // Ref shadow so async Layer B responses can check the current title at
  // resolve time and silently discard stale verdicts.
  const draftRef = useRef<DraftPhase[]>(draft);
  useEffect(() => { draftRef.current = draft; }, [draft]);

  const [isAdding, setIsAdding] = useState(false);
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addDuration, setAddDuration] = useState("");
  const [addError, setAddError] = useState<string | null>(null);
  const [addValidating, setAddValidating] = useState(false);
  const addTitleRef = useRef("");

  // Per-phase inline title errors (Layer A on blur, Layer B on response).
  const [titleErrors, setTitleErrors] = useState<Record<string, string>>({});
  const lastValidatedTitles = useRef<Record<string, string>>({});

  // Per-phase raw edit buffer for the duration TextInput. Decouples on-screen
  // typing (empty, "0", intermediate values) from committed DraftPhase state.
  // Ref shadows the state and is written synchronously so blur/Confirm-All
  // handlers never see a stale buffer when typing outruns React state.
  const [durationBuffers, setDurationBuffers] = useState<Record<string, string>>({});
  const durationBuffersRef = useRef<Record<string, string>>({});
  useEffect(() => { durationBuffersRef.current = durationBuffers; }, [durationBuffers]);

  // Keep the native Modal mounted long enough for the reanimated exit
  // animation to play before unmounting.
  const EXIT_DURATION_MS = 240;
  const [mounted, setMounted] = useState(visible);
  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const t = setTimeout(() => setMounted(false), EXIT_DURATION_MS);
    return () => clearTimeout(t);
  }, [visible, mounted]);

  const resetAddState = () => {
    setIsAdding(false);
    setAddTitle("");
    addTitleRef.current = "";
    setAddDescription("");
    setAddDuration("");
    setAddError(null);
    setAddValidating(false);
  };

  // Reset open-state synchronously during render (not in an effect) so the
  // correct phase is painted on the very first visible frame — no idle or
  // stale-phase flash, including reopen while `mounted` is still true.
  const [prevVisible, setPrevVisible] = useState(visible);
  if (visible !== prevVisible) {
    setPrevVisible(visible);
    if (visible) {
      setGenResult(null);
      setPendingDeleteId(null);
      resetAddState();
      setTitleErrors({});
      lastValidatedTitles.current = {};
      durationBuffersRef.current = {};
      setDurationBuffers({});
      if (draftMilestones.length > 0) {
        setDraft(fromMilestones(draftMilestones));
        setPhase("review");
      } else {
        setDraft([]);
        setPhase("idle");
      }
    }
  }

  useEffect(() => {
    if (phase === "loading" && draftMilestones.length > 0) {
      setDraft(fromMilestones(draftMilestones));
      durationBuffersRef.current = {};
      setDurationBuffers({});
      setPhase("review");
    }
  }, [phase, draftMilestones]);

  const handleStart = async () => {
    setPhase("loading");
    const r = await onGenerate();
    setGenResult(r);
    if (!r.ok) setPhase("error");
  };

  const handleRetry = () => {
    setGenResult(null);
    setPhase("idle");
  };

  const activeDraft = useMemo(
    () => draft.filter((p) => !p._pendingDelete),
    [draft],
  );

  const dayMarkers = useMemo(() => cumulativeDayMarkers(draft), [draft]);
  const allocatedDays = useMemo(() => totalDurationDays(draft), [draft]);
  const windowDelta =
    windowDays !== null && windowDays !== undefined
      ? allocatedDays - windowDays
      : 0;
  const hasWindow = windowDays !== null && windowDays !== undefined;

  const handleTextChange = (id: string, field: "title" | "description", value: string) => {
    setDraft((prev) => applyTextEdit(prev, id, field, value));
    if (field === "title" && titleErrors[id]) {
      setTitleErrors((prev) => {
        const { [id]: _dropped, ...rest } = prev;
        return rest;
      });
    }
  };

  // Title commit on end-of-editing (mirrors commitDuration): Layer A runs
  // synchronously; Layer B fires async and its verdict is applied only if the
  // phase still holds the exact title that was validated (stale-guard).
  const commitTitle = (id: string) => {
    const p = draftRef.current.find((x) => x.id === id);
    if (!p) return;
    const title = p.title.trim();
    if (title.length === 0) return; // validateDraft already blocks empty titles
    const structure = checkTitleStructure(title);
    if (!structure.ok) {
      setTitleErrors((prev) => ({ ...prev, [id]: structure.reason }));
      return;
    }
    if (!onValidateTitle || lastValidatedTitles.current[id] === title) return;
    lastValidatedTitles.current[id] = title;
    onValidateTitle(title)
      .then((verdict) => {
        const current = draftRef.current.find((x) => x.id === id);
        if (!current || current.title.trim() !== title) return; // stale — discard
        if (!verdict.valid) {
          delete lastValidatedTitles.current[id];
          setTitleErrors((prev) => ({
            ...prev,
            [id]: verdict.reason ?? "This title doesn't look like a valid construction phase.",
          }));
        }
      })
      .catch(() => {});
  };

  const handleDurationChange = (id: string, raw: string) => {
    const cleaned = raw.replace(/[^0-9]/g, "").slice(0, 3);
    // Sync ref immediately so a Confirm-All tap right after fast typing sees
    // the latest buffer without waiting for React state to settle.
    durationBuffersRef.current = { ...durationBuffersRef.current, [id]: cleaned };
    setDurationBuffers((prev) => ({ ...prev, [id]: cleaned }));
  };

  const commitDuration = (id: string) => {
    const raw = durationBuffersRef.current[id];
    if (raw === undefined) return;
    const cleaned = raw.replace(/[^0-9]/g, "");
    const parsed = cleaned === "" ? NaN : parseInt(cleaned, 10);
    if (Number.isFinite(parsed)) {
      const num = Math.min(999, Math.max(1, parsed));
      setDraft((d) => applyDurationOverride(d, id, num));
    }
    // Empty or unparseable → drop the buffer, reverting the field to the last
    // committed value (no forced 1). Sync ref same tick so a duplicate blur
    // fire (onEndEditing + onBlur) is a true no-op, not a double recompute.
    const { [id]: _dropped, ...rest } = durationBuffersRef.current;
    durationBuffersRef.current = rest;
    setDurationBuffers(rest);
  };

  const handleDelete = (id: string) => setPendingDeleteId(id);

  const cancelPendingDelete = () => setPendingDeleteId(null);

  const confirmPendingDelete = () => {
    if (!pendingDeleteId) return;
    const id = pendingDeleteId;
    // Snapshot the buffer ref BEFORE setDraft — same reason as confirmAdd.
    const buffers = durationBuffersRef.current;
    setDraft((prev) => {
      const flushed = flushDurationBuffers(prev, buffers);
      const deletedDraft = applyDeletion(flushed, id);
      return redistributeDurations(deletedDraft, windowDays ?? null);
    });
    // Redistribution may have rewritten durations on other phases, so any
    // remaining buffer text would mask the redistributed values. Clear all.
    durationBuffersRef.current = {};
    setDurationBuffers({});
    setPendingDeleteId(null);
  };

  const startAdding = () => {
    resetAddState();
    setIsAdding(true);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setAddError(null);
  };

  const confirmAdd = async () => {
    const title = addTitle.trim();
    const description = addDescription.trim();
    const d = parseFloat(addDuration);

    if (title.length === 0) {
      setAddError("Title is required.");
      return;
    }
    const structure = checkTitleStructure(title);
    if (!structure.ok) {
      setAddError(structure.reason);
      return;
    }
    if (!Number.isFinite(d) || d < 1 || d > 999) {
      setAddError("Duration must be a number of days between 1 and 999.");
      return;
    }
    if (activeDraft.length >= MAX_PHASES) {
      setAddError(`Cannot exceed ${MAX_PHASES} phases.`);
      return;
    }

    if (onValidateTitle) {
      setAddValidating(true);
      let verdict: { valid: boolean; reason?: string };
      try {
        verdict = await onValidateTitle(title);
      } catch {
        verdict = { valid: true }; // unreachable Layer B never blocks adds
      }
      setAddValidating(false);
      // Stale-guard: apply the verdict only if the form still holds the exact
      // title that was validated; otherwise discard silently.
      if (addTitleRef.current.trim() !== title) return;
      if (!verdict.valid) {
        setAddError(verdict.reason ?? "This title doesn't look like a valid construction phase.");
        return;
      }
    }

    const newId = `new_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const enteredDuration = Math.floor(d);
    // Snapshot the buffer ref BEFORE setDraft. The clear below runs
    // synchronously after setDraft returns while the updater fires later
    // during render — reading the ref inside the updater would silently
    // read the already-cleared value and drop in-flight typed durations.
    const buffers = durationBuffersRef.current;
    setDraft((prev) => {
      const flushed = flushDurationBuffers(prev, buffers);
      const added = applyAddition(flushed, {
        id: newId,
        title,
        description,
        suggestedDurationDays: enteredDuration,
      });
      return redistributeDurations(added, windowDays ?? null, {
        preserveId: newId,
        preserveValue: enteredDuration,
      });
    });
    durationBuffersRef.current = {};
    setDurationBuffers({});
    resetAddState();
  };

  const validation = useMemo(() => validateDraft(draft), [draft]);
  const totalWeight = useMemo(() => totalWeightOf(draft), [draft]);
  // Only errors on still-active phases block confirm, so stale keys from
  // deleted/regenerated phases can never wedge the button. Errors are only
  // ever set from resolved responses, so an unreachable Layer B never blocks.
  const hasTitleErrors = useMemo(
    () => activeDraft.some((p) => !!titleErrors[p.id]),
    [activeDraft, titleErrors],
  );
  const canConfirm = validation.ok && activeDraft.length > 0 && !hasTitleErrors;

  const handleConfirmAll = async () => {
    if (!canConfirm) return;

    // Flush any pending un-blurred edits so a user who typed and immediately
    // tapped Confirm All gets the typed value persisted, not the stale one.
    const flushed = flushDurationBuffers(draft, durationBuffersRef.current);
    if (flushed !== draft) setDraft(flushed);
    durationBuffersRef.current = {};
    setDurationBuffers({});

    setPhase("confirming");
    const result = await onSaveAndConfirmAll(flushed);
    if (result.ok) {
      setPhase("confirmed");
      setTimeout(onClose, 1400);
    } else {
      setPhase("review");
    }
  };

  const allowBackdropClose = phase !== "loading" && phase !== "confirming";

  if (!mounted) return null;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={allowBackdropClose ? onClose : undefined}
    >
      {visible ? (
        <>
          <TouchableWithoutFeedback onPress={allowBackdropClose ? onClose : undefined}>
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={FadeOut.duration(180)}
              style={S.backdrop}
            />
          </TouchableWithoutFeedback>

          <KeyboardAvoidingView
            style={S.kbWrap}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            pointerEvents="box-none"
          >
            <Animated.View
              entering={FadeIn.duration(180)}
              exiting={ZoomOut.duration(200)}
              layout={LinearTransition.duration(200)}
              style={[S.card, phase === "review" && S.cardReview]}
              pointerEvents="box-none"
            >
          <View style={S.orb1} /><View style={S.orb2} />

          {phase === "idle" && (
            <View style={S.padded}>
              <View style={S.iconRing}>
                <View style={S.iconCircle}>
                  <FontAwesome5 name="robot" size={28} color={COLORS.primary} />
                </View>
              </View>

              <View style={S.aiBadge}>
                <FontAwesome5 name="bolt" size={9} color={COLORS.primary} />
                <Text style={S.aiBadgeText}>AI GENERATED MILESTONE</Text>
              </View>

              <Text style={S.title}>Generate Milestones with AI</Text>
              <Text style={S.desc}>
                AI will draft 5–12 construction phases for this project. You'll review every phase, edit anything that needs adjusting, and remove what doesn't apply — nothing is saved to the project until you confirm.
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

          {phase === "loading" && (
            <View style={S.padded}>
              <View style={S.iconRing}>
                <View style={S.iconCircle}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              </View>
              <Text style={S.title}>Generating Milestones…</Text>
              <Text style={S.desc}>
                Analyzing the project metadata and drafting phases. This usually takes 5–15 seconds.
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
                    <Text style={S.reviewBadgeText}>DRAFT</Text>
                  </View>
                  <Text style={S.reviewTitle}>Review Milestones</Text>
                  <Text style={S.reviewSub}>
                    {activeDraft.length} phase{activeDraft.length !== 1 ? "s" : ""} ·{" "}
                    <Text style={totalWeight !== 100 && activeDraft.length > 0 ? S.weightFlag : undefined}>
                      {totalWeight}% total weight
                    </Text>
                    {!validation.ok && activeDraft.length > 0 ? ` · ${validation.reason}` : ""}
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

              {/* Plan basis chip row — start/target/window/allocated. Hidden
                  during add/delete states to keep the footer real estate
                  focused on the pending action. */}
              {!isAdding && !pendingDeleteId ? (
                <View style={S.chipRow}>
                  {hasWindow ? (
                    <>
                      {startDate ? (
                        <View style={S.winChip}>
                          <FontAwesome5 name="calendar-alt" size={9} color={COLORS.textSecondary} />
                          <Text style={S.winChipText}>Start: {startDate}</Text>
                        </View>
                      ) : null}
                      {completionDate ? (
                        <View style={S.winChip}>
                          <FontAwesome5 name="calendar-alt" size={9} color={COLORS.textSecondary} />
                          <Text style={S.winChipText}>Target: {completionDate}</Text>
                        </View>
                      ) : null}
                      <View style={S.winChip}>
                        <FontAwesome5 name="clock" size={9} color={COLORS.textSecondary} />
                        <Text style={S.winChipText}>
                          {windowDays} calendar day{windowDays === 1 ? "" : "s"}
                        </Text>
                      </View>
                      <View
                        style={[
                          S.winChip,
                          windowDelta > 0 && S.winChipOver,
                          windowDelta < 0 && S.winChipUnder,
                        ]}
                      >
                        <FontAwesome5
                          name="balance-scale"
                          size={9}
                          color={
                            windowDelta > 0
                              ? COLORS.error
                              : windowDelta < 0
                                ? COLORS.warning
                                : COLORS.textSecondary
                          }
                        />
                        <Text
                          style={[
                            S.winChipText,
                            windowDelta > 0 && S.winChipOverText,
                            windowDelta < 0 && S.winChipUnderText,
                          ]}
                        >
                          {windowDelta === 0
                            ? `${allocatedDays} allocated · balanced`
                            : windowDelta > 0
                              ? `${allocatedDays} allocated · +${windowDelta} over window`
                              : `${allocatedDays} allocated · ${windowDelta} under window`}
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View style={S.winChip}>
                      <FontAwesome5 name="info-circle" size={9} color={COLORS.textTertiary} />
                      <Text style={S.winChipText}>
                        Project window unavailable — dates missing
                      </Text>
                    </View>
                  )}
                </View>
              ) : null}

              {genResult?.usedFallback ? (
                <View style={S.fallbackBanner}>
                  <FontAwesome5 name="exclamation-circle" size={13} color={COLORS.warning} />
                  <Text style={S.fallbackBannerText}>
                    {`AI generation unavailable, showing validated DEPW reference milestones for this project type. Please review and adjust.${
                      genResult.fallbackTruncated
                        ? ` Kept the first ${genResult.fallbackKeptCount} of ${genResult.fallbackOriginalCount} phases from "${genResult.fallbackSourceProject}" to fit the ${MAX_PHASES}-phase plan limit.`
                        : ""
                    }`}
                  </Text>
                </View>
              ) : null}

              {genResult?.overflowDays && genResult.overflowDays > 0 ? (
                <View style={S.overflowBanner}>
                  <FontAwesome5 name="exclamation-triangle" size={13} color={COLORS.error} />
                  <Text style={S.overflowBannerText}>
                    This schedule needs {genResult.scheduledDays} calendar days but the project window is only {genResult.windowDays}. Extend the project end date or remove phases before confirming.
                  </Text>
                </View>
              ) : null}

              {/* Editable list — replaced by the manual-add form while isAdding. */}
              <ScrollView
                style={S.reviewScroll}
                contentContainerStyle={S.reviewScrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {isAdding ? (
                  <View style={S.draftCard}>
                    <View style={S.draftTopRow}>
                      <View style={S.phaseDot}>
                        <FontAwesome5 name="plus" size={10} color={COLORS.primary} />
                      </View>
                      <Text style={S.phaseLabel}>NEW PHASE</Text>
                    </View>

                    <Text style={S.fieldLabel}>TITLE</Text>
                    <TextInput
                      value={addTitle}
                      onChangeText={(t) => { addTitleRef.current = t; setAddTitle(t); }}
                      placeholder="Phase title"
                      placeholderTextColor={COLORS.textTertiary}
                      style={S.titleInput}
                      multiline
                      maxLength={120}
                    />

                    <Text style={[S.fieldLabel, { marginTop: 10 }]}>DESCRIPTION</Text>
                    <TextInput
                      value={addDescription}
                      onChangeText={setAddDescription}
                      placeholder="What field activity proves this phase is done?"
                      placeholderTextColor={COLORS.textTertiary}
                      style={S.descInput}
                      multiline
                      maxLength={600}
                    />

                    <View style={S.addRow}>
                      <View style={S.addCol}>
                        <Text style={S.fieldLabel}>DURATION (days)</Text>
                        <TextInput
                          value={addDuration}
                          onChangeText={setAddDuration}
                          placeholder="1–999"
                          placeholderTextColor={COLORS.textTertiary}
                          style={S.numInput}
                          keyboardType="numeric"
                          maxLength={3}
                        />
                      </View>
                      <View style={S.addCol}>
                        <Text style={S.fieldLabel}>WEIGHT</Text>
                        <View style={S.numReadonly}>
                          <Text style={S.numReadonlyText}>Auto</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={S.formulaHint}>
                      Weight is computed from duration to keep the total at 100%.
                    </Text>

                    {addError ? (
                      <Text style={S.addErrorText}>{addError}</Text>
                    ) : null}
                  </View>
                ) : activeDraft.length === 0 ? (
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
                  <>
                    {activeDraft.map((p, idx) => (
                      <View key={p.id} style={S.draftCard}>
                        <View style={S.draftTopRow}>
                          <View style={S.phaseDot}>
                            <Text style={S.phaseDotText}>{p.sequence}</Text>
                          </View>
                          <Text style={S.phaseLabel}>PHASE {p.sequence}</Text>
                          <View style={S.draftWeight}>
                            <FontAwesome5 name="balance-scale" size={9} color={COLORS.primary} />
                            <Text style={S.draftWeightText}>{p.weightPercentage}%</Text>
                          </View>
                          <TouchableOpacity
                            onPress={() => handleDelete(p.id)}
                            style={S.deleteBtn}
                            activeOpacity={0.7}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <FontAwesome5 name="trash-alt" size={12} color={COLORS.error} />
                          </TouchableOpacity>
                        </View>

                        <Text style={S.fieldLabel}>TITLE</Text>
                        <TextInput
                          value={p.title}
                          onChangeText={(t) => handleTextChange(p.id, "title", t)}
                          onEndEditing={() => commitTitle(p.id)}
                          onBlur={() => commitTitle(p.id)}
                          placeholder="Phase title"
                          placeholderTextColor={COLORS.textTertiary}
                          style={S.titleInput}
                          multiline
                          maxLength={120}
                        />
                        {titleErrors[p.id] ? (
                          <Text style={S.addErrorText}>{titleErrors[p.id]}</Text>
                        ) : null}

                        <Text style={[S.fieldLabel, { marginTop: 10 }]}>DESCRIPTION</Text>
                        <TextInput
                          value={p.description ?? ""}
                          onChangeText={(t) => handleTextChange(p.id, "description", t)}
                          placeholder="What field activity proves this phase is done?"
                          placeholderTextColor={COLORS.textTertiary}
                          style={S.descInput}
                          multiline
                          maxLength={600}
                        />

                        <View style={S.addRow}>
                          <View style={S.addCol}>
                            <Text style={S.fieldLabel}>DURATION (days)</Text>
                            <TextInput
                              value={durationBuffers[p.id] ?? String(p.suggestedDurationDays)}
                              onChangeText={(t) => handleDurationChange(p.id, t)}
                              onEndEditing={() => commitDuration(p.id)}
                              onBlur={() => commitDuration(p.id)}
                              placeholder="1–999"
                              placeholderTextColor={COLORS.textTertiary}
                              style={S.numInput}
                              keyboardType="numeric"
                              maxLength={3}
                            />
                          </View>
                          <View style={S.addCol}>
                            <Text style={S.fieldLabel}>EXPECTED COMPLETION</Text>
                            <View style={S.numReadonly}>
                              <Text style={S.numReadonlyText}>
                                Day {dayMarkers[idx] ?? p.suggestedDurationDays}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    ))}

                    {activeDraft.length < MAX_PHASES && (
                      <TouchableOpacity
                        style={S.addTile}
                        onPress={startAdding}
                        activeOpacity={0.85}
                      >
                        <View style={S.addTileIcon}>
                          <FontAwesome5 name="plus" size={14} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={S.addTileTitle}>Add Milestone</Text>
                          <Text style={S.addTileSub}>
                            Append a phase manually (weights auto-rebalance)
                          </Text>
                        </View>
                        <FontAwesome5 name="chevron-right" size={11} color={COLORS.textTertiary} />
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </ScrollView>

              {/* Footer — inline delete confirmation replaces the regular
                  Save Later / Confirm All buttons while a delete is pending. */}
              {pendingDeleteId ? (() => {
                const target = activeDraft.find((p) => p.id === pendingDeleteId);
                return (
                  <View style={S.deleteBar}>
                    <View style={S.deleteBarHeader}>
                      <View style={S.deleteBarIconRing}>
                        <FontAwesome5 name="trash-alt" size={14} color={COLORS.error} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={S.deleteBarTitle}>Remove this phase?</Text>
                        <Text style={S.deleteBarBody} numberOfLines={2}>
                          "{target?.title ?? "This phase"}" will be removed. Remaining phases will renumber and weights will rebalance.
                        </Text>
                      </View>
                    </View>
                    <View style={S.deleteBarActions}>
                      <TouchableOpacity
                        style={S.secondaryBtn}
                        onPress={cancelPendingDelete}
                        activeOpacity={0.85}
                      >
                        <Text style={S.secondaryBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[S.primaryBtn, S.deleteBarConfirm]}
                        onPress={confirmPendingDelete}
                        activeOpacity={0.85}
                      >
                        <FontAwesome5 name="trash-alt" size={13} color="#fff" />
                        <Text style={S.primaryBtnText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })() : isAdding ? (
                <View style={S.reviewFooter}>
                  <TouchableOpacity
                    style={S.secondaryBtn}
                    onPress={cancelAdding}
                    activeOpacity={0.85}
                  >
                    <Text style={S.secondaryBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[S.primaryBtn, addValidating && { opacity: 0.7 }]}
                    onPress={confirmAdd}
                    activeOpacity={0.85}
                    disabled={addValidating}
                  >
                    {addValidating ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <FontAwesome5 name="plus" size={13} color="#fff" />
                        <Text style={S.primaryBtnText}>Add Milestone</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : activeDraft.length > 0 ? (
                <View style={S.reviewFooter}>
                  <TouchableOpacity style={S.secondaryBtn} onPress={onClose} activeOpacity={0.85}>
                    <Text style={S.secondaryBtnText}>Save Later</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[S.primaryBtn, !canConfirm && { opacity: 0.5 }]}
                    onPress={handleConfirmAll}
                    activeOpacity={0.85}
                    disabled={!canConfirm}
                  >
                    <FontAwesome5 name="check-double" size={13} color="#fff" />
                    <Text style={S.primaryBtnText}>Confirm All</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
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
                    {genResult.errorCode === "unknown" && genResult.errorMessage ? (
                      <Text style={S.errorDetail} numberOfLines={4}>
                        {genResult.errorMessage}
                      </Text>
                    ) : null}
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
            </Animated.View>
          </KeyboardAvoidingView>
        </>
      ) : null}
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

  numReadonly: {
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10,
    minHeight: 40, justifyContent: "center",
  },
  numReadonlyText: { fontSize: 13, fontWeight: "700", color: COLORS.textSecondary },
  formulaHint: {
    fontSize: 11, color: COLORS.textTertiary, fontStyle: "italic",
    marginTop: 8, lineHeight: 16,
  },

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

  deleteBar: {
    paddingHorizontal: 18, paddingVertical: 14, gap: 12,
    borderTopWidth: 1, borderTopColor: "#FECACA",
    backgroundColor: COLORS.errorSoft,
  },
  deleteBarHeader: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
  },
  deleteBarIconRing: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "#fff",
    borderWidth: 1, borderColor: "#FECACA",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  deleteBarTitle: {
    fontSize: 14, fontWeight: "900", color: COLORS.error, marginBottom: 2,
  },
  deleteBarBody: {
    fontSize: 12, color: COLORS.error, fontWeight: "600", lineHeight: 17,
  },
  deleteBarActions: { flexDirection: "row", gap: 10 },
  deleteBarConfirm: { backgroundColor: COLORS.error },

  allRemovedBox: {
    alignItems: "center", padding: 24, gap: 8,
    backgroundColor: COLORS.warningSoft,
    borderRadius: 16, borderWidth: 1, borderColor: "#FDE68A",
  },
  allRemovedText: {
    fontSize: 13, color: COLORS.warning, textAlign: "center",
    fontWeight: "600", lineHeight: 18,
  },

  weightFlag: { color: COLORS.error, fontWeight: "800" },

  fallbackBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: COLORS.warningSoft,
    borderBottomWidth: 1, borderBottomColor: "#FDE68A",
  },
  fallbackBannerText: {
    flex: 1, fontSize: 12, fontWeight: "600",
    color: COLORS.warning, lineHeight: 17,
  },

  overflowBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    paddingHorizontal: 18, paddingVertical: 12,
    backgroundColor: COLORS.errorSoft,
    borderBottomWidth: 1, borderBottomColor: "#FECACA",
  },
  overflowBannerText: {
    flex: 1, fontSize: 12, fontWeight: "600",
    color: COLORS.error, lineHeight: 17,
  },

  addTile: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: COLORS.primarySoft,
    borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.accentBorder,
    borderStyle: "dashed",
  },
  addTileIcon: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "#fff",
    borderWidth: 1, borderColor: COLORS.accentBorder,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  addTileTitle: { fontSize: 14, fontWeight: "800", color: COLORS.primary },
  addTileSub:   { fontSize: 11, fontWeight: "600", color: COLORS.textSecondary, marginTop: 2 },

  addRow: { flexDirection: "row", gap: 10, marginTop: 10 },
  addCol: { flex: 1 },
  numInput: {
    fontSize: 14, fontWeight: "700", color: COLORS.textPrimary,
    backgroundColor: COLORS.background, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border,
    minHeight: 40,
  },
  addErrorText: {
    fontSize: 12, fontWeight: "700", color: COLORS.error,
    marginTop: 10, lineHeight: 16,
  },
  errorDetail: {
    fontSize: 11, color: COLORS.textTertiary,
    textAlign: "center", marginTop: 6, lineHeight: 15,
    fontStyle: "italic",
  },

  // Plan basis chip row (Change A / Change C fold-in)
  chipRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    paddingHorizontal: 22, paddingTop: 0, paddingBottom: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  winChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: COLORS.background,
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  winChipText: { fontSize: 10, fontWeight: "700", color: COLORS.textSecondary },
  winChipOver: { backgroundColor: COLORS.errorSoft, borderColor: "#FECACA" },
  winChipOverText: { color: COLORS.error, fontWeight: "800" },
  winChipUnder: { backgroundColor: COLORS.warningSoft, borderColor: "#FDE68A" },
  winChipUnderText: { color: COLORS.warning, fontWeight: "800" },
});
