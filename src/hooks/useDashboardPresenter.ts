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

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const projects = await ProjectModel.getAll();
      if (projects.length > 0) {

        let inProgress = 0;
        let completed = 0;
        let delayed = 0;
        let draft = 0;
        let forMayor = 0;

        projects.forEach((proj) => {
          const s = proj.status?.toLowerCase();
          if (s === "completed")                              completed++;
          else if (s === "delayed")                          delayed++;
          else if (s === "in progress" || s === "ongoing")   inProgress++;
          else if (s === "draft")                            draft++;
          else if (s === "for mayor")                        forMayor++;
        });

        setStats({ progress: inProgress, done: completed, delay: delayed, draft, forMayor });
      }

      const logs = await AuditTrailService.getAll();
      setRecentLogs(logs);
    } catch (error) {
      logger.error("Dashboard Load Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  return {
    data: { stats, recentLogs, engineerName, engineerPhotoURL, isLoading },
    actions: { 
      onRefresh: loadDashboard,
      onViewAllActivity: () => navigation.navigate(ROUTES.AUDIT_TRAIL),
    },
  };
};
