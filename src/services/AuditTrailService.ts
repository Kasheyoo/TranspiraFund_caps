import {
  collection,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { requireAuth } from "../utils/authGuard";
import { logFirestoreError } from "../utils/permissionError";
import { requireTenantId } from "../utils/tenant";
import type { AuditTrail } from "../types";

export class AuditTrailService {
  static subscribe(
    onUpdate: (logs: AuditTrail[]) => void,
    onError?: (err: Error) => void,
  ): () => void {
    requireAuth();
    const tid = requireTenantId();

    const q = query(
      collection(db, "auditTrails", "mobile", "entries"),
      where("tenantId", "==", tid),
      orderBy("createdAt", "desc"),
      limit(10),
    );
    return onSnapshot(
      q,
      (snap) =>
        onUpdate(
          snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AuditTrail),
        ),
      (err) => {
        logFirestoreError("Audit Trails subscribe", err);
        onError?.(err);
      },
    );
  }

  static async getAll(): Promise<AuditTrail[]> {
    requireAuth();
    const tid = requireTenantId();

    try {
      const logsRef = collection(db, "auditTrails", "mobile", "entries");
      const q = query(
        logsRef,
        where("tenantId", "==", tid),
        orderBy("createdAt", "desc"),
        limit(10),
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AuditTrail[];
    } catch (error) {
      logFirestoreError("Audit Trails", error);
      return [];
    }
  }
}
