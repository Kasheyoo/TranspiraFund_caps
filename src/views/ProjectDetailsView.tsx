import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRef, useState } from "react";
import { COLORS } from "../constants";
import type { Milestone, Project } from "../types";
import { MilestoneGenerationModal } from "../components/MilestoneGenerationModal";
import { NtpViewerModal } from "../components/NtpViewerModal";
import { ProjectOrdersCard } from "../components/ProjectOrdersCard";

interface ProjectDetailsData {
  project: Project | null;
  engineerName?: string | null;
  engineerPhotoURL?: string;
  isLoading: boolean;
  lastViewedMilestoneId?: string | null;
}

interface GenerateMilestonesResult {
  ok: boolean;
  count?: number;
  errorCode?:
    | "unauthenticated" | "invalid-argument" | "not-found"
    | "permission-denied" | "already-exists" | "internal" | "unknown";
  errorMessage?: string;
}

interface ProjectDetailsActions {
  onRefresh: () => void;
  onSelectMilestone: (m: Milestone | null) => void;
  onAddProof: (m: Milestone) => void;
  onGenerateMilestones: () => Promise<GenerateMilestonesResult>;
  onConfirmMilestone: (m: Milestone) => Promise<boolean>;
  onSaveAndConfirmAll: (
    edits: Record<string, Partial<Milestone>>,
  ) => Promise<boolean>;
  onDeleteMilestone: (m: Milestone) => Promise<boolean>;
}

interface ProjectDetailsViewProps {
  data: ProjectDetailsData;
  actions: ProjectDetailsActions;
  onBack: () => void;
}

const STATUS_MAP: Record<string, { accent: string; bg: string; text: string; icon: string }> = {
  "In Progress": { accent: COLORS.primary, bg: COLORS.primarySoft,  text: COLORS.primary, icon: "spinner"            },
  "Completed":   { accent: COLORS.success, bg: COLORS.successSoft,  text: COLORS.success, icon: "check-circle"       },
  "Delayed":     { accent: COLORS.error,   bg: COLORS.errorSoft,    text: COLORS.error,   icon: "exclamation-circle" },
  "Pending":     { accent: COLORS.warning, bg: COLORS.warningSoft,  text: COLORS.warning, icon: "clock"              },
  "Draft":       { accent: "#64748B",      bg: "#F1F5F9",           text: "#64748B",      icon: "file-alt"           },
  "For Mayor":   { accent: "#7C3AED",      bg: "#EDE9FE",           text: "#7C3AED",      icon: "user-tie"           },
};
const DEFAULT_SC = { accent: COLORS.textTertiary, bg: COLORS.track, text: COLORS.textTertiary, icon: "circle" };

const ACTIVE_ALIASES: Record<string, true> = { "Draft": true, "For Mayor": true, "Ongoing": true, "ongoing": true };
const displayStatus = (raw: string) => ACTIVE_ALIASES[raw] ? "In Progress" : raw;

