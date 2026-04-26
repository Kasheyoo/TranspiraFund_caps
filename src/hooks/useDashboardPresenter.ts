import { useCallback, useEffect, useState } from "react";
import { ProjectModel } from "../models/ProjectModel";
import { AuditTrailService } from "../services/AuditTrailService";
import type { AuditTrail, DashboardStats } from "../types";
import { logger } from "../utils/logger";
import { useNavigation } from "@react-navigation/native";
import { ROUTES } from "../navigation/routes";
import { useAuth } from "../context/AuthContext";

export const useDashboardPresenter = (_navigationCallback?: () => void) => {
  const { userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({ progress: 0, done: 0, delay: 0, draft: 0, forMayor: 0 });
  const [recentLogs, setRecentLogs] = useState<AuditTrail[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation<any>();

  const engineerName = userProfile?.firstName
    ? `${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
    : userProfile?.name || "Project Engineer";
  const engineerPhotoURL = userProfile?.photoURL;

  // Live project stream so the "Completed" count ticks the moment the last
  // milestone of a project is marked Completed — no need to pull-to-refresh.
  // Status classification goes through ProjectModel.deriveStatus so a project
  // with all milestones done reads as "Completed" even if the server-side
  // status field hasn't flipped yet.
  useEffect(() => {
    const unsub = ProjectModel.subscribeToAll(
      (projects) => {
        let inProgress = 0;
        let completed = 0;
        let delayed = 0;
        let draft = 0;
        let forMayor = 0;

        projects.forEach((proj) => {
          const s = ProjectModel.deriveStatus(proj).toLowerCase();
          if (s === "completed")                              completed++;
          else if (s === "delayed")                          delayed++;
          else if (s === "in progress" || s === "ongoing")   inProgress++;
          else if (s === "draft")                            draft++;
          else if (s === "for mayor")                        forMayor++;
        });

        setStats({ progress: inProgress, done: completed, delay: delayed, draft, forMayor });
        setIsLoading(false);
      },
      (error) => {
        logger.error("Dashboard projects subscription error:", error);
        setIsLoading(false);
      },
    );
    return unsub;
  }, []);

  // Audit logs are one-shot — refreshed on mount and via onRefresh. Projects
  // update live via the subscription above, so pull-to-refresh only re-fetches
  // logs.
  const loadLogs = useCallback(async () => {
    try {
      const logs = await AuditTrailService.getAll();
      setRecentLogs(logs);
    } catch (error) {
      logger.error("Dashboard logs load error:", error);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return {
    data: { stats, recentLogs, engineerName, engineerPhotoURL, isLoading },
    actions: {
      onRefresh: loadLogs,
      onViewAllActivity: () => navigation.navigate(ROUTES.AUDIT_TRAIL),
    },
  };
};
