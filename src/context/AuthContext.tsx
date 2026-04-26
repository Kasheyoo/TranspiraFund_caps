import { onIdTokenChanged, signOut, type User } from "firebase/auth";
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
import type { Tenant, UserProfile } from "../types";
import { SESSION_TIMEOUT_MS, SESSION_WARNING_MS } from "../utils/security";
import {
  clearSession as clearTenantSession,
  setSession as setTenantSession,
} from "../utils/tenant";

interface AuthContextValue {
  user: User | null | undefined;
  userProfile: UserProfile | null;
  isFirstTimeUser: boolean;
  isOTPVerified: boolean;
  setIsOTPVerified: (verified: boolean) => void;
  refreshProfile: () => Promise<void>;
  // Multi-tenant claim-derived fields. Populated after onIdTokenChanged
  // fires with a valid PROJ_ENG account; cleared on logout or misconfig.
  tenantId: string | null;
  role: string | null;
  lguName: string | null;
  claimsLoaded: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  userProfile: null,
  isFirstTimeUser: false,
  isOTPVerified: false,
  setIsOTPVerified: () => {},
  refreshProfile: async () => {},
  tenantId: null,
  role: null,
  lguName: null,
  claimsLoaded: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOTPVerified, setIsOTPVerified] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [lguName, setLguName] = useState<string | null>(null);
  const [claimsLoaded, setClaimsLoaded] = useState(false);

  // Distinguishes app-reopen (persisted session) vs fresh login
  const isInitialAuthCheckRef = useRef(true);
  // Tracks last processed uid so token-refresh fires (same uid) don't
  // refetch the profile or refire validation alerts.
  const lastProcessedUidRef = useRef<string | null>(null);
  // Dedupe the misconfig alert across the forced-signout fire-back.
  const misconfigAlertShownRef = useRef(false);

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
    // onIdTokenChanged fires on sign-in, sign-out, AND token refresh —
    // so claims are re-read whenever the token rotates, not just on login.
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (isInitialAuthCheckRef.current) {
        isInitialAuthCheckRef.current = false;
        // App just opened — always require fresh login.
        // Sign out any persisted session so user starts at landing page.
        if (firebaseUser) {
          await signOut(auth);
          return; // listener will fire again with null
        }
      }

      // Logout path — wipe every piece of derived state in one place
      if (!firebaseUser) {
        setIsOTPVerified(false);
        setUser(null);
        setUserProfile(null);
        setTenantId(null);
        setRole(null);
        setLguName(null);
        setClaimsLoaded(false);
        clearTenantSession();
        lastProcessedUidRef.current = null;
        misconfigAlertShownRef.current = false;
        return;
      }

      // Read custom claims. force=false uses the in-memory token, which is
      // already fresh because onIdTokenChanged just fired.
      let claimRole: string | undefined;
      let claimTenantId: string | undefined;
      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        claimRole = tokenResult.claims.role as string | undefined;
        claimTenantId = tokenResult.claims.tenantId as string | undefined;
      } catch {
        // Treat as misconfig — fall through to the validation gate below.
      }

      // Hard gate: mobile app is PROJ_ENG only, and tenantId is required.
      // Anything else means the account is misprovisioned and the user
      // needs MIS to fix it before they can use the app.
      const isValid = claimRole === "PROJ_ENG" && !!claimTenantId;
      if (!isValid) {
        if (!misconfigAlertShownRef.current) {
          misconfigAlertShownRef.current = true;
          Alert.alert(
            "Account Misconfigured",
            "Your account is missing required setup. Please contact your MIS administrator.",
          );
        }
        await signOut(auth);
        return; // listener will fire again with null and reset state
      }

      const uid = firebaseUser.uid;
      const isNewSession = uid !== lastProcessedUidRef.current;
      lastProcessedUidRef.current = uid;

      // Push session into the module-level cache so models/services can
      // call requireTenantId() without threading it through every signature.
      setTenantSession({
        tenantId: claimTenantId!,
        role: claimRole!,
        lguName: null, // filled in below
      });

      setUser(firebaseUser);
      setTenantId(claimTenantId!);
      setRole(claimRole!);
      setClaimsLoaded(true);

      // Profile and tenant doc only need to be fetched once per session;
      // token refreshes for the same uid skip the round trips.
      if (isNewSession) {
        try {
          const snap = await getDoc(doc(db, "users", uid));
          setUserProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        } catch {
          setUserProfile(null);
        }

        try {
          const tenantSnap = await getDoc(doc(db, "tenants", claimTenantId!));
          if (tenantSnap.exists()) {
            const tenantData = tenantSnap.data() as Tenant;
            const name = tenantData.lguName ?? null;
            setLguName(name);
            setTenantSession({
              tenantId: claimTenantId!,
              role: claimRole!,
              lguName: name,
            });
          }
        } catch {
          // lguName stays null; UI hides the row when null.
        }
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
        tenantId,
        role,
        lguName,
        claimsLoaded,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
