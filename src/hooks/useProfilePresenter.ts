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

    const rateLimitCheck = passwordVerifyRateLimiter.check("verify_password");
    if (!rateLimitCheck.allowed) return false;

    try {
      const credential = EmailAuthProvider.credential(
        auth.currentUser!.email!,
        password,
      );
      await reauthenticateWithCredential(auth.currentUser!, credential);
      passwordVerifyRateLimiter.reset("verify_password");
      return true;
    } catch {
      passwordVerifyRateLimiter.recordAttempt("verify_password");
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
      return true;
    } catch {
      return false;
    }
  };

  const uploadProfilePhoto = async (base64: string): Promise<boolean> => {
    if (!auth.currentUser) return false;
    try {
      // RN's fetch() can't read local file:// / content:// URIs on Android,
      // so client-side Firebase Storage uploads aren't viable here. The
      // uploadProfilePhoto callable (mobile-only, asia-southeast1) takes
      // base64, uploads server-side via Admin SDK, and writes the same
      // users/{uid}.photoURL field the web's updateProfilePhoto writes —
      // so web realtime listeners pick it up with no contract drift.
      const result = await callFn("uploadProfilePhoto", { base64 }) as {
        success: boolean;
        photoURL: string;
      };
      if (!result.success) return false;
      setUserProfile((prev) => (prev ? { ...prev, photoURL: result.photoURL } : prev));
      // Refresh AuthContext so every other screen (dashboard, audit trail, etc.)
      // that reads userProfile from context picks up the new photo immediately.
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
