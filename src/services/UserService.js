import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword,
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";

export class UserService {
  // ✅ 1. GET PROFILE (Required for Dashboard Name)
  static async getUserProfile() {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      // Fetches the document from 'users' collection using the User ID
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (error) {
      console.error("Error fetching profile:", error);
      return null;
    }
  }

  // 2. Listen to Profile (Realtime updates)
  static listenToUserProfile(onUpdate) {
    const user = auth.currentUser;
    if (!user) return () => {};
    const docRef = doc(db, "users", user.uid);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) onUpdate({ id: docSnap.id, ...docSnap.data() });
    });
  }

  // 3. Change Password
  static async changeUserPassword(currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in.");
    const credential = EmailAuthProvider.credential(
      user.email,
      currentPassword,
    );
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }
}
