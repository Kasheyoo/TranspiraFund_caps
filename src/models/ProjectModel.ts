import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { requireAuth } from "../utils/authGuard";
import { getCached, setCached } from "../utils/cache";
import { logger } from "../utils/logger";
import { logFirestoreError } from "../utils/permissionError";
import { requireTenantId } from "../utils/tenant";
import type { Milestone, Project } from "../types";

export class ProjectModel {
  private static normalize(raw: Record<string, unknown>, id: string): Project {
    const r = raw as unknown as Project;
    return {
      ...r,
      id,
      title:          r.projectName      ?? r.title,
      engineer:       r.projectEngineer  ?? r.engineer,
      startDate:      r.officialDateStarted  ?? r.startDate,
      completionDate: r.originalDateCompletion ?? r.completionDate,
      location: r.barangay
        ? r.sitioStreet
          ? `${r.sitioStreet}, ${r.barangay}`
          : r.barangay
        : r.location,
      budget: r.contractAmount ?? r.budget,
    };
  }

  private static async fetchMilestonesForProjects(
    projectIds: string[],
    tid: string,
  ): Promise<Record<string, Milestone[]>> {
    const byProject: Record<string, Milestone[]> = {};
    await Promise.all(
      projectIds.map(async (projectId) => {
        try {
          const snaps = await getDocs(
            query(
              collection(db, "projects", projectId, "milestones"),
              where("tenantId", "==", tid),
            ),
          );
          byProject[projectId] = snaps.docs.map(
            (d) => ({ id: d.id, projectId, ...d.data() } as Milestone),
          );
        } catch {
          byProject[projectId] = [];
        }
      }),
    );
    return byProject;
  }

  private static applyProgress(
    projects: Project[],
    byProject: Record<string, Milestone[]>,
  ): Project[] {
    return projects.map((project) => {
      const milestones = (byProject[project.id] || []).sort(
        (a, b) => (a.sequence || 0) - (b.sequence || 0),
      );
      return {
        ...project,
        milestones,
        progress: typeof project.actualPercent === "number"
          ? project.actualPercent
          : ProjectModel.computeProgress(milestones),
      };
    });
  }

  private static computeProgress(milestones: Milestone[]): number {
    const confirmed = milestones.filter((m) => m.confirmed !== false);
    if (confirmed.length === 0) return 0;
    const DONE = new Set(["done", "complete", "completed"]);
    const completed = confirmed.filter(
      (m) => DONE.has(m.status?.toString().toLowerCase() ?? ""),
    ).length;
    return Math.round((completed / confirmed.length) * 100);
  }

  static async getAll(): Promise<Project[]> {
    const uid = requireAuth();
    try {
      const tid = requireTenantId();
      const cacheKey = `projects_all:${tid}`;
      const cached = getCached<Project[]>(cacheKey);
      if (cached) return cached;

      const q = query(
        collection(db, "projects"),
        where("tenantId", "==", tid),
        where("projectEngineer", "==", uid),
      );
      const querySnapshot = await getDocs(q);
      const projects: Project[] = querySnapshot.docs.map((d) =>
        this.normalize(d.data(), d.id),
      );

      if (projects.length === 0) return [];

      const byProject = await this.fetchMilestonesForProjects(
        projects.map((p) => p.id),
        tid,
      );
      const result = this.applyProgress(projects, byProject);
      setCached(cacheKey, result);
      return result;
    } catch (error) {
      logFirestoreError("Project list", error);
      return [];
    }
  }

