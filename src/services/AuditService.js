import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "../firebaseConfig";

export class AuditService {
  static async getAll() {
    try {
      // ✅ Matches your Firestore collection name
      const logsRef = collection(db, "audit_logs");
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(10));
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Audit Logs Fetch Error:", error);
      return [];
    }
  }
}
