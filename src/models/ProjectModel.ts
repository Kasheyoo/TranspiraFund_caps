import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { requireAuth } from "../utils/authGuard";
import { getCached, setCached } from "../utils/cache";
import { logger } from "../utils/logger";
import type { Milestone, Project } from "../types";

export class ProjectModel {
  // ── Field normalizer ─────────────────────────────────────────────
  // Maps canonical web-app field names to the display aliases the
  // mobile views use.  Both sets of fields end up on the Project object
  // so views that reference either name continue to work.
  private static normalize(raw: Record<string, unknown>, id: string): Project {
    const r = raw as Project;
    return {
      id,
      ...r,
      // Display aliases derived from canonical names (fall back to old names)
      title:          r.projectName      ?? r.title,
      engineer:       r.projectEngineer  ?? r.engineer,
      startDate:      r.officialDateStarted  ?? r.startDate,
      completionDate: r.originalDateCompletion ?? r.completionDate,
      location: r.barangay
        ? r.sitioStreet
          ? `${r.sitioStreet}, ${r.barangay}`
          : r.barangay
        : r.location,
      // budget alias for displays that show currency
      budget: r.contractAmount ?? r.budget,
    };
  }

  // ── Milestone subcollection helper ───────────────────────────────
  private static async fetchMilestonesForProjects(
    projectIds: string[],
  ): Promise<Record<string, Milestone[]>> {
    const byProject: Record<string, Milestone[]> = {};
    await Promise.all(
      projectIds.map(async (projectId) => {
        try {
          const snaps = await getDocs(
            collection(db, "projects", projectId, "milestones"),
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

  // ── One-time fetches ─────────────────────────────────────────────

  static async getAll(): Promise<Project[]> {
    requireAuth();
    try {
      const cached = getCached<Project[]>("projects_all");
      if (cached) return cached;

      const querySnapshot = await getDocs(collection(db, "projects"));
      const projects: Project[] = querySnapshot.docs.map((d) =>
        this.normalize(d.data(), d.id),
      );

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

      const projectData = this.normalize(docSnap.data(), docSnap.id);

      const milestoneSnaps = await getDocs(
        collection(db, "projects", projectId, "milestones"),
      );
      projectData.milestones = milestoneSnaps.docs
        .map((d) => ({ id: d.id, projectId, ...d.data() } as Milestone))
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

  // ── Real-time subscriptions ──────────────────────────────────────

  static subscribeToAll(
    onUpdate: (projects: Project[]) => void,
    onError?: (error: Error) => void,
  ): () => void {
    requireAuth();

    return onSnapshot(
      collection(db, "projects"),
      async (snapshot) => {
        try {
          const projects: Project[] = snapshot.docs.map((d) =>
            this.normalize(d.data(), d.id),
          );

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
          const projectData = this.normalize(snap.data(), snap.id);

          const milestoneSnaps = await getDocs(
            collection(db, "projects", projectId, "milestones"),
          );
          projectData.milestones = milestoneSnaps.docs
            .map((d) => ({ id: d.id, projectId, ...d.data() } as Milestone))
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

  // ── Milestone ref helper (use this when writing proofs) ──────────
  static milestoneRef(projectId: string, milestoneId: string) {
    return doc(db, "projects", projectId, "milestones", milestoneId);
  }
}
