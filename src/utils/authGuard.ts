/**
 * Auth Guard - Ensures authenticated access to Firestore operations
 */
import { auth } from "../firebaseConfig";

/** Throws if no user is currently authenticated */
export const requireAuth = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Authentication required. Please log in.");
  }
  return user.uid;
};

/** Returns current user's UID or null (non-throwing) */
export const getCurrentUserId = (): string | null => {
  return auth.currentUser?.uid ?? null;
};
