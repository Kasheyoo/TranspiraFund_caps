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
      return {
        ...project,
        milestones,
        progress: ProjectModel.computeProgress(milestones),
      };
    });
  }

  // AI-generated milestones carry a weightPercentage; sum the completed
  // weights for true work-effort progress. Legacy milestones (no weights)
  // fall back to count-based progress so old data still renders sensibly.
  private static computeProgress(milestones: Milestone[]): number {
    if (milestones.length === 0) return 0;
    const hasWeights = milestones.some(
      (m) => typeof m.weightPercentage === "number" && m.weightPercentage > 0,
    );
    if (hasWeights) {
      const completedWeight = milestones
        .filter((m) => m.status?.toString().toLowerCase() === "completed")
        .reduce((sum, m) => sum + (m.weightPercentage || 0), 0);
      return Math.min(100, Math.round(completedWeight));
    }
    const completed = milestones.filter(
      (m) => m.status?.toString().toLowerCase() === "completed",
    ).length;
    return Math.round((completed / milestones.length) * 100);
  }

  // ── One-time fetches ─────────────────────────────────────────────

  static async getAll(): Promise<Project[]> {
    const uid = requireAuth();
    try {
      const cached = getCached<Project[]>("projects_all");
      if (cached) return cached;

      const q = query(collection(db, "projects"), where("projectEngineer", "==", uid));
      const querySnapshot = await getDocs(q);
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

      projectData.progress = ProjectModel.computeProgress(projectData.milestones);

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
    const uid = requireAuth();

    return onSnapshot(
      query(collection(db, "projects"), where("projectEngineer", "==", uid)),
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

  // Two parallel listeners — project doc + milestone subcollection — combined
  // into a single onUpdate stream. Subcollection writes (e.g. generateMilestones
  // batch-writing milestone docs) don't touch the parent doc, so a project-doc-
  // only listener silently misses them and the UI stays stale.
  static subscribeToProject(
    projectId: string,
    onUpdate: (project: Project | null) => void,
    onError?: (error: Error) => void,
  ): () => void {
    requireAuth();

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
        progress: ProjectModel.computeProgress(sorted),
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
      collection(db, "projects", projectId, "milestones"),
      (snap) => {
        latestMilestones = snap.docs.map(
          (d) => ({ id: d.id, projectId, ...d.data() } as Milestone),
        );
        milestonesLoaded = true;
        emit();
      },
      (err) => {
        logger.error("subscribeToProject (milestones) error:", err);
        onError?.(err);
      },
    );

    return () => {
      unsubProject();
      unsubMilestones();
    };
  }

  // ── Milestone ref helper (use this when writing proofs) ──────────
  static milestoneRef(projectId: string, milestoneId: string) {
    return doc(db, "projects", projectId, "milestones", milestoneId);
  }
}
