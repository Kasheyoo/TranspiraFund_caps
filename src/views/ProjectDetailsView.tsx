import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants";
import type { Milestone, Project } from "../types";

// ── Interfaces ────────────────────────────────────────────────────────────────
interface ProjectDetailsData {
  project: Project | null;
  isLoading: boolean;
}

interface ProjectDetailsActions {
  onRefresh: () => void;
  onSelectMilestone: (m: Milestone | null) => void;
  onAddProof: (m: Milestone) => void;
  onGenerateMilestones: () => void;
}

interface ProjectDetailsViewProps {
  data: ProjectDetailsData;
  actions: ProjectDetailsActions;
  onBack: () => void;
}

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, { accent: string; bg: string; text: string }> = {
  "In Progress": { accent: COLORS.primary, bg: COLORS.primarySoft, text: COLORS.primary },
  "Completed":   { accent: COLORS.success, bg: COLORS.successSoft, text: COLORS.success },
  "Delayed":     { accent: COLORS.error,   bg: COLORS.errorSoft,   text: COLORS.error   },
  "Pending":     { accent: COLORS.warning, bg: COLORS.warningSoft, text: COLORS.warning },
};
const DEFAULT_SC = { accent: COLORS.textTertiary, bg: COLORS.track, text: COLORS.textTertiary };

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatBudget = (v?: number): string => {
  if (!v) return "—";
  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `₱${(v / 1_000).toFixed(1)}K`;
  return `₱${v.toLocaleString()}`;
};

// ── Sub-components ────────────────────────────────────────────────────────────
const SLabel = ({ title }: { title: string }) => (
  <Text style={D.sectionLabel}>{title}</Text>
);

const HDivider = () => <View style={D.divider} />;
const RowDiv   = () => <View style={D.rowDivider} />;

interface FieldRowProps {
  icon: string;
  label: string;
  value?: string | number | null;
  iconColor?: string;
  valueStyle?: object;
}

const FieldRow = ({ icon, label, value, iconColor = COLORS.textTertiary, valueStyle }: FieldRowProps) => {
  if (value === undefined || value === null || value === "") return null;
  return (
    <View style={D.fieldRow}>
      <View style={[D.fieldIcon, { borderColor: iconColor + "30", backgroundColor: iconColor + "10" }]}>
        <FontAwesome5 name={icon} size={11} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={D.fieldLabel}>{label}</Text>
        <Text style={[D.fieldValue, valueStyle]}>{String(value)}</Text>
      </View>
    </View>
  );
};

// ── Milestone card ────────────────────────────────────────────────────────────
interface MilestoneCardProps {
  m: Milestone;
  index: number;
  isFirst: boolean;
  prevDone: boolean;
  isLast: boolean;
  sc: { accent: string; bg: string; text: string };
  onSelect: () => void;
  onProof: () => void;
}

