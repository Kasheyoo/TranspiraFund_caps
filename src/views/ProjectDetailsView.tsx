import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
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

interface ProjectDetailsData {
  project: Project | null;
  isLoading: boolean;
}

interface ProjectDetailsActions {
  onRefresh: () => void;
  onSelectMilestone: (m: Milestone | null) => void;
}

interface ProjectDetailsViewProps {
  data: ProjectDetailsData;
  actions: ProjectDetailsActions;
  onBack: () => void;
}

const STATUS_COLORS: Record<string, { accent: string; bg: string; text: string }> = {
  "In Progress": { accent: COLORS.primary, bg: COLORS.primarySoft, text: COLORS.primary },
  "Completed":   { accent: COLORS.success, bg: COLORS.successSoft, text: COLORS.success },
  "Delayed":     { accent: COLORS.error,   bg: COLORS.errorSoft,   text: COLORS.error   },
  "Pending":     { accent: COLORS.warning, bg: COLORS.warningSoft, text: COLORS.warning },
};
const DEFAULT_STATUS = { accent: COLORS.textTertiary, bg: COLORS.track, text: COLORS.textTertiary };

const formatBudget = (amount?: number): string => {
  if (!amount) return "—";
  if (amount >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `₱${(amount / 1_000).toFixed(1)}K`;
  return `₱${amount.toLocaleString()}`;
};

interface InfoRowProps {
  icon: string;
  label: string;
  value?: string;
  iconColor?: string;
}

const InfoRow = ({ icon, label, value, iconColor = COLORS.textTertiary }: InfoRowProps) => (
  <View style={infoStyles.row}>
    <View style={infoStyles.iconBox}>
      <FontAwesome5 name={icon} size={12} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value || "—"}</Text>
    </View>
  </View>
);

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingVertical: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
});

