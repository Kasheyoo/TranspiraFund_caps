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

  // Project list with live progress. The outer listener watches the engineer's
  // projects; for each project we attach a milestones subcollection listener
  // so status flips (Pending -> Completed) push a re-emit with fresh progress.
  // A single getDocs on milestones would freeze the list after first paint,
  // which is the bug we had before: details screen ticked to 100% but the
  // list card stayed at the initial %.
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
          progress: ProjectModel.computeProgress(milestones),
        });
      }
      onUpdate(out);
    };

    const attachMilestoneListener = (projectId: string) => {
      const unsub = onSnapshot(
        collection(db, "projects", projectId, "milestones"),
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
          // Detach listeners for projects no longer in scope
          for (const id of Array.from(milestoneUnsubs.keys())) {
            if (!nextIds.has(id)) detachMilestoneListener(id);
          }
          // Attach listeners for newly-scoped projects
          for (const id of nextIds) {
            if (!milestoneUnsubs.has(id)) attachMilestoneListener(id);
          }
          // Emit right away so the list paints even before every milestones
          // stream has delivered its first snapshot
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

  // Treat a project as "Completed" as soon as every confirmed milestone is
  // completed, even if the stored `project.status` hasn't been flipped yet by
  // the web-side trigger. Keeps dashboard counts + list filters in lock-step
  // with what the engineer actually sees on the milestone cards.
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
