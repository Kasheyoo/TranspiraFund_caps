import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { auth } from "../firebaseConfig";

type AuthResult<T = undefined> =
  | (T extends undefined ? { success: true } : { success: true; user: T })
  | { success: false; error: string };

export const loginUser = async (
  email: string,
  password: string,
): Promise<{ success: true; user: User } | { success: false; error: string }> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

export const logoutUser = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

export const changePassword = async (
  newPassword: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const user = auth.currentUser;
    if (user) {
      await updatePassword(user, newPassword);
      return { success: true };
    } else {
      return { success: false, error: "No user logged in" };
    }
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};

export const resetPassword = async (
  email: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
};
