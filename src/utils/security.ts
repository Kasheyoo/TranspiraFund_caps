export const sanitizeInput = (text: string, maxLength = 256): string => {
  if (!text || typeof text !== "string") return "";
  const cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
  return cleaned.trim().slice(0, maxLength);
};

export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
  return emailRegex.test(trimmed);
};

export interface PasswordValidation {
  isValid: boolean;
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

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

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const rateLimitStore: Record<string, RateLimitEntry> = {};

class RateLimiter {
  private maxAttempts: number;
  private windowMs: number;
  private lockoutMs: number;

  constructor(maxAttempts = 5, windowMs = 60_000, lockoutMs = 60_000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.lockoutMs = lockoutMs;
  }

  check(key: string): { allowed: boolean; remainingAttempts: number; lockoutSeconds: number } {
    const now = Date.now();
    const entry = rateLimitStore[key];

    if (!entry) {
      return { allowed: true, remainingAttempts: this.maxAttempts, lockoutSeconds: 0 };
    }

    if (entry.lockedUntil && now < entry.lockedUntil) {
      const lockoutSeconds = Math.ceil((entry.lockedUntil - now) / 1000);
      return { allowed: false, remainingAttempts: 0, lockoutSeconds };
    }

    if (now - entry.firstAttempt > this.windowMs) {
      delete rateLimitStore[key];
      return { allowed: true, remainingAttempts: this.maxAttempts, lockoutSeconds: 0 };
    }

    const remaining = this.maxAttempts - entry.attempts;
    return { allowed: remaining > 0, remainingAttempts: Math.max(0, remaining), lockoutSeconds: 0 };
  }

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

  reset(key: string): void {
    delete rateLimitStore[key];
  }
}

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

export const sanitizeOTPError = (
  error: unknown,
  context: "send" | "verify",
): string => {
  const msg = error instanceof Error ? error.message.toLowerCase() : "";

  if (msg.includes("too many") || msg.includes("rate limit") || msg.includes("resource-exhausted"))
    return "Too many attempts. Please wait before trying again.";
  if (msg.includes("expired"))
    return "Code has expired. Please request a new code.";
  if (msg.includes("invalid") || msg.includes("incorrect"))
    return "Invalid code. Please check and try again.";
  if (msg.includes("not authenticated") || msg.includes("unauthenticated"))
    return "Session expired. Please log in again.";
  if (msg.includes("network") || msg.includes("fetch"))
    return "Network error. Check your internet connection.";

  return context === "send"
    ? "Unable to send verification code. Please try again."
    : "Verification failed. Please try again.";
};

export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
export const SESSION_WARNING_MS = 25 * 60 * 1000;

export const loginRateLimiter = new RateLimiter(5, 60_000, 60_000);
export const passwordVerifyRateLimiter = new RateLimiter(5, 60_000, 120_000);
