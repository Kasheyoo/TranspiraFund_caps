import { collection, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { requireAuth } from "../utils/authGuard";
import { getCached, setCached } from "../utils/cache";
import { logFirestoreError } from "../utils/permissionError";
import { requireTenantId } from "../utils/tenant";
import type { AuditTrail } from "../types";

export class AuditTrailService {
  static async getAll(): Promise<AuditTrail[]> {
    requireAuth();
    const tid = requireTenantId();

    const cacheKey = `auditTrails_mobile:${tid}`;
    const cached = getCached<AuditTrail[]>(cacheKey);
    if (cached) return cached;

    try {
      // Reads from the shared hierarchical audit trail — mobile scope
      const logsRef = collection(db, "auditTrails", "mobile", "entries");
      const q = query(
        logsRef,
        where("tenantId", "==", tid),
        orderBy("createdAt", "desc"),
        limit(10),
      );
      const querySnapshot = await getDocs(q);
      const results: AuditTrail[] = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AuditTrail[];
      setCached(cacheKey, results);
      return results;
    } catch (error) {
      logFirestoreError("Audit Trails", error);
      return [];
    }
  }
}
