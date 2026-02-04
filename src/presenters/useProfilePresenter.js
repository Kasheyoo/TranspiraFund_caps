import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";

export const useProfilePresenter = (onBack, onLogout) => {
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    // Safety check: ensure user is logged in
    if (!auth.currentUser) return;

    setIsLoading(true);
    try {
      const docRef = doc(db, "users", auth.currentUser.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("User Data Found:", docSnap.data()); // Check your console!
        setUserProfile(docSnap.data());
      } else {
        console.warn(
          "No Firestore document found for UID:",
          auth.currentUser.uid,
        );
      }
    } catch (error) {
      console.error("Profile Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const verifyCurrentPassword = async (password) => {
    if (!password || password.length < 6) return false;
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        password,
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      return true;
    } catch (error) {
      return false;
    }
  };

  const onChangePassword = async (currentPassword, newPassword) => {
    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword,
      );
      await reauthenticateWithCredential(auth.currentUser, credential);
      await updatePassword(auth.currentUser, newPassword);
      return true;
    } catch (error) {
      return false;
    }
  };

  return {
    data: { userProfile, isLoading },
    actions: {
      goBack: onBack,
      onLogout: onLogout,
      verifyCurrentPassword,
      onChangePassword,
      refreshProfile: fetchProfile, // View uses this to trigger update
    },
  };
};
