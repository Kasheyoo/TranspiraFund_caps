import { auth } from "../firebaseConfig";

export const requireAuth = (): string => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Authentication required. Please log in.");
  }
  return user.uid;
};
