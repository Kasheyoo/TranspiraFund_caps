import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { AuditTrailService } from "../../services/AuditTrailService";
import type { AuditTrail } from "../../types";
import { AuditTrailView } from "../../views/AuditTrailView";

export function AuditTrailScreen() {
  const navigation = useNavigation();
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

  return (
    <AuditTrailView
      logs={logs}
      isLoading={isLoading}
      onRefresh={fetchLogs}
      onBack={() => navigation.goBack()}
    />
  );
}
