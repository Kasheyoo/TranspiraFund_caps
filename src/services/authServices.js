import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
} from "firebase/auth";
import { auth } from "../firebaseConfig";

// --- LOGIN ---
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    return { success: true, user: userCredential.user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// --- LOGOUT ---
export const logoutUser = async () => {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// --- CHANGE PASSWORD ---
export const changePassword = async (newPassword) => {
  try {
    const user = auth.currentUser;
    if (user) {
      await updatePassword(user, newPassword);
      return { success: true };
    } else {
      return { success: false, error: "No user logged in" };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// --- FORGOT PASSWORD (✅ NEW) ---
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
