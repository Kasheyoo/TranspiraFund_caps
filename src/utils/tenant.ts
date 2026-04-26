/**
 * Tenant session - module-level cache of the signed-in user's tenant claims.
 *
 * Mirrors the requireAuth() pattern in authGuard.ts so models and services
 * can read tenantId without having to thread it through every call site.
 * AuthContext is the only writer; it calls setSession() after parsing
 * custom claims and clearSession() on logout.
 */

let _tenantId: string | null = null;
let _role: string | null = null;
let _lguName: string | null = null;

export const setSession = (s: {
  tenantId: string | null;
  role: string | null;
  lguName: string | null;
}): void => {
  _tenantId = s.tenantId;
  _role = s.role;
  _lguName = s.lguName;
};

export const clearSession = (): void => {
  _tenantId = null;
  _role = null;
  _lguName = null;
};

export const getTenantId = (): string | null => _tenantId;

export const getRole = (): string | null => _role;

export const getLguName = (): string | null => _lguName;

/** Throws if tenantId is missing. Use in models/services where the caller
 *  has already passed the AuthContext gate; surface as a logout-prompt. */
export const requireTenantId = (): string => {
  if (!_tenantId) {
    throw new Error("Tenant not initialized. Please log out and log in again.");
  }
  return _tenantId;
};
