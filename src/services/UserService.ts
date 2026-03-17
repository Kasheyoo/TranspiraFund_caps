import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../firebaseConfig";
import type { UserProfile } from "../types";
import { logger } from "../utils/logger";

export class UserService {
  static async getUserProfile(): Promise<UserProfile | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return { ...(docSnap.data() as UserProfile) };
      }
      return null;
    } catch (error) {
      logger.error("Error fetching profile:", error);
      return null;
    }
  }

  static listenToUserProfile(onUpdate: (profile: UserProfile) => void): () => void {
    const user = auth.currentUser;
    if (!user) return () => {};
    const docRef = doc(db, "users", user.uid);
    return onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) onUpdate(docSnap.data() as UserProfile);
    });
  }

  static async changeUserPassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) throw new Error("No user logged in.");
    const credential = EmailAuthProvider.credential(user.email!, currentPassword);
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  }
}
