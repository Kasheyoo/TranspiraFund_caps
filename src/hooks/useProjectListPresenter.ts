import { useCallback, useEffect, useMemo, useState } from "react";
import { ProjectModel } from "../models/ProjectModel";
import type { Project } from "../types";

export const useProjectListPresenter = (
  onSelectProject: (projectId: string) => void,
  onBack?: () => void,
) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ProjectModel.getAll();
      setProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const filteredProjects = useMemo(() => {
    if (activeFilter === "All") return projects;
    return projects.filter((p) => p.status === activeFilter);
  }, [projects, activeFilter]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return {
    data: {
      projects: filteredProjects,
      isLoading,
      activeFilter,
    },
    actions: {
      onSelectProject,
      loadProjects,
      setFilter: setActiveFilter,
      goBack: onBack,
    },
  };
};
