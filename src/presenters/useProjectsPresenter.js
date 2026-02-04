import { useEffect, useState } from "react";
import { ProjectModel } from "../models/ProjectModel";

export const useProjectsPresenter = (onNavigate) => {
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await ProjectModel.getAll();
      setProjects(data);
    } catch (error) {
      console.error("Error loading projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const filteredProjects = projects.filter((p) => {
    if (filter === "All") return true;
    return p.status === filter;
  });

  return {
    data: { projects: filteredProjects, filter, isLoading },
    actions: {
      setFilter,
      refresh: loadProjects,
      navigate: onNavigate,
    },
  };
};
