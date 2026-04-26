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
import { logFirestoreError } from "../utils/permissionError";
import { requireTenantId } from "../utils/tenant";
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
    const tid = requireTenantId();
    const q = query(
      collection(db, "notifications"),
      where("tenantId", "==", tid),
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
        logFirestoreError("Notifications subscribe", err);
        onError?.(err);
      },
    );
  },

  async markAsRead(notificationId: string): Promise<void> {
    const tid = requireTenantId();
    await updateDoc(doc(db, "notifications", notificationId), {
      isRead: true,
      tenantId: tid,
    });
  },

  async dismiss(notificationId: string): Promise<void> {
    const tid = requireTenantId();
    await updateDoc(doc(db, "notifications", notificationId), {
      dismissedAt: serverTimestamp(),
      tenantId: tid,
    });
  },
};
