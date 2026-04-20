import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import { logger } from "../utils/logger";
import type { AppNotification } from "../types";

export const NotificationService = {
  subscribe(
    onUpdate: (notifs: AppNotification[]) => void,
    onError?: (err: Error) => void,
  ): () => void {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      onError?.(new Error("Not signed in"));
      return () => {};
    }
    const q = query(
      collection(db, "notifications"),
      where("recipientUid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(50),
    );
    return onSnapshot(
      q,
      (snap) =>
        onUpdate(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AppNotification),
        ),
      (err) => {
        logger.error("[Notifications] subscribe error:", err);
        onError?.(err);
      },
    );
  },

  async markAsRead(notificationId: string): Promise<void> {
    await updateDoc(doc(db, "notifications", notificationId), { isRead: true });
  },

  async dismiss(notificationId: string): Promise<void> {
    await updateDoc(doc(db, "notifications", notificationId), {
      dismissedAt: serverTimestamp(),
    });
  },
};
