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
import type { Milestone, Project } from "../types";

export class ProjectModel {
  // ── Shared helpers ───────────────────────────────────────────────────────────

  private static async fetchMilestonesForProjects(
    projectIds: string[],
  ): Promise<Record<string, Milestone[]>> {
    const allMilestones: Milestone[] = [];
    const BATCH_SIZE = 30;
    for (let i = 0; i < projectIds.length; i += BATCH_SIZE) {
      const batch = projectIds.slice(i, i + BATCH_SIZE);
      const q = query(
        collection(db, "milestones"),
        where("projectId", "in", batch),
      );
      const snaps = await getDocs(q);
      snaps.docs.forEach((d) =>
        allMilestones.push({ id: d.id, ...d.data() } as Milestone),
      );
    }
    const byProject: Record<string, Milestone[]> = {};
    allMilestones.forEach((m) => {
      if (!byProject[m.projectId]) byProject[m.projectId] = [];
      byProject[m.projectId].push(m);
    });
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
      const completed = milestones.filter(
        (m) => m.status?.toString().toLowerCase() === "completed",
      ).length;
      return {
        ...project,
        milestones,
        progress:
          milestones.length > 0
            ? Math.round((completed / milestones.length) * 100)
            : 0,
      };
    });
  }

  // ── One-time fetches (used by dashboard + legacy callers) ────────────────────

  static async getAll(): Promise<Project[]> {
    requireAuth();
    try {
      const cached = getCached<Project[]>("projects_all");
      if (cached) return cached;

      const querySnapshot = await getDocs(collection(db, "projects"));
      const projects: Project[] = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Project[];

      if (projects.length === 0) return [];

      const byProject = await this.fetchMilestonesForProjects(
        projects.map((p) => p.id),
      );
      const result = this.applyProgress(projects, byProject);
      setCached("projects_all", result);
      return result;
    } catch (error) {
      logger.error("Error fetching projects:", error);
      return [];
    }
  }

  static async getById(projectId: string): Promise<Project | null> {
    requireAuth();
    try {
      if (!projectId) return null;
      const docRef = doc(db, "projects", projectId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;

      const projectData: Project = {
        id: docSnap.id,
        ...docSnap.data(),
      } as Project;

      const mq = query(
        collection(db, "milestones"),
        where("projectId", "==", projectId),
      );
      const milestoneSnaps = await getDocs(mq);
      projectData.milestones = milestoneSnaps.docs
        .map((d) => ({ id: d.id, ...d.data() } as Milestone))
        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

      const completed = projectData.milestones.filter(
        (m) => m.status?.toString().toLowerCase() === "completed",
      ).length;
      projectData.progress =
        projectData.milestones.length > 0
          ? Math.round((completed / projectData.milestones.length) * 100)
          : 0;

      return projectData;
    } catch (error) {
      logger.error("ProjectModel Error:", error);
      return null;
    }
  }

  // ── Real-time subscriptions ──────────────────────────────────────────────────

  /**
   * Real-time listener on ALL projects.
   * Any change made from the web app (assign, update status, etc.) pushes instantly.
   * Returns an unsubscribe function — call on component unmount.
   */
  static subscribeToAll(
    onUpdate: (projects: Project[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    requireAuth();

    return onSnapshot(
      collection(db, "projects"),
      async (snapshot) => {
        try {
          const projects: Project[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Project[];

          if (projects.length === 0) {
            onUpdate([]);
            return;
          }

          const byProject = await this.fetchMilestonesForProjects(
            projects.map((p) => p.id),
          );
          onUpdate(this.applyProgress(projects, byProject));
        } catch (err) {
          logger.error("subscribeToAll processing error:", err);
          onError?.(err as Error);
        }
      },
      (err) => {
        logger.error("subscribeToAll error:", err);
        onError?.(err);
      },
    );
  }

  /**
   * Real-time listener on a single project + its milestones.
   * Returns an unsubscribe function — call on component unmount.
   */
  static subscribeToProject(
    projectId: string,
    onUpdate: (project: Project | null) => void,
    onError?: (error: Error) => void,
  ): () => void {
    requireAuth();

    return onSnapshot(
      doc(db, "projects", projectId),
      async (snap) => {
        if (!snap.exists()) {
          onUpdate(null);
          return;
        }
        try {
          const projectData: Project = {
            id: snap.id,
            ...snap.data(),
          } as Project;

          const mq = query(
            collection(db, "milestones"),
            where("projectId", "==", projectId),
          );
          const milestoneSnaps = await getDocs(mq);
          projectData.milestones = milestoneSnaps.docs
            .map((d) => ({ id: d.id, ...d.data() } as Milestone))
            .sort((a, b) => (a.sequence || 0) - (b.sequence || 0));

          const completed = projectData.milestones.filter(
            (m) => m.status?.toString().toLowerCase() === "completed",
          ).length;
          projectData.progress =
            projectData.milestones.length > 0
              ? Math.round((completed / projectData.milestones.length) * 100)
              : 0;

          onUpdate(projectData);
        } catch (err) {
          logger.error("subscribeToProject processing error:", err);
          onError?.(err as Error);
        }
      },
      (err) => {
        logger.error("subscribeToProject error:", err);
        onError?.(err);
      },
    );
  }
}
