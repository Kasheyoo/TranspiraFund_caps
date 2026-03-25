import { useCallback, useEffect, useState } from "react";
import { ProjectModel } from "../models/ProjectModel";
import { AuditTrailService } from "../services/AuditTrailService";
import type { AuditTrail, DashboardStats } from "../types";
import { logger } from "../utils/logger";
import { useNavigation } from "@react-navigation/native";
import { ROUTES } from "../navigation/routes";

export const useDashboardPresenter = (_navigationCallback?: () => void) => {
  const [stats, setStats] = useState<DashboardStats>({ progress: 0, done: 0, delay: 0 });
  const [recentLogs, setRecentLogs] = useState<AuditTrail[]>([]);
  const [engineerName, setEngineerName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigation = useNavigation<any>();

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const projects = await ProjectModel.getAll();
      if (projects.length > 0) {
        setEngineerName(projects[0].engineer || "Project Engineer");

        let inProgress = 0;
        let completed = 0;
        let delayed = 0;

        projects.forEach((proj) => {
          const s = proj.status?.toLowerCase();
          if (s === "completed") {
            completed++;
          } else if (s === "delayed") {
            delayed++;
          } else if (s === "in progress") {
            inProgress++;
          }
        });

        setStats({ progress: inProgress, done: completed, delay: delayed });
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
    data: { stats, recentLogs, engineerName, isLoading },
    actions: { 
      onRefresh: loadDashboard,
      onViewAllActivity: () => navigation.navigate(ROUTES.AUDIT_TRAIL),
    },
  };
};
