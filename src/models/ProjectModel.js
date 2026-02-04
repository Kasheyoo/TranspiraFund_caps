import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export class ProjectModel {
  static async getAll() {
    try {
      const querySnapshot = await getDocs(collection(db, "projects"));
      const projects = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // ✅ SYNC LOGIC: Calculate real-time progress for the list view
      const projectsWithSyncData = await Promise.all(
        projects.map(async (project) => {
          const mRef = collection(db, "milestones");
          const q = query(mRef, where("projectId", "==", project.id));
          const milestoneSnaps = await getDocs(q);

          const milestones = milestoneSnaps.docs.map((d) => d.data());

          if (milestones.length > 0) {
            const completed = milestones.filter(
              (m) => m.status?.toString().toLowerCase() === "completed",
            ).length;
            // Overwrite the static progress with calculated progress
            project.progress = Math.round(
              (completed / milestones.length) * 100,
            );
          } else {
            project.progress = 0;
          }
          return project;
        }),
      );

      return projectsWithSyncData;
    } catch (error) {
      console.error("Error fetching projects:", error);
      return [];
    }
  }

  static async getById(projectId) {
    try {
      if (!projectId) return null;
      const docRef = doc(db, "projects", projectId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) return null;
      const projectData = { id: docSnap.id, ...docSnap.data() };

      const mRef = collection(db, "milestones");
      const q = query(mRef, where("projectId", "==", projectId));
      const milestoneSnaps = await getDocs(q);

      projectData.milestones = milestoneSnaps.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

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
