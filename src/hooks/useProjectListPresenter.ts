import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ProjectModel } from "../models/ProjectModel";
import { callFn } from "../services/CloudFunctionService";
import type { Project } from "../types";
import { logger } from "../utils/logger";


const PRE_ACTIVE_STATUSES = ["Draft", "For Mayor"];

export const useProjectListPresenter = (
  onSelectProject: (projectId: string) => void,
  onBack?: () => void,
) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");


  const syncedIds = useRef<Set<string>>(new Set());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setIsLoading(true);


    const unsubscribe = ProjectModel.subscribeToAll(
      (data) => {
        setProjects(data);
        setIsLoading(false);


        const toSync = data.filter(
          (p) => PRE_ACTIVE_STATUSES.includes(p.status ?? "") && !syncedIds.current.has(p.id),
        );
        toSync.forEach((p) => {
          syncedIds.current.add(p.id);
          callFn("markProjectOngoing", { projectId: p.id }).catch((err) => {

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

    return unsubscribe;
  }, []);


  // Newest-first uses createdAt because no assignedAt field exists today.
  // A project created earlier on web and reassigned to this PE later still
  // sorts down. When the web repo stamps assignedAt on createProject and
  // reassignProjectEngineer, switch the key to (assignedAt ?? createdAt);
  // the rest of this logic stays the same. Missing or malformed timestamps
  // sort to the bottom.
  const sortedProjects = useMemo(() => {
    const createdAtSeconds = (p: Project): number => {
      const s = p.createdAt?.seconds;
      return typeof s === "number" && Number.isFinite(s) ? s : Number.NEGATIVE_INFINITY;
    };
    return [...projects].sort((a, b) => {
      const sa = createdAtSeconds(a);
      const sb = createdAtSeconds(b);
      if (sa === sb) return 0;
      if (!Number.isFinite(sa)) return 1;
      if (!Number.isFinite(sb)) return -1;
      return sb - sa;
    });
  }, [projects]);

  const ACTIVE_ALIASES: Record<string, true> = { "Draft": true, "For Mayor": true, "Ongoing": true, "ongoing": true };
  const filteredProjects = useMemo(() => {
    if (activeFilter === "All") return sortedProjects;
    return sortedProjects.filter((p) => {
      const raw = ProjectModel.deriveStatus(p);
      const display = ACTIVE_ALIASES[raw] ? "In Progress" : raw;
      return display === activeFilter;
    });
  }, [sortedProjects, activeFilter]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    refreshTimerRef.current = setTimeout(() => setIsRefreshing(false), 1200);
  }, []);

  return {
    data: {
      projects: filteredProjects,
      allProjects: projects,
      isLoading,
      isRefreshing,
      activeFilter,
    },
    actions: {
      onSelectProject,
      loadProjects: () => {},
      setFilter: setActiveFilter,
      onRefresh,
      goBack: onBack,
    },
  };
};
