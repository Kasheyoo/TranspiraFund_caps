import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { auth, db } from "../firebaseConfig";
import { callFn } from "../services/CloudFunctionService";
import type { UserProfile } from "../types";
import { logger } from "../utils/logger";
import { passwordVerifyRateLimiter, validatePassword } from "../utils/security";

export const useProfilePresenter = (
  onBack: () => void,
) => {
  const { userProfile: contextProfile, refreshProfile: refreshContextProfile, lguName } = useAuth();
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
      logger.error("Profile Fetch Error:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyCurrentPassword = async (password: string): Promise<boolean> => {
    if (!password || password.length < 6) return false;

    const rateLimitCheck = await passwordVerifyRateLimiter.check("verify_password");
    if (!rateLimitCheck.allowed) return false;

    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser!.email!,
        password,
      );
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await passwordVerifyRateLimiter.reset("verify_password");
      return true;
    } catch {
      await passwordVerifyRateLimiter.recordAttempt("verify_password");
      return false;
    }
  };

  const onChangePassword = async (
    currentPassword: string,
    newPassword: string,
  ): Promise<boolean> => {
    const validation = validatePassword(newPassword);
    if (!validation.isValid) return false;

    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser!.email!,
        currentPassword,
      );
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPassword);
      callFn("logMobileAuditTrail", {
        action: "Password Changed",
        success: true,
      }).catch(() => {});
      return true;
    } catch {
      return false;
    }
  };

  const uploadProfilePhoto = async (base64: string): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {

      const result = await callFn("uploadProfilePhoto", { base64 }) as {
        success: boolean;
        photoURL: string;
      };
      if (!result.success) return false;
      setUserProfile((prev) => (prev ? { ...prev, photoURL: result.photoURL } : prev));

      await refreshContextProfile();
      return true;
    } catch (error) {
      logger.error("Photo upload error:", error);
      return false;
    }
  };

  const removeProfilePhoto = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      await callFn("uploadProfilePhoto", { base64: "" });
      setUserProfile((prev) => (prev ? { ...prev, photoURL: undefined } : prev));
      await refreshContextProfile();
      return true;
    } catch (error) {
      logger.error("Photo remove error:", error);
      return false;
    }
  };

  return {
    data: { userProfile: userProfile ?? contextProfile, isLoading, lguName },
    actions: {
      goBack: onBack,
      verifyCurrentPassword,
      onChangePassword,
      uploadProfilePhoto,
      removeProfilePhoto,
      refreshProfile,
    },
  };
};
