import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { requireAuth } from "../utils/authGuard";
import { getCached, invalidateCache, setCached } from "../utils/cache";
import { logger } from "../utils/logger";
import type { AppNotification } from "../types";

export const NotificationService = {
  getAll: async (): Promise<AppNotification[]> => {
    requireAuth();
    const cached = getCached<AppNotification[]>("notifications_all", 2 * 60 * 1000);
    if (cached) return cached;

    try {
      const q = query(
        collection(db, "notification"),
        orderBy("timestamp", "desc"),
      );
      const querySnapshot = await getDocs(q);
      const results: AppNotification[] = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AppNotification[];
      setCached("notifications_all", results);
      return results;
    } catch (error: any) {
      if (error?.code === "permission-denied") {
        // Expected during auth flow — user may not have completed login yet
      } else {
        logger.error("Error fetching notifications:", error);
      }
      return [];
    }
  },

  markAsRead: async (notificationId: string): Promise<boolean> => {
    requireAuth();
    try {
      const docRef = doc(db, "notification", notificationId);
      await updateDoc(docRef, { status: "Read" });
      invalidateCache("notifications_all");
      return true;
    } catch (error: any) {
      if (error?.code !== "permission-denied") {
        logger.error("Error updating notification status:", error);
      }
      return false;
    }
  },
};
