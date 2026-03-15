import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Alert, AppState } from "react-native";
import { auth, db } from "../firebaseConfig";
import type { UserProfile } from "../types";
import { SESSION_TIMEOUT_MS, SESSION_WARNING_MS } from "../utils/security";

interface AuthContextValue {
  user: User | null | undefined;
  userProfile: UserProfile | null;
  isFirstTimeUser: boolean;
  isOTPVerified: boolean;
  setIsOTPVerified: (verified: boolean) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  userProfile: null,
  isFirstTimeUser: false,
  isOTPVerified: false,
  setIsOTPVerified: () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOTPVerified, setIsOTPVerified] = useState(false);

  // Distinguishes app-reopen (persisted session) vs fresh login
  const isInitialAuthCheckRef = useRef(true);

  const lastActivityRef = useRef<number>(Date.now());
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningShownRef = useRef(false);

  // Web app sets mustChangePassword: true on account creation
  const isFirstTimeUser = userProfile?.mustChangePassword === true;

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      setUserProfile(snap.exists() ? (snap.data() as UserProfile) : null);
    } catch {
      // Keep existing profile on error
    }
  }, []);

  // Session timeout monitoring
  useEffect(() => {
    if (!user) {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
      return;
    }

    resetActivity();

    sessionTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= SESSION_TIMEOUT_MS) {
        signOut(auth);
        Alert.alert(
          "Session Expired",
          "You have been logged out due to inactivity.",
        );
      } else if (elapsed >= SESSION_WARNING_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        Alert.alert(
          "Session Warning",
          "Your session will expire in 5 minutes due to inactivity.",
          [{ text: "Continue", onPress: resetActivity }],
        );
      }
    }, 30_000);

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [user, resetActivity]);

  // Track app foreground activity
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") resetActivity();
    });
    return () => subscription.remove();
  }, [resetActivity]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (isInitialAuthCheckRef.current) {
        isInitialAuthCheckRef.current = false;
        // App just opened — always require fresh login.
        // Sign out any persisted session so user starts at landing page.
        if (firebaseUser) {
          await signOut(auth);
          return; // onAuthStateChanged will fire again with null
        }
      }

      // On logout → reset OTP gate so next login requires verification
      if (!firebaseUser) setIsOTPVerified(false);

      setUser(firebaseUser ?? null);

      if (firebaseUser) {
        try {
          const snap = await getDoc(doc(db, "users", firebaseUser.uid));
          setUserProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isFirstTimeUser,
        isOTPVerified,
        setIsOTPVerified,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
