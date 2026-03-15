/**
 * TranspiraFund Security Utilities
 * Frontend security hardening for cybersecurity standards compliance.
 */

// --- Input Sanitization ---

/** Strip control characters, trim whitespace, and limit input length */
export const sanitizeInput = (text: string, maxLength = 256): string => {
  if (!text || typeof text !== "string") return "";
  // Remove control characters (except newline/tab for multiline fields)
  const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return cleaned.trim().slice(0, maxLength);
};

// --- Email Validation ---

/** Strict email validation - RFC 5322 simplified */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
};

// --- Password Strength ---

export interface PasswordValidation {
  isValid: boolean;
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

/** Validate password meets security requirements */
export const validatePassword = (password: string): PasswordValidation => {
  const minLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password);

  return {
    isValid: minLength && hasUppercase && hasLowercase && hasNumber && hasSpecialChar,
    minLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
  };
};

// --- Rate Limiter ---

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const rateLimitStore: Record<string, RateLimitEntry> = {};

export class RateLimiter {
  private maxAttempts: number;
  private windowMs: number;
  private lockoutMs: number;

  constructor(maxAttempts = 5, windowMs = 60_000, lockoutMs = 60_000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.lockoutMs = lockoutMs;
  }

  /** Check if action is allowed. Returns { allowed, remainingAttempts, lockoutSeconds } */
  check(key: string): { allowed: boolean; remainingAttempts: number; lockoutSeconds: number } {
    const now = Date.now();
    const entry = rateLimitStore[key];

    if (!entry) {
      return { allowed: true, remainingAttempts: this.maxAttempts, lockoutSeconds: 0 };
    }

    // Check if locked out
    if (entry.lockedUntil && now < entry.lockedUntil) {
      const lockoutSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return { allowed: false, remainingAttempts: 0, lockoutSeconds };
    }

    // Reset if window has passed
    if (now - entry.firstAttempt > this.windowMs) {
      delete rateLimitStore[key];
      return { allowed: true, remainingAttempts: this.maxAttempts, lockoutSeconds: 0 };
    }

    const remaining = this.maxAttempts - entry.attempts;
    return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining), lockoutSeconds: 0 };
  }

  /** Record an attempt. Call after a failed action. */
  recordAttempt(key: string): void {
    const now = Date.now();
    const entry = rateLimitStore[key];

    if (!entry || now - entry.firstAttempt > this.windowMs) {
      rateLimitStore[key] = { attempts: 1, firstAttempt: now, lockedUntil: null };
      return;
    }

    entry.attempts++;
    if (entry.attempts >= this.maxAttempts) {
      entry.lockedUntil = now + this.lockoutMs;
    }
  }

  /** Reset rate limit for a key (e.g., after successful login) */
  reset(key: string): void {
    delete rateLimitStore[key];
  }
}

// --- Firebase Error Sanitizer ---

/** Map Firebase auth error codes to safe user-facing messages */
export const sanitizeFirebaseError = (errorCode?: string): string => {
  switch (errorCode) {
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/user-disabled":
      return "This account has been disabled. Contact your administrator.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password. Please try again.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your internet connection.";
    case "auth/email-already-in-use":
      return "This email is already associated with an account.";
    case "auth/weak-password":
      return "Password does not meet security requirements.";
    case "auth/requires-recent-login":
      return "Please log in again to perform this action.";
    default:
      return "Authentication failed. Please try again.";
  }
};

// --- Session Timeout ---

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
export const SESSION_WARNING_MS = 25 * 60 * 1000; // 25 minutes (5 min before timeout)

// Singleton login rate limiter
export const loginRateLimiter = new RateLimiter(5, 60_000, 60_000);

// Singleton reset password rate limiter
export const resetRateLimiter = new RateLimiter(3, 5 * 60_000, 5 * 60_000);

// Singleton password verification rate limiter
export const passwordVerifyRateLimiter = new RateLimiter(5, 60_000, 120_000);
