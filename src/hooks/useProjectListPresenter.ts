import { useEffect, useMemo, useState } from "react";
import { ProjectModel } from "../models/ProjectModel";
import type { Project } from "../types";
import { logger } from "../utils/logger";

export const useProjectListPresenter = (
  onSelectProject: (projectId: string) => void,
  onBack?: () => void,
) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("All");

  useEffect(() => {
    setIsLoading(true);

    // Real-time subscription — any web app change pushes here instantly
    const unsubscribe = ProjectModel.subscribeToAll(
      (data) => {
        setProjects(data);
        setIsLoading(false);
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
