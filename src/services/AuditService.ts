import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { requireAuth } from "../utils/authGuard";
import { getCached, setCached } from "../utils/cache";
import { logger } from "../utils/logger";
import type { AuditLog } from "../types";

export class AuditService {
  static async getAll(): Promise<AuditLog[]> {
    requireAuth();

    const cached = getCached<AuditLog[]>("audit_logs");
    if (cached) return cached;

    try {
      const logsRef = collection(db, "audit_logs");
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(10));
      const querySnapshot = await getDocs(q);
      const results: AuditLog[] = querySnapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as AuditLog[];
      setCached("audit_logs", results);
      return results;
    } catch (error: any) {
      if (error?.code === "permission-denied") {
        logger.warn("AuditLogs: insufficient Firestore permissions. Update security rules.");
      } else {
        logger.error("Audit Logs Fetch Error:", error);
      }
      return [];
    }
  }
}
