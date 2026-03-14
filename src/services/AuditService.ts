import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getCached, setCached } from "../utils/cache";
import type { AuditLog } from "../types";

export class AuditService {
  static async getAll(): Promise<AuditLog[]> {
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
    } catch (error) {
      console.error("Audit Logs Fetch Error:", error);
      return [];
    }
  }
}
