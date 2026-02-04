import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export const NotificationService = {
  // Fetch all notifications ordered by timestamp
  getAll: async () => {
    try {
      const q = query(
        collection(db, "notification"),
        orderBy("timestamp", "desc"),
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching notifications:", error);
      throw error;
    }
  },

  // ✅ FIX: Define and export the markAsRead function
  markAsRead: async (notificationId) => {
    try {
      // Reference the specific document in the 'notification' collection
      const docRef = doc(db, "notification", notificationId);

      // ✅ Update the 'status' field to "Read"
      await updateDoc(docRef, {
        status: "Read",
      });

      return true;
    } catch (error) {
      console.error("Error updating notification status:", error);
      throw error;
    }
  },
};
