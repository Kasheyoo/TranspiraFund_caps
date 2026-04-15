import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectModel } from "../models/ProjectModel";
import { callFn } from "../services/CloudFunctionService";
import type { Project } from "../types";
import { logger } from "../utils/logger";

// Statuses assigned by HCSD web workflow before the engineer takes over.
// When the mobile app sees these, it auto-promotes the project to "In Progress".
const PRE_ACTIVE_STATUSES = ["Draft", "For Mayor"];

export const useProjectListPresenter = (
  onSelectProject: (projectId: string) => void,
  onBack?: () => void,
) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  // Track which projects have already been synced this session — avoids duplicate calls
  const syncedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setIsLoading(true);

    // Real-time subscription — any web app change pushes here instantly
    const unsubscribe = ProjectModel.subscribeToAll(
      (data) => {
        setProjects(data);
        setIsLoading(false);

        // Auto-promote any Draft / For Mayor project to "In Progress"
        const toSync = data.filter(
          (p) => PRE_ACTIVE_STATUSES.includes(p.status ?? "") && !syncedIds.current.has(p.id),
        );
        toSync.forEach((p) => {
          syncedIds.current.add(p.id);
          callFn("markProjectOngoing", { projectId: p.id }).catch((err) => {
            // On failure, remove from synced set so it can retry next update
            syncedIds.current.delete(p.id);
            logger.error(`markProjectOngoing failed for ${p.id}:`, err);
          });
        });
      },
      (err) => {
        logger.error("Project list subscription error:", err);
        setIsLoading(false);
      },
    );

    return unsubscribe; // Cleans up listener on unmount
  }, []);

  const filteredProjects = useMemo(() => {
    if (activeFilter === "All") return projects;
    return projects.filter((p) => p.status === activeFilter);
  }, [projects, activeFilter]);

  return {
    data: {
      projects: filteredProjects,
      isLoading,
      activeFilter,
    },
    actions: {
      onSelectProject,
      loadProjects: () => {}, // No-op — real-time listener handles updates
      setFilter: setActiveFilter,
      goBack: onBack,
    },
  };
};