  static async getById(projectId: string): Promise<Project | null> {
    requireAuth();
    try {
      if (!projectId) return null;
      const tid = requireTenantId();
      const docRef = doc(db, "projects", projectId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;

      const projectData = this.normalize(docSnap.data(), docSnap.id);

      const milestoneSnaps = await getDocs(
        query(
          collection(db, "projects", projectId, "milestones"),
          where("tenantId", "==", tid),
        ),
      );
      projectData.milestones = milestoneSnaps.docs
        .map((d) => ({ id: d.id, projectId, ...d.data() } as Milestone))
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

      projectData.progress = typeof projectData.actualPercent === "number"
        ? projectData.actualPercent
        : ProjectModel.computeProgress(projectData.milestones);

      return projectData;
    } catch (error) {
      logger.error("ProjectModel Error:", error);
      return null;
    }
  }

  static subscribeToAll(
    onUpdate: (projects: Project[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    const uid = requireAuth();
    const tid = requireTenantId();

    let cancelled = false;
    const latestProjects = new Map<string, Project>();
    const milestonesByProject = new Map<string, Milestone[]>();
    const milestoneUnsubs = new Map<string, () => void>();

    const emit = () => {
      if (cancelled) return;
      const out: Project[] = [];
      for (const project of latestProjects.values()) {
        const milestones = (milestonesByProject.get(project.id) || []).slice().sort(
          (a, b) => (a.sequence || 0) - (b.sequence || 0),
        );
        out.push({
          ...project,
          milestones,
          progress: typeof project.actualPercent === "number"
            ? project.actualPercent
            : ProjectModel.computeProgress(milestones),
        });
      }
      onUpdate(out);
    };

    const attachMilestoneListener = (projectId: string) => {
      const unsub = onSnapshot(
        query(
          collection(db, "projects", projectId, "milestones"),
          where("tenantId", "==", tid),
        ),
        (snap) => {
          if (cancelled) return;
          milestonesByProject.set(
            projectId,
            snap.docs.map(
              (d) => ({ id: d.id, projectId, ...d.data() } as Milestone),
            ),
          );
          emit();
        },
        (err) => {
          logger.error(`subscribeToAll milestones listener error (${projectId}):`, err);
          onError?.(err);
        },
      );
      milestoneUnsubs.set(projectId, unsub);
    };

    const detachMilestoneListener = (projectId: string) => {
      const unsub = milestoneUnsubs.get(projectId);
      if (unsub) unsub();
      milestoneUnsubs.delete(projectId);
      milestonesByProject.delete(projectId);
    };

    const unsubProjects = onSnapshot(
      query(
        collection(db, "projects"),
        where("tenantId", "==", tid),
        where("projectEngineer", "==", uid),
      ),
      (snapshot) => {
        if (cancelled) return;
        try {
          const nextIds = new Set<string>();
          latestProjects.clear();
          for (const d of snapshot.docs) {
            const project = this.normalize(d.data(), d.id);
            latestProjects.set(project.id, project);
            nextIds.add(project.id);
          }
          for (const id of Array.from(milestoneUnsubs.keys())) {
            if (!nextIds.has(id)) detachMilestoneListener(id);
          }
          for (const id of nextIds) {
            if (!milestoneUnsubs.has(id)) attachMilestoneListener(id);
          }
          emit();
        } catch (err) {
          logger.error("subscribeToAll processing error:", err);
          onError?.(err as Error);
        }
      },
      (err) => {
        logFirestoreError("Project list listener", err);
        onError?.(err);
      },
    );

    return () => {
      cancelled = true;
      for (const unsub of milestoneUnsubs.values()) unsub();
      milestoneUnsubs.clear();
      milestonesByProject.clear();
      latestProjects.clear();
      unsubProjects();
    };
  }

  static subscribeToProject(
    projectId: string,
    onUpdate: (project: Project | null) => void,
    onError?: (error: Error) => void,
  ): () => void {
    requireAuth();
    const tid = requireTenantId();

    let latestProject: Project | null = null;
    let latestMilestones: Milestone[] = [];
    let projectLoaded = false;
    let milestonesLoaded = false;

    const emit = () => {
      if (!projectLoaded) return;
      if (!latestProject) {
        onUpdate(null);
        return;
      }
      const sorted = [...latestMilestones].sort(
        (a, b) => (a.sequence || 0) - (b.sequence || 0),
      );
      onUpdate({
        ...latestProject,
        milestones: sorted,
        progress: typeof latestProject.actualPercent === "number"
          ? latestProject.actualPercent
          : ProjectModel.computeProgress(sorted),
      });
    };

    const unsubProject = onSnapshot(
      doc(db, "projects", projectId),
      (snap) => {
        if (!snap.exists()) {
          latestProject = null;
          projectLoaded = true;
          onUpdate(null);
          return;
        }
        latestProject = this.normalize(snap.data(), snap.id);
        projectLoaded = true;
        if (milestonesLoaded) emit();
      },
      (err) => {
        logger.error("subscribeToProject (project doc) error:", err);
        onError?.(err);
      },
    );

    const unsubMilestones = onSnapshot(
      query(
        collection(db, "projects", projectId, "milestones"),
        where("tenantId", "==", tid),
      ),
      (snap) => {
        latestMilestones = snap.docs.map(
          (d) => ({ id: d.id, projectId, ...d.data() } as Milestone),
        );
        milestonesLoaded = true;
        emit();
      },
      (err) => {
        milestonesLoaded = true;
        logger.error("subscribeToProject (milestones) error:", err);
        emit();
        onError?.(err);
      },
    );

    return () => {
      unsubProject();
      unsubMilestones();
    };
  }

  static milestoneRef(projectId: string, milestoneId: string) {
    return doc(db, "projects", projectId, "milestones", milestoneId);
  }

  static deriveStatus(project: Project): string {
    const milestones = project.milestones ?? [];
    const confirmed = milestones.filter((m) => m.confirmed !== false);
    const allDone =
      confirmed.length > 0 &&
      confirmed.every(
        (m) => m.status?.toString().toLowerCase() === "completed",
      );
    if (allDone) return "Completed";
    return project.status ?? "Pending";
  }
}