export const ProjectDetailsView = ({
  data,
  actions,
  onBack,
}: ProjectDetailsViewProps) => {
  const insets = useSafeAreaInsets();
  const { project } = data;

  if (!project) return null;

  const status = project.status || "Pending";
  const sc = STATUS_COLORS[status] || DEFAULT_STATUS;
  const progress = project.progress || 0;
  const completedMilestones = project.milestones?.filter(
    (m) => m.status?.toString().toLowerCase() === "completed",
  ).length ?? 0;
  const totalMilestones = project.milestones?.length ?? 0;

  return (
    <View style={styles.root}>
      {/* Teal hero header */}
      <View style={[styles.hero, { paddingTop: insets.top + 12 }]}>
        {/* Decorative orbs */}
        <View style={styles.orb1} />
        <View style={styles.orb2} />

        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
          <FontAwesome5 name="arrow-left" size={15} color="#fff" />
        </TouchableOpacity>

        <View style={styles.heroContent}>
          <View style={[styles.heroIconBox, { backgroundColor: "rgba(255,255,255,0.18)" }]}>
            <FontAwesome5 name="hard-hat" size={22} color="#fff" />
          </View>

          <Text style={styles.heroTitle} numberOfLines={3}>
            {project.projectTitle || project.title || "Untitled Project"}
          </Text>

          {project.projectCode ? (
            <Text style={styles.heroCode}>{project.projectCode}</Text>
          ) : null}

          <View style={[styles.heroBadge, { backgroundColor: sc.bg }]}>
            <View style={[styles.heroBadgeDot, { backgroundColor: sc.accent }]} />
            <Text style={[styles.heroBadgeText, { color: sc.text }]}>{status}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress card */}
        <View style={styles.card}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.sectionLabel}>OVERALL PROGRESS</Text>
              <Text style={styles.milestoneCaption}>
                {completedMilestones} of {totalMilestones} milestones completed
              </Text>
            </View>
            <Text style={[styles.progressPct, { color: sc.accent }]}>{progress}%</Text>
          </View>

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${progress}%`, backgroundColor: sc.accent },
              ]}
            />
          </View>
        </View>

        {/* Budget card */}
        {(project.budget || project.contractAmount) ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>FINANCIALS</Text>
            <View style={styles.budgetRow}>
              <View style={styles.budgetItem}>
                <View style={[styles.budgetIconBox, { backgroundColor: COLORS.primarySoft }]}>
                  <FontAwesome5 name="file-contract" size={14} color={COLORS.primary} />
                </View>
                <Text style={styles.budgetLabel}>Contract Amount</Text>
                <Text style={[styles.budgetValue, { color: COLORS.primary }]}>
                  {formatBudget(project.contractAmount || project.budget)}
                </Text>
              </View>

              {project.budget && project.contractAmount && project.budget !== project.contractAmount ? (
                <View style={styles.budgetDivider} />
              ) : null}

              {project.budget && project.contractAmount && project.budget !== project.contractAmount ? (
                <View style={styles.budgetItem}>
                  <View style={[styles.budgetIconBox, { backgroundColor: COLORS.successSoft }]}>
                    <FontAwesome5 name="coins" size={14} color={COLORS.success} />
                  </View>
                  <Text style={styles.budgetLabel}>Budget Allocated</Text>
                  <Text style={[styles.budgetValue, { color: COLORS.success }]}>
                    {formatBudget(project.budget)}
                  </Text>
                </View>
              ) : null}
            </View>

            {project.contractor ? (
              <View style={[styles.contractorRow]}>
                <FontAwesome5 name="building" size={11} color={COLORS.textTertiary} />
                <Text style={styles.contractorText}>Contractor: {project.contractor}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* Project info card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>PROJECT INFORMATION</Text>
          <View style={styles.divider} />

          <InfoRow icon="user-tie"       label="Engineer"          value={project.engineer}        iconColor={COLORS.primary} />
          <View style={styles.rowDivider} />
          <InfoRow icon="map-marker-alt" label="Location"          value={project.location}        iconColor={COLORS.error} />
          <View style={styles.rowDivider} />
          <InfoRow icon="calendar-plus"  label="Start Date"        value={project.startDate}       iconColor={COLORS.success} />
          <View style={styles.rowDivider} />
          <InfoRow icon="calendar-check" label="Completion Target" value={project.completionDate}  iconColor={COLORS.warning} />

          {project.description ? (
            <>
              <View style={styles.rowDivider} />
              <InfoRow icon="align-left" label="Description" value={project.description} iconColor={COLORS.textTertiary} />
            </>
          ) : null}
        </View>

        {/* Milestones */}
        {totalMilestones > 0 ? (
          <View style={styles.milestonesWrap}>
            <View style={styles.milestonesHeader}>
              <Text style={styles.sectionLabel}>MILESTONES</Text>
              <Text style={styles.milestoneCount}>
                {completedMilestones}/{totalMilestones}
              </Text>
            </View>

            {project.milestones!.map((m, index) => {
              const isFirst = index === 0;
              const prevStatus = project.milestones![index - 1]?.status?.toString().toLowerCase();
              const isUnlocked = isFirst || prevStatus === "completed";
              const isDone = m.status?.toString().toLowerCase() === "completed";
              const isActive = isUnlocked && !isDone;
              const isLocked = !isUnlocked;

              return (
                <View key={m.id || index} style={styles.milestoneWrapper}>
                  {/* Connector line */}
                  {index < totalMilestones - 1 ? (
                    <View
                      style={[
                        styles.connector,
                        { backgroundColor: isDone ? COLORS.success : COLORS.border },
                      ]}
                    />
                  ) : null}

                  <TouchableOpacity
                    style={[
                      styles.milestoneCard,
                      isLocked && styles.milestoneLocked,
                      isDone && styles.milestoneDone,
                    ]}
                    onPress={() =>
                      isLocked
                        ? Alert.alert(
                            "Milestone Locked",
                            "Complete the previous milestone first to unlock this one.",
                          )
                        : actions.onSelectMilestone(m)
                    }
                    activeOpacity={isLocked ? 1 : 0.82}
                  >
                    {/* Status indicator */}
                    <View
                      style={[
                        styles.msIconBox,
                        isDone
                          ? { backgroundColor: COLORS.success }
                          : isActive
                            ? { backgroundColor: COLORS.primarySoft, borderWidth: 2, borderColor: COLORS.primary }
                            : { backgroundColor: COLORS.track, borderWidth: 1, borderColor: COLORS.border },
                      ]}
                    >
                      <FontAwesome5
                        name={isDone ? "check" : isLocked ? "lock" : "clock"}
                        size={11}
                        color={isDone ? "#fff" : isActive ? COLORS.primary : COLORS.textTertiary}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.msTitle,
                          isLocked && { color: COLORS.textTertiary },
                          isDone && { color: COLORS.textPrimary },
                        ]}
                        numberOfLines={2}
                      >
                        {m.title}
                      </Text>
                      <Text
                        style={[
                          styles.msStatus,
                          isDone && { color: COLORS.success },
                          isActive && { color: COLORS.primary },
                        ]}
                      >
                        {isLocked ? "Locked · Complete previous first" : m.status || "Pending"}
                      </Text>
                    </View>

                    {!isLocked && (
                      <FontAwesome5
                        name="angle-right"
                        size={16}
                        color={isDone ? COLORS.success : COLORS.textTertiary}
                      />
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Hero
  hero: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingBottom: 28,
    overflow: "hidden",
  },
  orb1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -40,
    right: -40,
  },
  orb2: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -30,
    left: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  heroContent: { gap: 8 },
  heroIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#fff",
    lineHeight: 28,
  },
  heroCode: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.65)",
    letterSpacing: 0.5,
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 2,
  },
  heroBadgeDot: { width: 6, height: 6, borderRadius: 3 },
  heroBadgeText: { fontSize: 12, fontWeight: "800" },

  // Scroll
  scroll: { paddingHorizontal: 20, paddingTop: 20, gap: 14 },

  // Cards
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textTertiary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  divider: { height: 1, backgroundColor: COLORS.border, marginBottom: 4 },
  rowDivider: { height: 1, backgroundColor: COLORS.border, marginLeft: 44 },

  // Progress
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  milestoneCaption: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "500", marginTop: 2 },
  progressPct: { fontSize: 26, fontWeight: "900" },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.track,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },

  // Budget
  budgetRow: { flexDirection: "row", gap: 0 },
  budgetItem: { flex: 1, alignItems: "center", gap: 8, paddingVertical: 6 },
  budgetDivider: { width: 1, backgroundColor: COLORS.border, marginVertical: 4 },
  budgetIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  budgetLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  budgetValue: { fontSize: 20, fontWeight: "900" },
  contractorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  contractorText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: "600" },

  // Milestones
  milestonesWrap: { gap: 0 },
  milestonesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  milestoneCount: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.textSecondary,
  },
  milestoneWrapper: { position: "relative" },
  connector: {
    position: "absolute",
    left: 16,
    top: 50,
    width: 2,
    height: 18,
    zIndex: 1,
  },
  milestoneCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  milestoneLocked: {
    opacity: 0.55,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    elevation: 0,
  },
  milestoneDone: { borderColor: "#A7F3D0" },
  msIconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  msTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 19,
    marginBottom: 3,
  },
  msStatus: {
    fontSize: 12,
    color: COLORS.textTertiary,
    fontWeight: "600",
    textTransform: "capitalize",
  },
});
