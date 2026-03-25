import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import {
  Alert,
  RefreshControl,
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

export const ProjectDetailsView = ({
  data,
  actions,
  onBack,
}: ProjectDetailsViewProps) => {
  const insets = useSafeAreaInsets();
  const { project, isLoading } = data;

  if (!project) return null;

  return (
    <View style={[styles.mainContainer, { paddingTop: insets.top }]}>
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={onBack} style={styles.iconButton}>
          <FontAwesome5 name="arrow-left" size={18} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Project Overview</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={actions.onRefresh}
            tintColor={COLORS.primary}
          />
        }
      >
        <View style={styles.infoCard}>
          <Text style={styles.projectMainTitle}>
            {project.projectTitle || "Untitled Project"}
          </Text>

          <View style={styles.infoRow}>
            <FontAwesome5 name="user-tie" size={12} color="#8E8E93" />
            <Text style={styles.infoText}>
              Engineer: {project.engineer || "Unassigned"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome5 name="map-marker-alt" size={12} color="#8E8E93" />
            <Text style={styles.infoText}>
              Location: {project.location || "Not specified"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <FontAwesome5 name="calendar-alt" size={12} color="#8E8E93" />
            <Text style={styles.infoText}>
              Target: {project.completionDate || "TBD"}
            </Text>
          </View>
        </View>

        <View style={styles.progressCard}>
          <View style={styles.progressTextRow}>
            <Text style={styles.completionLabel}>PROGRESS</Text>
            <Text style={styles.completionValue}>{project.progress || 0}%</Text>
          </View>
          <View style={styles.progressBarTrack}>
            <View
              style={[
                styles.progressBarThumb,
                { width: `${project.progress || 0}%` },
              ]}
            />
          </View>
        </View>

        <Text style={styles.milestoneHeading}>MILESTONES</Text>

        {project.milestones?.map((m, index) => {
          const isFirst = index === 0;
          const prevStatus = project.milestones![index - 1]?.status
            ?.toString()
            .toLowerCase();
          const isUnlocked = isFirst || prevStatus === "completed";
          const isDone = m.status?.toString().toLowerCase() === "completed";
          const isLocked = !isUnlocked;

          return (
            <TouchableOpacity
              key={m.id || index}
              style={[styles.milestoneCard, isLocked && styles.milestoneLocked]}
              onPress={() =>
                isLocked
                  ? Alert.alert("Locked", "Complete the previous step first.")
                  : actions.onSelectMilestone(m)
              }
              activeOpacity={isLocked ? 1 : 0.7}
            >
              <View
                style={[
                  styles.statusIconBox,
                  isLocked
                    ? styles.bgLocked
                    : isDone
                      ? styles.bgDone
                      : styles.bgPending,
                ]}
              >
                <FontAwesome5
                  name={isLocked ? "lock" : isDone ? "check" : "clock"}
                  size={12}
                  color={isDone ? "#FFF" : isLocked ? "#999" : COLORS.primary}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={[styles.mTitle, isLocked && styles.textLocked]}>
                  {m.title}
                </Text>
                <Text
                  style={[styles.mStatus, isDone && { color: COLORS.success }]}
                >
                  {isLocked ? "Locked" : m.status || "Pending"}
                </Text>
              </View>

              {!isLocked && (
                <FontAwesome5 name="chevron-right" size={12} color="#C7C7CC" />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#F8F9FA" },
  navHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  iconButton: {
    width: 40,
    height: 40,
    backgroundColor: "#FFF",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 1,
  },
  navTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1C1E",
    marginLeft: 15,
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 15,
    marginTop: 10,
  },
  projectMainTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1C1E",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    color: "#8E8E93",
    marginLeft: 10,
    fontWeight: "500",
  },
  progressCard: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 20,
    marginBottom: 30,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  completionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#8E8E93",
    letterSpacing: 0.5,
  },
  completionValue: { fontSize: 14, fontWeight: "800", color: COLORS.primary },
  progressBarTrack: {
    height: 8,
    backgroundColor: "#F2F2F7",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarThumb: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  milestoneHeading: {
    fontSize: 13,
    fontWeight: "800",
    color: "#8E8E93",
    marginBottom: 16,
    letterSpacing: 1,
  },
  milestoneCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F2F2F7",
  },
  milestoneLocked: {
    backgroundColor: "rgba(242, 242, 247, 0.6)",
    borderColor: "transparent",
    opacity: 0.6,
  },
  statusIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  bgPending: { backgroundColor: COLORS.primary + "15" },
  bgDone: { backgroundColor: COLORS.success },
  bgLocked: { backgroundColor: "#E5E5EA" },
  mTitle: { fontSize: 15, fontWeight: "700", color: "#1A1C1E", lineHeight: 20 },
  textLocked: { color: "#8E8E93" },
  mStatus: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 4,
    fontWeight: "600",
    textTransform: "uppercase",
  },
});
