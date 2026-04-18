import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { AuditTrailService } from "../../services/AuditTrailService";
import type { AuditTrail, UserProfile } from "../../types";
import { AuditTrailView } from "../../views/AuditTrailView";

export function AuditTrailScreen() {
  const navigation = useNavigation();
  const { user, userProfile } = useAuth();
  const [logs, setLogs] = useState<AuditTrail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await AuditTrailService.getAll();
      setLogs(data);
    } catch (error) {
      console.warn("Failed to fetch audit trails", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Mobile audit trail entries are always written by the logged-in PROJ_ENG.
  // The actor cache is keyed by UID and hydrated from users/{uid} — here we
  // use the profile already loaded in AuthContext (no extra Firestore read).
  const actorCache = useMemo<Record<string, UserProfile>>(() => {
    if (!user?.uid || !userProfile) return {};
    return { [user.uid]: userProfile };
  }, [user?.uid, userProfile]);

  return (
    <AuditTrailView
      logs={logs}
      isLoading={isLoading}
      actorCache={actorCache}
      onRefresh={fetchLogs}
      onBack={() => navigation.goBack()}
    />
  );
}
