import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../firebaseConfig";
import type { UserProfile } from "../types";

export const useProfilePresenter = (
  onBack: () => void,
  onLogout: () => void,
) => {
  const { userProfile: contextProfile } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(contextProfile);
  const [isLoading, setIsLoading] = useState(false);

  const refreshProfile = useCallback(async () => {
    if (!auth.currentUser) return;
    setIsLoading(true);
    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setUserProfile(docSnap.data() as UserProfile);
    } catch (error) {
      console.error("Profile Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyCurrentPassword = async (password: string): Promise<boolean> => {
    if (!password || password.length < 6) return false;
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser!.email!,
        password,
      );
      await reauthenticateWithCredential(auth.currentUser!, credential);
      return true;
    } catch {
      return false;
    }
  };

  const onChangePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> => {
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser!.email!,
        currentPassword,
      );
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPassword);
      return true;
    } catch {
      return false;
    }
  };

  return {
    data: { userProfile: userProfile ?? contextProfile, isLoading },
    actions: {
      goBack: onBack,
      onLogout,
      verifyCurrentPassword,
      onChangePassword,
      refreshProfile,
    },
  };
};
