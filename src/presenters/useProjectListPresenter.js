import { useCallback, useEffect, useMemo, useState } from "react";
import { ProjectModel } from "../models/ProjectModel";

export const useProjectListPresenter = (onSelectProject, onBack) => {
  const [projects, setProjects] = useState([]);
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

  // Filter Logic
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
