import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { requireAuth } from "../utils/authGuard";
import { getCached, setCached } from "../utils/cache";
import { logger } from "../utils/logger";
import type { AuditTrail } from "../types";

export class AuditTrailService {
  static async getAll(): Promise<AuditTrail[]> {
    requireAuth();

    // const cached = getCached<AuditTrail[]>("projEngAuditTrails");
    // if (cached) return cached;

    try {
      const logsRef = collection(db, "projEngAuditTrails");
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      const results: AuditTrail[] = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AuditTrail[];
      setCached("projEngAuditTrails", results);
      return results;
    } catch (error: any) {
      if (error?.code === "permission-denied") {
        logger.warn("Audit Trails: insufficient Firestore permissions. Update security rules.");
      } else {
        logger.error("Audit Trails Fetch Error:", error);
      }
      return [];
    }
  }
}