const MilestoneCard = ({ m, index, isFirst, prevDone, isLast, sc, onSelect, onProof }: MilestoneCardProps) => {
  const isUnlocked = isFirst || prevDone;
  const isDone     = m.status?.toString().toLowerCase() === "completed";
  const isActive   = isUnlocked && !isDone;
  const isLocked   = !isUnlocked;

  const proofCount = m.proofs?.length ?? 0;

  const stepBg = isDone
    ? COLORS.success
    : isActive
      ? COLORS.primary
      : "#D1D5DB";

  const cardBorder = isDone
    ? "#A7F3D0"
    : isActive
      ? COLORS.accentBorder
      : COLORS.border;

  return (
    <View style={D.msWrapper}>
      {/* Connector line */}
      {!isLast && (
        <View style={[D.connector, { backgroundColor: isDone ? COLORS.success : COLORS.border }]} />
      )}

      <TouchableOpacity
        style={[D.msCard, { borderColor: cardBorder }, isLocked && D.msCardLocked]}
        onPress={() =>
          isLocked
            ? Alert.alert("Milestone Locked", "Complete the previous milestone to unlock this one.")
            : onSelect()
        }
        activeOpacity={isLocked ? 1 : 0.82}
      >
        {/* Step circle */}
        <View style={[D.stepCircle, { backgroundColor: stepBg }]}>
          <FontAwesome5
            name={isDone ? "check" : isLocked ? "lock" : "clock"}
            size={12}
            color="#fff"
          />
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          {/* Sequence + title */}
          <View style={D.msTitleRow}>
            <View style={[D.seqPill, { backgroundColor: isLocked ? COLORS.track : sc.bg }]}>
              <Text style={[D.seqText, { color: isLocked ? COLORS.textTertiary : sc.accent }]}>
                {m.sequence ?? index + 1}
              </Text>
            </View>
            <Text
              style={[D.msTitle, isLocked && { color: COLORS.textTertiary }]}
              numberOfLines={2}
            >
              {m.title}
            </Text>
          </View>

          {/* Status + proof count */}
          <View style={D.msMetaRow}>
            <View style={[D.msStatusChip, {
              backgroundColor: isDone ? COLORS.successSoft : isActive ? COLORS.primarySoft : COLORS.track,
            }]}>
              <View style={[D.msStatusDot, {
                backgroundColor: isDone ? COLORS.success : isActive ? COLORS.primary : COLORS.textTertiary,
              }]} />
              <Text style={[D.msStatusText, {
                color: isDone ? COLORS.success : isActive ? COLORS.primary : COLORS.textTertiary,
              }]}>
                {isLocked ? "Locked" : isDone ? "Completed" : m.status || "Pending"}
              </Text>
            </View>

            {proofCount > 0 && (
              <View style={D.proofCountChip}>
                <FontAwesome5 name="camera" size={8} color={COLORS.primary} />
                <Text style={D.proofCountText}>{proofCount} proof{proofCount !== 1 ? "s" : ""}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Right actions */}
        {!isLocked ? (
          <View style={D.msActions}>
            {/* Camera / Proof button — inline, no navigation needed */}
            {!isDone && (
              <TouchableOpacity
                style={D.cameraBtn}
                onPress={(e) => { e.stopPropagation?.(); onProof(); }}
                activeOpacity={0.8}
              >
                <FontAwesome5 name="camera" size={13} color="#fff" />
              </TouchableOpacity>
            )}
            {/* View details chevron */}
            <TouchableOpacity style={D.chevronBtn} onPress={onSelect} activeOpacity={0.7}>
              <FontAwesome5 name="angle-right" size={16} color={isDone ? COLORS.success : COLORS.textTertiary} />
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    </View>
  );
};

// ── Main view ─────────────────────────────────────────────────────────────────
export const ProjectDetailsView = ({ data, actions, onBack }: ProjectDetailsViewProps) => {
  const insets = useSafeAreaInsets();
  const { project, isLoading } = data;

  if (!project) return null;

  const status   = project.status || "Pending";
  const sc       = STATUS_MAP[status] || DEFAULT_SC;
  const progress = Math.min(100, Math.max(0, project.progress || 0));

  const completedMs = project.milestones?.filter(
    (m) => m.status?.toString().toLowerCase() === "completed",
  ).length ?? 0;
  const totalMs = project.milestones?.length ?? 0;

  const displayTitle    = project.projectName    ?? project.title    ?? "Untitled Project";
  const displayEngineer = project.projectEngineer ?? project.engineer;
  const displayLocation = project.barangay
    ? project.sitioStreet ? `${project.sitioStreet}, ${project.barangay}` : project.barangay
    : project.location;
  const displayStart      = project.officialDateStarted    ?? project.startDate;
  const displayCompletion = project.originalDateCompletion ?? project.completionDate;

  const handleGenerate = () => {
    Alert.alert(
      "Generate Standard Milestones",
      "This will create 8 standard construction-phase milestones for this project. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Generate", style: "default", onPress: actions.onGenerateMilestones },
      ],
    );
  };

  return (
    <View style={D.root}>

      {/* ══ HERO ═══════════════════════════════════════════════════ */}
      <View style={[D.hero, { paddingTop: insets.top + 10 }]}>
        <View style={D.orb1} /><View style={D.orb2} /><View style={D.orb3} />

        <TouchableOpacity onPress={onBack} style={D.backBtn} activeOpacity={0.8}>
          <FontAwesome5 name="arrow-left" size={14} color="#fff" />
        </TouchableOpacity>

        <View style={D.heroIconBox}>
          <FontAwesome5 name="hard-hat" size={24} color="#fff" />
        </View>

        <Text style={D.heroTitle} numberOfLines={3}>{displayTitle}</Text>

        <View style={D.heroBadgeRow}>
          <View style={[D.heroBadge, { backgroundColor: sc.bg }]}>
            <View style={[D.heroBadgeDot, { backgroundColor: sc.accent }]} />
            <Text style={[D.heroBadgeText, { color: sc.text }]}>{status}</Text>
          </View>
          {project.projectCode ? (
            <View style={D.codeChip}>
              <FontAwesome5 name="hashtag" size={9} color="rgba(255,255,255,0.7)" />
              <Text style={D.codeText}>{project.projectCode}</Text>
            </View>
          ) : null}
          {project.accountCode ? (
            <View style={D.codeChip}>
              <FontAwesome5 name="barcode" size={9} color="rgba(255,255,255,0.7)" />
              <Text style={D.codeText}>{project.accountCode}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[D.scroll, { paddingBottom: insets.bottom + 48 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ══ PROGRESS ═══════════════════════════════════════════════ */}
        <View style={D.card}>
          <View style={D.progressTopRow}>
            <View>
              <SLabel title="OVERALL PROGRESS" />
              <Text style={D.msCaption}>{completedMs} of {totalMs} milestones done</Text>
            </View>
            <Text style={[D.pctBig, { color: sc.accent }]}>{progress}%</Text>
          </View>
          <View style={D.track}>
            <View style={[D.fill, { width: `${progress}%` as any, backgroundColor: sc.accent }]} />
          </View>
          {totalMs > 0 && (
            <View style={D.msPills}>
              {project.milestones!.map((m, i) => (
                <View
                  key={m.id || i}
                  style={[D.msPill, {
                    backgroundColor: m.status?.toString().toLowerCase() === "completed"
                      ? COLORS.success : COLORS.track,
                  }]}
                />
              ))}
            </View>
          )}
        </View>

        {/* ══ FINANCIALS ══════════════════════════════════════════════ */}
        {(project.contractAmount || project.budget) ? (
          <View style={D.card}>
            <SLabel title="FINANCIALS" />
            <View style={D.financialGrid}>
              <View style={[D.finItem, { backgroundColor: COLORS.primarySoft, borderColor: COLORS.primary + "30" }]}>
                <View style={[D.finIconBox, { backgroundColor: COLORS.primary + "20" }]}>
                  <FontAwesome5 name="file-invoice-dollar" size={14} color={COLORS.primary} />
                </View>
                <Text style={D.finLabel}>Contract Amount</Text>
                <Text style={[D.finValue, { color: COLORS.primary }]}>
                  {formatBudget(project.contractAmount ?? project.budget)}
                </Text>
              </View>
              {project.fundingSource ? (
                <View style={[D.finItem, { backgroundColor: COLORS.warningSoft, borderColor: COLORS.warning + "40" }]}>
                  <View style={[D.finIconBox, { backgroundColor: COLORS.warning + "20" }]}>
                    <FontAwesome5 name="hand-holding-usd" size={13} color={COLORS.warning} />
                  </View>
                  <Text style={D.finLabel}>Funding Source</Text>
                  <Text style={[D.finValue, { color: COLORS.warning, fontSize: 12 }]}>
                    {project.fundingSource}
                  </Text>
                </View>
              ) : null}
            </View>
            {project.contractor ? (
              <View style={D.contractorRow}>
                <FontAwesome5 name="building" size={11} color={COLORS.textTertiary} />
                <Text style={D.contractorText}>
                  Contractor:{" "}
                  <Text style={{ color: COLORS.textPrimary, fontWeight: "700" }}>
                    {project.contractor}
                  </Text>
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ══ PROJECT INFORMATION ══════════════════════════════════════ */}
        <View style={D.card}>
          <SLabel title="PROJECT INFORMATION" />
          <HDivider />
          <FieldRow icon="user-hard-hat"   label="Assigned Engineer"     value={displayEngineer}           iconColor={COLORS.primary} />
          <RowDiv />
          <FieldRow icon="map-marker-alt"  label="Location / Barangay"   value={displayLocation}           iconColor={COLORS.error} />
          {project.sitioStreet && project.barangay ? (<><RowDiv /><FieldRow icon="road" label="Sitio / Street" value={project.sitioStreet} iconColor={COLORS.textTertiary} /></>) : null}
          <RowDiv />
          <FieldRow icon="calendar-day"    label="NTP Received"           value={project.ntpReceivedDate}   iconColor="#8B5CF6" />
          <RowDiv />
          <FieldRow icon="play-circle"     label="Official Start Date"    value={displayStart}              iconColor={COLORS.success} />
          <RowDiv />
          <FieldRow icon="flag-checkered"  label="Original Completion"    value={displayCompletion}         iconColor={COLORS.warning} />
          {project.revisedDate1   ? (<><RowDiv /><FieldRow icon="redo"         label="Revised Date 1"           value={project.revisedDate1}       iconColor={COLORS.error} /></>) : null}
          {project.revisedDate2   ? (<><RowDiv /><FieldRow icon="redo-alt"     label="Revised Date 2"           value={project.revisedDate2}       iconColor={COLORS.error} /></>) : null}
          {project.actualDateCompleted ? (<><RowDiv /><FieldRow icon="check-double"  label="Actual Date Completed"    value={project.actualDateCompleted} iconColor={COLORS.success} valueStyle={{ color: COLORS.success }} /></>) : null}
          {(project.actualPercent !== undefined && project.actualPercent !== null) ? (
            <><RowDiv /><FieldRow icon="percentage" label="Actual Completion %" value={`${project.actualPercent}%`} iconColor={COLORS.primary} valueStyle={{ color: COLORS.primary, fontWeight: "800" }} /></>
          ) : null}
        </View>

        {/* ══ DESCRIPTION ════════════════════════════════════════════ */}
        {project.description ? (
          <View style={D.card}>
            <SLabel title="DESCRIPTION" />
            <HDivider />
            <Text style={D.descText}>{project.description}</Text>
          </View>
        ) : null}

        {/* ══ MILESTONES ═════════════════════════════════════════════ */}
        <View>
          {/* Section header */}
          <View style={D.msHeader}>
            <View>
              <SLabel title="MILESTONES" />
              {totalMs > 0 && (
                <Text style={D.msSubCaption}>{completedMs}/{totalMs} completed</Text>
              )}
            </View>
            {/* Generate button — always visible, disabled if milestones exist */}
            <TouchableOpacity
              style={[D.generateBtn, totalMs > 0 && D.generateBtnDisabled]}
              onPress={totalMs === 0 ? handleGenerate : () =>
                Alert.alert("Already Generated", "Milestones have already been created for this project.")
              }
              activeOpacity={0.8}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <FontAwesome5 name="magic" size={11} color={totalMs > 0 ? COLORS.textTertiary : "#fff"} />
                  <Text style={[D.generateBtnText, totalMs > 0 && { color: COLORS.textTertiary }]}>
                    {totalMs > 0 ? "Generated" : "Generate"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* No milestones empty state */}
          {totalMs === 0 ? (
            <View style={D.emptyMsCard}>
              <View style={D.emptyMsIconBox}>
                <FontAwesome5 name="layer-group" size={26} color={COLORS.primary} />
              </View>
              <Text style={D.emptyMsTitle}>No Milestones Yet</Text>
              <Text style={D.emptyMsBody}>
                Tap <Text style={{ fontWeight: "800", color: COLORS.primary }}>"Generate"</Text> above to auto-create 8 standard construction-phase milestones for this project.
              </Text>
              <TouchableOpacity style={D.emptyMsBtn} onPress={handleGenerate} activeOpacity={0.85}>
                {isLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><FontAwesome5 name="magic" size={13} color="#fff" /><Text style={D.emptyMsBtnText}>Generate Milestones</Text></>
                }
              </TouchableOpacity>
            </View>
          ) : (
            project.milestones!.map((m, index) => (
              <MilestoneCard
                key={m.id || index}
                m={m}
                index={index}
                isFirst={index === 0}
                prevDone={project.milestones![index - 1]?.status?.toString().toLowerCase() === "completed"}
                isLast={index === totalMs - 1}
                sc={sc}
                onSelect={() => actions.onSelectMilestone(m)}
                onProof={() => actions.onAddProof(m)}
              />
            ))
          )}
        </View>

      </ScrollView>
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const D = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22, paddingBottom: 26, overflow: "hidden",
  },
  orb1: { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,0.06)", top: -60, right: -50 },
  orb2: { position: "absolute", width: 130, height: 130, borderRadius: 65,  backgroundColor: "rgba(255,255,255,0.04)", bottom: -40, left: 10  },
  orb3: { position: "absolute", width: 70,  height: 70,  borderRadius: 35,  backgroundColor: "rgba(255,255,255,0.05)", top: 30,    left: -15  },
  backBtn: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  heroIconBox: {
    width: 54, height: 54, borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center", marginBottom: 10,
  },
  heroTitle: { fontSize: 21, fontWeight: "900", color: "#fff", lineHeight: 27, marginBottom: 10 },
  heroBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  heroBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 12, fontWeight: "800" },
  codeChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: 10,
  },
  codeText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.85)" },

  // Scroll
  scroll: { paddingHorizontal: 18, paddingTop: 18, gap: 12 },

  // Cards
  card: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 17,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  sectionLabel: {
    fontSize: 10, fontWeight: "900", color: COLORS.textTertiary, letterSpacing: 1, marginBottom: 10,
  },
  divider:    { height: 1, backgroundColor: COLORS.border, marginBottom: 2 },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 44 },

  // Progress
  progressTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  msCaption: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  pctBig:    { fontSize: 32, fontWeight: "900" },
  track:     { height: 8, backgroundColor: COLORS.track, borderRadius: 4, overflow: "hidden", marginBottom: 10 },
  fill:      { height: "100%", borderRadius: 4 },
  msPills:   { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  msPill:    { height: 4, flex: 1, minWidth: 8, borderRadius: 2 },

  // Financials
  financialGrid: { flexDirection: "row", gap: 10, marginBottom: 4 },
  finItem: { flex: 1, borderRadius: 14, padding: 13, alignItems: "center", gap: 6, borderWidth: 1 },
  finIconBox: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  finLabel:   { fontSize: 10, fontWeight: "700", color: COLORS.textTertiary, textTransform: "uppercase", letterSpacing: 0.3 },
  finValue:   { fontSize: 18, fontWeight: "900", textAlign: "center" },
  contractorRow: {
    flexDirection: "row", alignItems: "center", gap: 7,
    marginTop: 12, paddingTop: 11, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  contractorText: { fontSize: 13, color: COLORS.textSecondary },

  // Field rows
  fieldRow:  { flexDirection: "row", alignItems: "flex-start", gap: 11, paddingVertical: 9 },
  fieldIcon: {
    width: 30, height: 30, borderRadius: 8,
    borderWidth: 1, alignItems: "center", justifyContent: "center",
    marginTop: 1, flexShrink: 0,
  },
  fieldLabel: {
    fontSize: 10, fontWeight: "700", color: COLORS.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2,
  },
  fieldValue: { fontSize: 13, fontWeight: "600", color: COLORS.textPrimary, lineHeight: 18 },

  // Description
  descText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },

  // Milestones section header
  msHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 12,
  },
  msSubCaption: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },

  // Generate button
  generateBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.primary, paddingHorizontal: 14,
    paddingVertical: 8, borderRadius: 12,
  },
  generateBtnDisabled: {
    backgroundColor: COLORS.track, borderWidth: 1, borderColor: COLORS.border,
  },
  generateBtnText: { fontSize: 12, fontWeight: "800", color: "#fff" },

  // Empty milestones state
  emptyMsCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 28, alignItems: "center", gap: 10,
    borderWidth: 1.5, borderColor: COLORS.accentBorder,
    borderStyle: "dashed",
  },
  emptyMsIconBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyMsTitle: { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary },
  emptyMsBody:  { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 19, paddingHorizontal: 8 },
  emptyMsBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.primary, paddingHorizontal: 22,
    paddingVertical: 12, borderRadius: 14, marginTop: 6,
  },
  emptyMsBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  // Milestone cards
  msWrapper:  { position: "relative" },
  connector: {
    position: "absolute", left: 18, top: 52, width: 2, height: 18, zIndex: 1,
  },
  msCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.surface, borderRadius: 16,
    paddingVertical: 13, paddingHorizontal: 14, marginBottom: 10,
    borderWidth: 1.5, borderColor: COLORS.border,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  msCardLocked: { opacity: 0.45, backgroundColor: COLORS.background, elevation: 0 },

  stepCircle: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  msTitleRow:  { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 },
  seqPill: {
    minWidth: 22, height: 20, borderRadius: 6,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 5, flexShrink: 0,
  },
  seqText:  { fontSize: 10, fontWeight: "900" },
  msTitle:  { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary, lineHeight: 17, flex: 1 },
  msMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  msStatusChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7,
  },
  msStatusDot:  { width: 5, height: 5, borderRadius: 3 },
  msStatusText: { fontSize: 10, fontWeight: "700", textTransform: "capitalize" },
  proofCountChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: COLORS.primarySoft, paddingHorizontal: 7,
    paddingVertical: 3, borderRadius: 7,
  },
  proofCountText: { fontSize: 10, fontWeight: "700", color: COLORS.primary },

  // Milestone right actions
  msActions: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 0 },
  cameraBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  chevronBtn: {
    width: 28, height: 34,
    alignItems: "center", justifyContent: "center",
  },
});
