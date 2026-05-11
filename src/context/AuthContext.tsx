import { onIdTokenChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { SecurityNoticeOverlay } from "../components/SecurityNoticeOverlay";
import { auth, db } from "../firebaseConfig";
import { callFn } from "../services/CloudFunctionService";
import type { Tenant, UserProfile } from "../types";
import { SESSION_TIMEOUT_MS, SESSION_WARNING_MS } from "../utils/security";
import {
  clearSession as clearTenantSession,
  setSession as setTenantSession,
} from "../utils/tenant";

type SecurityNotice =
  | {
      kind: "session-expired";
    }
  | {
      kind: "session-warning";
    }
  | {
      kind: "misconfigured";
    };

const SESSION_WARNING_COUNTDOWN_SEC = Math.max(
  1,
  Math.round((SESSION_TIMEOUT_MS - SESSION_WARNING_MS) / 1000),
);

interface AuthContextValue {
  user: User | null | undefined;
  userProfile: UserProfile | null;
  isFirstTimeUser: boolean;
  isOTPVerified: boolean;
  setIsOTPVerified: (verified: boolean) => void;
  refreshProfile: () => Promise<void>;

  tenantId: string | null;
  role: string | null;
  lguName: string | null;
  claimsLoaded: boolean;

  resetActivity: () => void;
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
  resetActivity: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOTPVerified, setIsOTPVerified] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [lguName, setLguName] = useState<string | null>(null);
  const [claimsLoaded, setClaimsLoaded] = useState(false);
  const [notice, setNotice] = useState<SecurityNotice | null>(null);

  const isInitialAuthCheckRef = useRef(true);

  const lastProcessedUidRef = useRef<string | null>(null);

  const misconfigAlertShownRef = useRef(false);

  const lastActivityRef = useRef<number>(Date.now());
  const sessionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningShownRef = useRef(false);

  const profileUnsubRef = useRef<(() => void) | null>(null);
  const tenantUnsubRef = useRef<(() => void) | null>(null);
  const detachLiveDocs = useCallback(() => {
    profileUnsubRef.current?.();
    profileUnsubRef.current = null;
    tenantUnsubRef.current?.();
    tenantUnsubRef.current = null;
  }, []);

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

    }
  }, []);

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

        callFn("logMobileAuditTrail", {
          action: "Session Expired (Idle)",
          success: false,
        }).catch(() => {});
        signOut(auth);
        setNotice({ kind: "session-expired" });
      } else if (elapsed >= SESSION_WARNING_MS && !warningShownRef.current) {
        warningShownRef.current = true;
        setNotice({ kind: "session-warning" });
      }
    }, 30_000);

    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
        sessionTimerRef.current = null;
      }
    };
  }, [user, resetActivity]);

  useEffect(() => {

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      if (isInitialAuthCheckRef.current) {
        isInitialAuthCheckRef.current = false;

        if (firebaseUser) {
          await signOut(auth);
          return;
        }
      }

      if (!firebaseUser) {
        detachLiveDocs();
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

      let claimRole: string | undefined;
      let claimTenantId: string | undefined;
      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        claimRole = tokenResult.claims.role as string | undefined;
        claimTenantId = tokenResult.claims.tenantId as string | undefined;
      } catch {

      }

      const isValid = claimRole === "PROJ_ENG" && !!claimTenantId;
      if (!isValid) {
        if (!misconfigAlertShownRef.current) {
          misconfigAlertShownRef.current = true;
          setNotice({ kind: "misconfigured" });

          callFn("logMobileAuditTrail", {
            action: "Login Blocked - Misconfigured",
            success: false,
            details: {
              role: claimRole ?? null,
              hasTenantId: !!claimTenantId,
            },
          }).catch(() => {});
        }
        await signOut(auth);
        return;
      }

      const uid = firebaseUser.uid;
      const isNewSession = uid !== lastProcessedUidRef.current;
      lastProcessedUidRef.current = uid;

      setTenantSession({
        tenantId: claimTenantId!,
        role: claimRole!,
        lguName: null,
      });

      setUser(firebaseUser);
      setTenantId(claimTenantId!);
      setRole(claimRole!);
      setClaimsLoaded(true);

      if (isNewSession) {
        detachLiveDocs();

        profileUnsubRef.current = onSnapshot(
          doc(db, "users", uid),
          (snap) => {
            setUserProfile(snap.exists() ? (snap.data() as UserProfile) : null);
          },
          () => {

          },
        );

        tenantUnsubRef.current = onSnapshot(
          doc(db, "tenants", claimTenantId!),
          (tenantSnap) => {
            if (!tenantSnap.exists()) return;
            const tenantData = tenantSnap.data() as Tenant;
            const name = tenantData.lguName ?? null;
            setLguName(name);
            setTenantSession({
              tenantId: claimTenantId!,
              role: claimRole!,
              lguName: name,
            });
          },
          () => {

          },
        );
      }
    });
    return () => {
      detachLiveDocs();
      unsubscribe();
    };
  }, [detachLiveDocs]);

  const dismissNotice = useCallback(() => setNotice(null), []);

  const handleSessionWarningContinue = useCallback(() => {
    resetActivity();
    setNotice(null);
  }, [resetActivity]);

  const handleSessionWarningSignOut = useCallback(() => {
    setNotice(null);
    signOut(auth);
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
        resetActivity,
      }}
    >
      {children}

      <SecurityNoticeOverlay
        visible={notice?.kind === "session-expired"}
        severity="critical"
        title="Session Expired"
        message="You have been signed out due to inactivity. Sign in again to continue."
        primaryLabel="Sign in again"
        onPrimary={dismissNotice}
      />

      <SecurityNoticeOverlay
        visible={notice?.kind === "session-warning"}
        severity="warning"
        title="Session Warning"
        message="Your session will expire soon due to inactivity. Tap Continue to stay signed in."
        countdownSeconds={SESSION_WARNING_COUNTDOWN_SEC}
        onCountdownExpire={handleSessionWarningSignOut}
        primaryLabel="Continue"
        onPrimary={handleSessionWarningContinue}
        secondaryLabel="Sign out now"
        onSecondary={handleSessionWarningSignOut}
      />

      <SecurityNoticeOverlay
        visible={notice?.kind === "misconfigured"}
        severity="critical"
        title="Account Misconfigured"
        message="Your account is missing required setup. Please contact your MIS administrator."
        primaryLabel="OK"
        onPrimary={dismissNotice}
      />
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