const formatBudget = (v?: number): string => {
  if (!v) return "—";
  if (v >= 1_000_000) return `₱${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `₱${(v / 1_000).toFixed(1)}K`;
  return `₱${v.toLocaleString()}`;
};

const computeAccomplishment = (
  start?: string | null,
  end?: string | null,
  actualPercent?: number,
): { durationDays: number; timeElapsed: number; slippage: number; daysDelay: number } => {
  if (!start || !end) return { durationDays: 0, timeElapsed: 0, slippage: 0, daysDelay: 0 };
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (isNaN(s) || isNaN(e) || e <= s) {
    return { durationDays: 0, timeElapsed: 0, slippage: 0, daysDelay: 0 };
  }
  const durationDays = Math.max(0, Math.round((e - s) / 86_400_000));
  const now = Date.now();
  const rawElapsed = ((now - s) / (e - s)) * 100;
  const timeElapsed = Math.max(0, Math.min(100, rawElapsed));
  const actual = Number.isFinite(actualPercent) ? Number(actualPercent) : 0;
  const slippage = timeElapsed - actual;
  const daysDelay = slippage > 0 && durationDays
    ? Math.round((slippage / 100) * durationDays)
    : 0;
  return {
    durationDays,
    timeElapsed: Math.round(timeElapsed * 10) / 10,
    slippage: Math.round(slippage * 10) / 10,
    daysDelay,
  };
};

interface MilestoneCardProps {
  m: Milestone;
  index: number;
  isFirst: boolean;
  prevDone: boolean;
  isLast: boolean;
  onSelect: () => void;
  onProof: () => void;
}

const MilestoneCard = ({ m, index, isFirst, prevDone, isLast, onSelect, onProof }: MilestoneCardProps) => {
  const isUnlocked = isFirst || prevDone;
  const isDone     = m.status?.toString().toLowerCase() === "completed";
  const isDelayed  = m.status?.toString().toLowerCase() === "delayed";
  const isActive   = isUnlocked && !isDone;
  const isLocked   = !isUnlocked;
  const proofCount = m.proofs?.length ?? 0;
  const needsReview = m.confirmed === false;

  const circleColor = isDone ? COLORS.success : isDelayed ? COLORS.error : isActive ? COLORS.primary : "#CBD5E1";
  const cardBg      = isDone ? COLORS.successSoft : isActive ? "#F8FFFE" : COLORS.surface;
  const borderColor = isDone ? "#A7F3D0" : isDelayed ? COLORS.errorSoft : isActive ? COLORS.accentBorder : COLORS.border;
  const lineColor   = isDone ? COLORS.success : COLORS.border;

  return (
    <View style={D.msWrapper}>
      {!isLast && <View style={[D.connector, { backgroundColor: lineColor }]} />}

      <TouchableOpacity
        style={[D.msCard, { backgroundColor: cardBg, borderColor }]}
        onPress={() =>
          isLocked
            ? Alert.alert("Milestone Locked", "Complete the previous milestone to unlock this one.")
            : onSelect()
        }
        activeOpacity={isLocked ? 1 : 0.82}
      >
        <View style={[D.stepCircle, { backgroundColor: circleColor }]}>
          <FontAwesome5
            name={isDone ? "check" : isDelayed ? "exclamation" : isLocked ? "lock" : "dot-circle"}
            size={isDone ? 13 : 11}
            color="#fff"
          />
        </View>

        <View style={D.msContent}>
          <View style={D.msTitleRow}>
            <Text style={D.msPhase}>Phase {m.sequence ?? index + 1}</Text>
            {needsReview && (
              <View style={D.reviewBadge}>
                <FontAwesome5 name="exclamation" size={8} color={COLORS.warning} />
                <Text style={D.reviewBadgeText}>PENDING REVIEW</Text>
              </View>
            )}
            {proofCount > 0 && (
              <View style={D.proofBadge}>
                <FontAwesome5 name="camera" size={8} color={COLORS.primary} />
                <Text style={D.proofBadgeText}>{proofCount}</Text>
              </View>
            )}
          </View>
          <Text
            style={[D.msTitle, isLocked && { color: COLORS.textTertiary }]}
            numberOfLines={2}
          >
            {m.title}
          </Text>
          <View style={D.msStatusRow}>
            <View style={[D.msStatusPill, { backgroundColor: circleColor + "18" }]}>
              <View style={[D.msStatusDot, { backgroundColor: circleColor }]} />
              <Text style={[D.msStatusText, { color: circleColor }]}>
                {isLocked ? "Locked" : isDone ? "Completed" : isDelayed ? "Delayed" : m.status || "Pending"}
              </Text>
            </View>
          </View>
        </View>

        {!isLocked ? (
          <View style={D.msActions}>
            {!isDone && !needsReview && (
              <TouchableOpacity
                style={D.cameraBtn}
                onPress={(e) => { e.stopPropagation?.(); onProof(); }}
                activeOpacity={0.8}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <FontAwesome5 name="camera" size={13} color="#fff" />
              </TouchableOpacity>
            )}
            {needsReview && (
              <View style={D.reviewIconBtn}>
                <FontAwesome5 name="search" size={12} color={COLORS.warning} />
              </View>
            )}
            <View style={D.chevronWrap}>
              <FontAwesome5
                name="chevron-right"
                size={12}
                color={isDone ? COLORS.success : COLORS.textTertiary}
              />
            </View>
          </View>
        ) : (
          <View style={D.lockWrap}>
            <FontAwesome5 name="lock" size={12} color={COLORS.textTertiary} />
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export const ProjectDetailsView = ({ data, actions, onBack }: ProjectDetailsViewProps) => {
  const insets = useSafeAreaInsets();
  const [milestoneModalVisible, setMilestoneModalVisible] = useState(false);
  const [ntpViewerVisible, setNtpViewerVisible] = useState(false);
  const { project, engineerName, engineerPhotoURL, isLoading, lastViewedMilestoneId } = data;

  const scrollRef = useRef<ScrollView>(null);
  const hasScrolledRef = useRef(false);

  if (!project) return null;

  const status   = displayStatus(project.status || "Pending");
  const sc       = STATUS_MAP[status] || DEFAULT_SC;

  const allMilestones      = project.milestones ?? [];
  const draftMilestones    = allMilestones.filter((m) => m.confirmed === false);
  const visibleMilestones  = allMilestones.filter((m) => m.confirmed !== false);
  const DONE_STATUSES = new Set(["done", "complete", "completed"]);
  const completedMs        = visibleMilestones.filter(
    (m) => DONE_STATUSES.has(m.status?.toString().toLowerCase() ?? ""),
  ).length;
  const totalMs            = visibleMilestones.length;
  const draftCount         = draftMilestones.length;
  const hasDraftsOnly      = totalMs === 0 && draftCount > 0;

  const progress = typeof project.actualPercent === "number"
    ? project.actualPercent
    : totalMs > 0 ? Math.round((completedMs / totalMs) * 100) : 0;

  const displayTitle    = project.projectName    ?? project.title    ?? "Untitled Project";
  const displayEngineer = engineerName ?? null;
  const displayLocation = project.barangay
    ? project.sitioStreet ? `${project.sitioStreet}, ${project.barangay}` : project.barangay
    : project.location ?? null;
  const displayStart      = project.officialDateStarted    ?? project.startDate    ?? null;
  const displayCompletion = project.originalDateCompletion ?? project.completionDate ?? null;
  const displayBudget     = formatBudget(project.contractAmount ?? project.budget);

  const initials = displayEngineer
    ?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() ?? "PE";

  const accomplishment = computeAccomplishment(
    displayStart,
    displayCompletion,
    progress,
  );
  const hasTimeline = !!(displayStart && displayCompletion);
  const slippageIsBehind = accomplishment.slippage > 0;

  const handleGenerate = () => setMilestoneModalVisible(true);

  return (
    <View style={D.root}>

      <View style={[D.hero, { paddingTop: insets.top + 10 }]}>
        <View style={D.orb1} /><View style={D.orb2} /><View style={D.orb3} />

        <View style={D.heroTopBar}>
          <TouchableOpacity onPress={onBack} style={D.backBtn} activeOpacity={0.8}>
            <FontAwesome5 name="arrow-left" size={14} color="#fff" />
          </TouchableOpacity>
          {project.projectCode ? (
            <View style={D.codeChip}>
              <FontAwesome5 name="hashtag" size={9} color="rgba(255,255,255,0.7)" />
              <Text style={D.codeText}>{project.projectCode}</Text>
            </View>
          ) : null}
        </View>

        <Text style={D.heroLabel}>CONSTRUCTION SERVICES DIVISION</Text>

        <Text style={D.heroTitle} numberOfLines={3}>{displayTitle}</Text>

        {displayEngineer ? (
          <View style={D.engineerRow}>
            <View style={D.engineerAvatar}>
              {engineerPhotoURL ? (
                <Image source={{ uri: engineerPhotoURL }} style={D.engineerAvatarImg} />
              ) : (
                <Text style={D.engineerInitials}>{initials}</Text>
              )}
            </View>
            <View>
              <Text style={D.engineerName}>{displayEngineer}</Text>
              <Text style={D.engineerRole}>Project Engineer</Text>
            </View>
          </View>
        ) : null}

        <View style={D.heroBadgeRow}>
          <View style={[D.statusBadge, { backgroundColor: sc.bg }]}>
            <FontAwesome5 name={sc.icon} size={10} color={sc.accent} />
            <Text style={[D.statusBadgeText, { color: sc.text }]}>{status}</Text>
          </View>
          {displayLocation ? (
            <View style={D.locationChip}>
              <FontAwesome5 name="map-marker-alt" size={9} color="rgba(255,255,255,0.75)" />
              <Text style={D.locationText} numberOfLines={1}>{displayLocation}</Text>
            </View>
          ) : null}
          {accomplishment.durationDays > 0 ? (
            <View style={D.durationChip}>
              <FontAwesome5 name="clock" size={9} color="rgba(255,255,255,0.75)" />
              <Text style={D.locationText} numberOfLines={1}>
                {accomplishment.durationDays} calendar day{accomplishment.durationDays !== 1 ? "s" : ""}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={D.metricsCard}>
        <View style={D.metricCol}>
          <View style={[D.metricIconBox, { backgroundColor: COLORS.primarySoft }]}>
            <FontAwesome5 name="file-invoice-dollar" size={13} color={COLORS.primary} />
          </View>
          <Text style={D.metricValue}>{displayBudget}</Text>
          <Text style={D.metricLabel}>Contract</Text>
        </View>

        <View style={D.metricDivider} />

        <View style={D.metricCol}>
          <View style={[D.metricIconBox, { backgroundColor: COLORS.successSoft }]}>
            <FontAwesome5 name="layer-group" size={13} color={COLORS.success} />
          </View>
          <Text style={D.metricValue}>{completedMs}/{totalMs}</Text>
          <Text style={D.metricLabel}>Milestones</Text>
        </View>

        <View style={D.metricDivider} />

        <View style={D.metricCol}>
          <View style={[D.metricIconBox, { backgroundColor: sc.bg }]}>
            <FontAwesome5 name="chart-line" size={13} color={sc.accent} />
          </View>
          <Text style={[D.metricValue, { color: sc.accent }]}>{progress}%</Text>
          <Text style={D.metricLabel}>Progress</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[D.scroll, { paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}
      >

        <View style={D.card}>
          <View style={D.progressHeader}>
            <Text style={D.cardSectionLabel}>OVERALL PROGRESS</Text>
            <Text style={[D.progressPct, { color: sc.accent }]}>{progress}%</Text>
          </View>
          <View style={D.progressTrack}>
            <View style={[D.progressFill, { width: `${progress}%` as any, backgroundColor: sc.accent }]} />
          </View>
          {totalMs > 0 && (
            <View style={D.stepDots}>
              {project.milestones!.map((m, i) => {
                const done = m.status?.toString().toLowerCase() === "completed";
                return (
                  <View
                    key={m.id || i}
                    style={[D.stepDot, { backgroundColor: done ? sc.accent : COLORS.track }]}
                  />
                );
              })}
            </View>
          )}
          <Text style={D.progressCaption}>
            {completedMs} of {totalMs} milestone{totalMs !== 1 ? "s" : ""} completed
          </Text>
        </View>

        {(displayStart || displayCompletion || project.ntpReceivedDate) ? (
          <View style={D.card}>
            <Text style={D.cardSectionLabel}>PROJECT TIMELINE</Text>
            <View style={D.timeline}>
              {project.ntpReceivedDate ? (
                <View style={D.timelineItem}>
                  <View style={[D.tlIconBox, { backgroundColor: "#EDE9FE" }]}>
                    <FontAwesome5 name="calendar-day" size={11} color="#7C3AED" />
                  </View>
                  <Text style={D.tlLabel}>NTP Received</Text>
                  <Text style={D.tlValue}>{project.ntpReceivedDate}</Text>
                </View>
              ) : null}
              {displayStart ? (
                <View style={D.timelineItem}>
                  <View style={[D.tlIconBox, { backgroundColor: COLORS.primarySoft }]}>
                    <FontAwesome5 name="play-circle" size={11} color={COLORS.primary} />
                  </View>
                  <Text style={D.tlLabel}>Official Start</Text>
                  <Text style={D.tlValue}>{displayStart}</Text>
                </View>
              ) : null}
              {displayCompletion ? (
                <View style={D.timelineItem}>
                  <View style={[D.tlIconBox, { backgroundColor: COLORS.warningSoft }]}>
                    <FontAwesome5 name="flag-checkered" size={11} color={COLORS.warning} />
                  </View>
                  <Text style={D.tlLabel}>Completion</Text>
                  <Text style={D.tlValue}>{displayCompletion}</Text>
                </View>
              ) : null}
              {project.revisedDate1 ? (
                <View style={D.timelineItem}>
                  <View style={[D.tlIconBox, { backgroundColor: COLORS.errorSoft }]}>
                    <FontAwesome5 name="redo" size={11} color={COLORS.error} />
                  </View>
                  <Text style={D.tlLabel}>Revised Date 1</Text>
                  <Text style={D.tlValue}>{project.revisedDate1}</Text>
                </View>
              ) : null}
              {project.revisedDate2 ? (
                <View style={D.timelineItem}>
                  <View style={[D.tlIconBox, { backgroundColor: COLORS.errorSoft }]}>
                    <FontAwesome5 name="redo-alt" size={11} color={COLORS.error} />
                  </View>
                  <Text style={D.tlLabel}>Revised Date 2</Text>
                  <Text style={D.tlValue}>{project.revisedDate2}</Text>
                </View>
              ) : null}
              {project.actualDateCompleted ? (
                <View style={D.timelineItem}>
                  <View style={[D.tlIconBox, { backgroundColor: COLORS.successSoft }]}>
                    <FontAwesome5 name="check-double" size={11} color={COLORS.success} />
                  </View>
                  <Text style={D.tlLabel}>Actual Completed</Text>
                  <Text style={[D.tlValue, { color: COLORS.success }]}>{project.actualDateCompleted}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        <View style={D.card}>
          <Text style={D.cardSectionLabel}>PROJECT DETAILS</Text>

          <View style={D.detailGrid}>
            {project.fundingSource ? (
              <View style={D.detailCell}>
                <View style={[D.detailIcon, { backgroundColor: COLORS.warningSoft }]}>
                  <FontAwesome5 name="hand-holding-usd" size={12} color={COLORS.warning} />
                </View>
                <Text style={D.detailCellLabel}>Funding Source</Text>
                <Text style={D.detailCellValue} numberOfLines={2}>{project.fundingSource}</Text>
              </View>
            ) : null}
            {project.contractor ? (
              <View style={D.detailCell}>
                <View style={[D.detailIcon, { backgroundColor: "#EDE9FE" }]}>
                  <FontAwesome5 name="building" size={12} color="#7C3AED" />
                </View>
                <Text style={D.detailCellLabel}>Contractor</Text>
                <Text style={D.detailCellValue} numberOfLines={2}>{project.contractor}</Text>
              </View>
            ) : null}
            {project.accountCode ? (
              <View style={D.detailCell}>
                <View style={[D.detailIcon, { backgroundColor: COLORS.primarySoft }]}>
                  <FontAwesome5 name="barcode" size={12} color={COLORS.primary} />
                </View>
                <Text style={D.detailCellLabel}>Account Code</Text>
                <Text style={D.detailCellValue}>{project.accountCode}</Text>
              </View>
            ) : null}
            {(project.incurredAmount !== undefined && project.incurredAmount !== null) ? (
              <View style={D.detailCell}>
                <View style={[D.detailIcon, { backgroundColor: COLORS.successSoft }]}>
                  <FontAwesome5 name="coins" size={12} color={COLORS.success} />
                </View>
                <Text style={D.detailCellLabel}>Incurred Amount</Text>
                <Text style={[D.detailCellValue, { color: COLORS.success, fontWeight: "900" }]}>
                  {formatBudget(project.incurredAmount)}
                </Text>
              </View>
            ) : null}
          </View>

          {project.description ? (
            <View style={D.descBox}>
              <View style={D.descLabelRow}>
                <FontAwesome5 name="align-left" size={10} color={COLORS.textTertiary} />
                <Text style={D.descLabel}>DESCRIPTION</Text>
              </View>
              <Text style={D.descText}>{project.description}</Text>
            </View>
          ) : null}
        </View>

        <View style={D.card}>
          <Text style={D.cardSectionLabel}>NOTICE TO PROCEED</Text>
          {project.ntpFileUrl ? (
            <TouchableOpacity
              style={D.ntpRow}
              onPress={() => setNtpViewerVisible(true)}
              activeOpacity={0.85}
            >
              <View style={D.ntpIconBox}>
                <FontAwesome5 name="file-pdf" size={16} color={COLORS.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={D.ntpTitle}>View NTP</Text>
                <Text style={D.ntpSubtitle} numberOfLines={1}>
                  {project.ntpFileName ?? "Notice to Proceed document"}
                </Text>
              </View>
              <FontAwesome5 name="external-link-alt" size={12} color={COLORS.textTertiary} />
            </TouchableOpacity>
          ) : (
            <Text style={D.ntpEmpty}>No NTP on file</Text>
          )}
        </View>

        {(displayEngineer || project.projectInspector || project.materialInspector || project.electricalInspector) ? (
          <View style={D.card}>
            <Text style={D.cardSectionLabel}>ASSIGNED PERSONNEL</Text>
            <View style={D.personnelGrid}>
              {displayEngineer ? (
                <View style={D.personnelCell}>
                  <View style={[D.detailIcon, { backgroundColor: COLORS.primarySoft }]}>
                    <FontAwesome5 name="hard-hat" size={12} color={COLORS.primary} />
                  </View>
                  <Text style={D.detailCellLabel}>Project Engineer</Text>
                  <Text style={D.detailCellValue} numberOfLines={2}>{displayEngineer}</Text>
                </View>
              ) : null}
              {project.projectInspector ? (
                <View style={D.personnelCell}>
                  <View style={[D.detailIcon, { backgroundColor: "#EDE9FE" }]}>
                    <FontAwesome5 name="user-check" size={12} color="#7C3AED" />
                  </View>
                  <Text style={D.detailCellLabel}>Project Inspector</Text>
                  <Text style={D.detailCellValue} numberOfLines={2}>{project.projectInspector}</Text>
                </View>
              ) : null}
              {project.materialInspector ? (
                <View style={D.personnelCell}>
                  <View style={[D.detailIcon, { backgroundColor: COLORS.warningSoft }]}>
                    <FontAwesome5 name="boxes" size={12} color={COLORS.warning} />
                  </View>
                  <Text style={D.detailCellLabel}>Material Inspector</Text>
                  <Text style={D.detailCellValue} numberOfLines={2}>{project.materialInspector}</Text>
                </View>
              ) : null}
              {project.electricalInspector ? (
                <View style={D.personnelCell}>
                  <View style={[D.detailIcon, { backgroundColor: COLORS.successSoft }]}>
                    <FontAwesome5 name="bolt" size={12} color={COLORS.success} />
                  </View>
                  <Text style={D.detailCellLabel}>Electrical Inspector</Text>
                  <Text style={D.detailCellValue} numberOfLines={2}>{project.electricalInspector}</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {hasTimeline ? (
          <View style={D.card}>
            <Text style={D.cardSectionLabel}>PROJECT ACCOMPLISHMENT</Text>
            <View style={D.accompGrid}>
              <View style={D.accompCell}>
                <Text style={D.detailCellLabel}>Time Elapsed</Text>
                <Text style={D.accompValue}>
                  {accomplishment.timeElapsed}
                  <Text style={D.accompUnit}>%</Text>
                </Text>
                <Text style={D.accompSub}>% of contract period used</Text>
              </View>
              <View style={[D.accompCell, slippageIsBehind && D.accompCellWarn]}>
                <Text style={D.detailCellLabel}>Slippage</Text>
                <Text style={[D.accompValue, slippageIsBehind && { color: COLORS.warning }]}>
                  {slippageIsBehind ? "+" : ""}{accomplishment.slippage}
                  <Text style={D.accompUnit}>%</Text>
                </Text>
                <Text style={[D.accompSub, slippageIsBehind && { color: COLORS.warning }]}>
                  {slippageIsBehind ? "behind schedule" : "ahead of or on schedule"}
                </Text>
              </View>
              <View style={[D.accompCell, accomplishment.daysDelay > 0 && D.accompCellWarn]}>
                <Text style={D.detailCellLabel}>Days Delay</Text>
                <Text style={[D.accompValue, accomplishment.daysDelay > 0 && { color: COLORS.error }]}>
                  {accomplishment.daysDelay}
                  <Text style={D.accompUnit}> days</Text>
                </Text>
                <Text style={[D.accompSub, accomplishment.daysDelay > 0 && { color: COLORS.error }]}>
                  {accomplishment.daysDelay > 0 ? "estimated calendar days behind" : "no delay recorded"}
                </Text>
              </View>
            </View>

            <View style={D.accompBarBlock}>
              <View style={D.accompBarLabel}>
                <View style={[D.accompLegendDot, { backgroundColor: "#64748B" }]} />
                <Text style={D.accompBarLabelText}>TIME ELAPSED</Text>
                <Text style={D.accompBarPct}>{accomplishment.timeElapsed}%</Text>
              </View>
              <View style={D.progressTrack}>
                <View style={[D.progressFill, { width: `${accomplishment.timeElapsed}%` as any, backgroundColor: "#64748B" }]} />
              </View>
            </View>
            {slippageIsBehind ? (
              <View style={D.slippageAlert}>
                <FontAwesome5 name="exclamation-triangle" size={12} color={COLORS.warning} />
                <Text style={D.slippageAlertText}>
                  Work is{" "}
                  <Text style={{ fontWeight: "900" }}>{accomplishment.slippage}%</Text>
                  {" "}behind the elapsed time — approximately{" "}
                  <Text style={{ fontWeight: "900" }}>{accomplishment.daysDelay} day{accomplishment.daysDelay !== 1 ? "s" : ""}</Text>
                  {" "}behind schedule.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <ProjectOrdersCard
          resumeOrder={project.resumeOrder}
          validationOrder={project.validationOrder}
          suspensionOrder={project.suspensionOrder}
          timeExtension={project.timeExtension}
        />

        {(project.remarks || project.actionTaken) ? (
          <View style={D.card}>
            <Text style={D.cardSectionLabel}>REMARKS & ACTION TAKEN</Text>
            {project.remarks ? (
              <View style={D.remarkBlock}>
                <View style={D.descLabelRow}>
                  <FontAwesome5 name="comment-alt" size={10} color={COLORS.textTertiary} />
                  <Text style={D.descLabel}>REMARKS</Text>
                </View>
                <Text style={D.descText}>{project.remarks}</Text>
              </View>
            ) : null}
            {project.actionTaken ? (
              <View style={D.remarkBlock}>
                <View style={D.descLabelRow}>
                  <FontAwesome5 name="tasks" size={10} color={COLORS.textTertiary} />
                  <Text style={D.descLabel}>ACTION TAKEN</Text>
                </View>
                <Text style={D.descText}>{project.actionTaken}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View
          onLayout={(e) => {
            if (
              totalMs > 0 &&
              lastViewedMilestoneId &&
              !hasScrolledRef.current
            ) {
              hasScrolledRef.current = true;
              const y = e.nativeEvent.layout.y;
              requestAnimationFrame(() => {
                scrollRef.current?.scrollTo({
                  y: Math.max(0, y - 8),
                  animated: true,
                });
              });
            }
          }}
        >
          {totalMs > 0 ? (
            <View style={D.msHeader}>
              <View>
                <Text style={D.msSectionLabel}>CONSTRUCTION PHASES</Text>
                <Text style={D.msSub}>{completedMs} of {totalMs} completed</Text>
              </View>
              <View style={[D.generateBtn, D.generateBtnDone]}>
                <FontAwesome5 name="check" size={11} color={COLORS.success} />
                <Text style={[D.generateBtnText, D.generateBtnTextDone]}>Generated</Text>
              </View>
            </View>
          ) : null}

          {totalMs === 0 && draftCount === 0 ? (
            <View style={D.emptyMsCard}>
              <View style={D.emptyMsIconBox}>
                <FontAwesome5 name="layer-group" size={28} color={COLORS.primary} />
              </View>
              <Text style={D.emptyMsTitle}>No Phases Yet</Text>
              <Text style={D.emptyMsBody}>
                Let AI draft the construction-phase milestones for this project. You'll review and confirm every phase before they're locked in.
              </Text>
              <TouchableOpacity style={D.emptyMsBtn} onPress={handleGenerate} activeOpacity={0.85}>
                {isLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <><FontAwesome5 name="magic" size={13} color="#fff" /><Text style={D.emptyMsBtnText}>Generate Phases</Text></>
                }
              </TouchableOpacity>
            </View>
          ) : hasDraftsOnly ? (
            <View style={D.resumeCard}>
              <View style={D.resumeIconBox}>
                <FontAwesome5 name="search" size={26} color={COLORS.warning} />
              </View>
              <Text style={D.resumeTitle}>
                {draftCount} Draft Phase{draftCount !== 1 ? "s" : ""} Awaiting Review
              </Text>
              <Text style={D.resumeBody}>
                AI has drafted {draftCount} milestone{draftCount !== 1 ? "s" : ""} for this project. Review, edit, or remove anything that doesn't apply — then confirm to lock them in.
              </Text>
              <TouchableOpacity style={D.resumeBtn} onPress={handleGenerate} activeOpacity={0.85}>
                <FontAwesome5 name="clipboard-check" size={13} color="#fff" />
                <Text style={D.resumeBtnText}>Resume Review</Text>
              </TouchableOpacity>
            </View>
          ) : (
            visibleMilestones.map((m, index) => (
              <MilestoneCard
                key={m.id || index}
                m={m}
                index={index}
                isFirst={index === 0}
                prevDone={visibleMilestones[index - 1]?.status?.toString().toLowerCase() === "completed"}
                isLast={index === totalMs - 1}
                onSelect={() => actions.onSelectMilestone(m)}
                onProof={() => actions.onAddProof(m)}
              />
            ))
          )}
        </View>

      </ScrollView>

      <MilestoneGenerationModal
        visible={milestoneModalVisible}
        onClose={() => setMilestoneModalVisible(false)}
        onGenerate={actions.onGenerateMilestones}
        draftMilestones={draftMilestones}
        onSaveAndConfirmAll={actions.onSaveAndConfirmAll}
        onDeleteMilestone={actions.onDeleteMilestone}
      />

      <NtpViewerModal
        visible={ntpViewerVisible}
        onClose={() => setNtpViewerVisible(false)}
        fileUrl={project.ntpFileUrl}
        fileName={project.ntpFileName}
      />
    </View>
  );
};

const D = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 22, paddingBottom: 28, overflow: "hidden",
  },
  orb1: { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)", top: -70, right: -60 },
  orb2: { position: "absolute", width: 140, height: 140, borderRadius: 70,  backgroundColor: "rgba(255,255,255,0.04)", bottom: -50, left: 10  },
  orb3: { position: "absolute", width: 80,  height: 80,  borderRadius: 40,  backgroundColor: "rgba(255,255,255,0.05)", top: 40,    left: -20  },

  heroTopBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  codeChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
  },
  codeText: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.85)" },

  heroLabel: {
    fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.6)",
    letterSpacing: 1, marginBottom: 6,
  },
  heroTitle: {
    fontSize: 22, fontWeight: "900", color: "#fff", lineHeight: 28, marginBottom: 14,
  },

  engineerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  engineerAvatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.3)",
    overflow: "hidden",
  },
  engineerAvatarImg: { width: 36, height: 36, borderRadius: 18 },
  engineerInitials: { fontSize: 12, fontWeight: "900", color: "#fff" },
  engineerName:     { fontSize: 13, fontWeight: "700", color: "#fff" },
  engineerRole:     { fontSize: 10, color: "rgba(255,255,255,0.7)", fontWeight: "600", marginTop: 1 },

  heroBadgeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 11, paddingVertical: 6, borderRadius: 11,
  },
  statusBadgeText: { fontSize: 12, fontWeight: "800" },
  locationChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 11,
    flex: 1,
  },
  durationChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 11,
  },
  locationText: { fontSize: 11, fontWeight: "600", color: "rgba(255,255,255,0.9)", flex: 1 },

  metricsCard: {
    flexDirection: "row",
    marginHorizontal: 18,
    marginTop: -18,
    backgroundColor: COLORS.surface,
    borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 6, shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 12,
    marginBottom: 14,
  },
  metricCol:     { flex: 1, alignItems: "center", gap: 5 },
  metricDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  metricIconBox: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: "center", justifyContent: "center",
  },
  metricValue: { fontSize: 16, fontWeight: "900", color: COLORS.textPrimary },
  metricLabel: { fontSize: 10, fontWeight: "700", color: COLORS.textTertiary },

  scroll: { paddingHorizontal: 18, gap: 14 },

  card: {
    backgroundColor: COLORS.surface, borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: COLORS.border,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  cardSectionLabel: {
    fontSize: 10, fontWeight: "900", color: COLORS.textTertiary,
    letterSpacing: 1, marginBottom: 14,
  },

  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  progressPct:    { fontSize: 28, fontWeight: "900" },
  progressTrack:  {
    height: 10, backgroundColor: COLORS.track, borderRadius: 5,
    overflow: "hidden", marginBottom: 10,
  },
  progressFill:   { height: "100%", borderRadius: 5 },
  stepDots:       { flexDirection: "row", gap: 5, marginBottom: 8, flexWrap: "wrap" },
  stepDot:        { height: 5, flex: 1, minWidth: 10, borderRadius: 3 },
  progressCaption:{ fontSize: 12, color: COLORS.textSecondary, fontWeight: "600" },

  timeline: { gap: 0 },
  timelineItem: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 9,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tlIconBox: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  tlLabel: { fontSize: 11, fontWeight: "700", color: COLORS.textSecondary, flex: 1 },
  tlValue: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary },

  detailGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 0 },
  detailCell: {
    flex: 1, minWidth: "45%",
    backgroundColor: COLORS.background, borderRadius: 14,
    padding: 12, gap: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  detailIcon: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: "center", justifyContent: "center", marginBottom: 2,
  },
  detailCellLabel: {
    fontSize: 9, fontWeight: "800", color: COLORS.textTertiary,
    textTransform: "uppercase", letterSpacing: 0.5,
  },
  detailCellValue: { fontSize: 13, fontWeight: "700", color: COLORS.textPrimary, lineHeight: 17 },

  descBox: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: COLORS.border },
  descLabelRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  descLabel: { fontSize: 10, fontWeight: "800", color: COLORS.textTertiary, letterSpacing: 0.6 },
  descText:  { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },

  ntpRow: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: COLORS.background, borderRadius: 14,
    padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  ntpIconBox: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    backgroundColor: COLORS.primarySoft,
  },
  ntpTitle: { fontSize: 13, fontWeight: "800", color: COLORS.textPrimary },
  ntpSubtitle: { fontSize: 11, fontWeight: "600", color: COLORS.textSecondary, marginTop: 2 },
  ntpEmpty: {
    fontSize: 12, fontWeight: "600", color: COLORS.textTertiary,
    fontStyle: "italic",
  },

  personnelGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  personnelCell: {
    flex: 1, minWidth: "45%",
    backgroundColor: COLORS.background, borderRadius: 14,
    padding: 12, gap: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },

  accompGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 6 },
  accompCell: {
    flex: 1, minWidth: "45%",
    backgroundColor: COLORS.background, borderRadius: 14,
    padding: 12, gap: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  accompCellWarn: {
    backgroundColor: COLORS.warningSoft,
    borderColor: "#FDE68A",
  },
  accompValue: {
    fontSize: 26, fontWeight: "900", color: COLORS.textPrimary, lineHeight: 30,
  },
  accompUnit: { fontSize: 13, fontWeight: "700", color: COLORS.textTertiary },
  accompSub:  { fontSize: 10, color: COLORS.textTertiary, fontWeight: "600" },
  accompBarBlock: { marginTop: 12 },
  accompBarLabel: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  accompLegendDot: { width: 10, height: 10, borderRadius: 3 },
  accompBarLabelText: {
    fontSize: 10, fontWeight: "800", color: COLORS.textSecondary,
    letterSpacing: 0.8, flex: 1,
  },
  accompBarPct: { fontSize: 11, fontWeight: "800", color: COLORS.textPrimary },
  slippageAlert: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 12, padding: 12, marginTop: 12,
  },
  slippageAlertText: {
    fontSize: 12, color: COLORS.warning, flex: 1, lineHeight: 17, fontWeight: "600",
  },

  remarkBlock: { marginBottom: 12 },

  msHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "flex-start", marginBottom: 14,
  },
  msSectionLabel: { fontSize: 10, fontWeight: "900", color: COLORS.textTertiary, letterSpacing: 1 },
  msSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3, fontWeight: "600" },

  generateBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 13,
  },
  generateBtnDone: {
    backgroundColor: COLORS.successSoft,
    borderWidth: 1, borderColor: "#A7F3D0",
  },
  generateBtnText:     { fontSize: 12, fontWeight: "800", color: "#fff" },
  generateBtnTextDone: { color: COLORS.success },

  emptyMsCard: {
    backgroundColor: COLORS.surface, borderRadius: 20,
    padding: 32, alignItems: "center", gap: 10,
    borderWidth: 1.5, borderColor: COLORS.accentBorder,
    borderStyle: "dashed",
  },
  emptyMsIconBox: {
    width: 68, height: 68, borderRadius: 20,
    backgroundColor: COLORS.primarySoft,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  emptyMsTitle:   { fontSize: 17, fontWeight: "800", color: COLORS.textPrimary },
  emptyMsBody:    { fontSize: 13, color: COLORS.textSecondary, textAlign: "center", lineHeight: 19, paddingHorizontal: 8 },
  emptyMsBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.primary, paddingHorizontal: 22,
    paddingVertical: 12, borderRadius: 14, marginTop: 6,
  },
  emptyMsBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  resumeCard: {
    backgroundColor: COLORS.warningSoft,
    borderRadius: 20, padding: 26, alignItems: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#FDE68A",
  },
  resumeIconBox: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: "#fff",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
    borderWidth: 1, borderColor: "#FDE68A",
  },
  resumeTitle: { fontSize: 16, fontWeight: "900", color: COLORS.warning, textAlign: "center" },
  resumeBody:  {
    fontSize: 12.5, color: COLORS.warning, textAlign: "center",
    lineHeight: 18, fontWeight: "600", paddingHorizontal: 4,
  },
  resumeBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: 14,
    marginTop: 6,
  },
  resumeBtnText: { fontSize: 14, fontWeight: "800", color: "#fff" },

  msWrapper:  { position: "relative" },
  connector: {
    position: "absolute", left: 19, top: 54, width: 2,
    bottom: 0, zIndex: 0,
  },
  msCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, paddingVertical: 14, paddingHorizontal: 14,
    marginBottom: 10, borderWidth: 1.5,
    elevation: 1, shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4,
  },
  stepCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center", flexShrink: 0, zIndex: 1,
  },
  msContent:  { flex: 1 },
  msTitleRow: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 3 },
  msPhase:    { fontSize: 10, fontWeight: "800", color: COLORS.textTertiary, letterSpacing: 0.4 },
  proofBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: COLORS.primarySoft,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  proofBadgeText: { fontSize: 9, fontWeight: "800", color: COLORS.primary },
  reviewBadge: {
    flexDirection: "row", alignItems: "center", gap: 3,
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1, borderColor: "#FDE68A",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  reviewBadgeText: { fontSize: 8, fontWeight: "900", color: COLORS.warning, letterSpacing: 0.4 },
  reviewIconBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.warningSoft,
    borderWidth: 1, borderColor: "#FDE68A",
    alignItems: "center", justifyContent: "center",
  },
  msTitle: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary, lineHeight: 18, marginBottom: 6 },
  msStatusRow: { flexDirection: "row" },
  msStatusPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8,
  },
  msStatusDot:  { width: 5, height: 5, borderRadius: 3 },
  msStatusText: { fontSize: 10, fontWeight: "700" },

  msActions: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 },
  cameraBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  chevronWrap: {
    width: 24, height: 38,
    alignItems: "center", justifyContent: "center",
  },
  lockWrap: {
    width: 32, alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
});
