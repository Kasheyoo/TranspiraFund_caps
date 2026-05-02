import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { AuditTrailService } from "../../services/AuditTrailService";
import type { AuditTrail, UserProfile } from "../../types";
import { logger } from "../../utils/logger";
import { AuditTrailView } from "../../views/AuditTrailView";

export function AuditTrailScreen() {
  const navigation = useNavigation();
  const { user, userProfile, claimsLoaded, tenantId } = useAuth();
  const [logs, setLogs] = useState<AuditTrail[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!claimsLoaded || !tenantId) return;

    setIsLoading(true);
    const unsubscribe = AuditTrailService.subscribe(
      (data) => {
        setLogs(data);
        setIsLoading(false);
      },
      () => setIsLoading(false),
    );
    return unsubscribe;
  }, [claimsLoaded, tenantId]);

  const onRefresh = useCallback(async () => {
    if (!claimsLoaded || !tenantId) return;
    setIsLoading(true);
    try {
      const data = await AuditTrailService.getAll();
      setLogs(data);
    } catch (error) {
      logger.warn("Failed to fetch audit trails", error);
    } finally {
      setIsLoading(false);
    }
  }, [claimsLoaded, tenantId]);

  const actorCache = useMemo<Record<string, UserProfile>>(() => {
    if (!user?.uid || !userProfile) return {};
    return { [user.uid]: userProfile };
  }, [user?.uid, userProfile]);

  return (
    <AuditTrailView
      logs={logs}
      isLoading={isLoading}
      actorCache={actorCache}
      onRefresh={onRefresh}
      onBack={() => navigation.goBack()}
    />
  );
}
