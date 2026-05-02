let _tenantId: string | null = null;

export const setSession = (s: {
  tenantId: string | null;
  role: string | null;
  lguName: string | null;
}): void => {
  _tenantId = s.tenantId;
};

export const clearSession = (): void => {
  _tenantId = null;
};

export const requireTenantId = (): string => {
  if (!_tenantId) {
    throw new Error("Tenant not initialized. Please log out and log in again.");
  }
  return _tenantId;
};
