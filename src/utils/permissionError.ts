import { logger } from "./logger";

function isPermissionDenied(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "permission-denied"
  );
}

export function logFirestoreError(label: string, err: unknown): void {
  if (isPermissionDenied(err)) {
    logger.warn(
      `${label}: insufficient Firestore permissions. Check tenantId filter or rules.`,
    );
  } else {
    logger.error(`${label}:`, err);
  }
}
