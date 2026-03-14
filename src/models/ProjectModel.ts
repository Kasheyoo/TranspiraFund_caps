import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getCached, setCached } from "../utils/cache";
import type { Milestone, Project } from "../types";

export class ProjectModel {
  static async getAll(): Promise<Project[]> {
    try {
      const cached = getCached<Project[]>("projects_all");
      if (cached) return cached;

      const querySnapshot = await getDocs(collection(db, "projects"));
      const projects: Project[] = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Project[];

      if (projects.length === 0) return [];

      const BATCH_SIZE = 30;
      const projectIds = projects.map((p) => p.id);
      const allMilestones: Milestone[] = [];

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

      const result = projects.map((project) => {
        const milestones = byProject[project.id] || [];
        const completed = milestones.filter(
          (m) => m.status?.toString().toLowerCase() === "completed",
        ).length;
        project.progress =
          milestones.length > 0
            ? Math.round((completed / milestones.length) * 100)
            : 0;
        return project;
      });

      setCached("projects_all", result);
      return result;
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
  }

  static async getById(projectId: string): Promise<Project | null> {
    try {
      if (!projectId) return null;
      const docRef = doc(db, "projects", projectId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;
      const projectData: Project = { id: docSnap.id, ...docSnap.data() } as Project;

      const mRef = collection(db, "milestones");
      const q = query(mRef, where("projectId", "==", projectId));
      const milestoneSnaps = await getDocs(q);

      projectData.milestones = milestoneSnaps.docs.map(
        (d) => ({ id: d.id, ...d.data() } as Milestone),
      );

      projectData.milestones.sort(
        (a, b) => (a.sequence || 0) - (b.sequence || 0),
      );
      return projectData;
    } catch (error) {
      console.error("ProjectModel Error:", error);
      return null;
    }
  }
}
