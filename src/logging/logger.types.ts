/**
 * Logger Types
 * Core logging interface - implementation-agnostic
 */

export interface Logger {
  /**
   * Log informational message
   */
  log(message: string, meta?: any): void;

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void;

  /**
   * Log error message
   */
  error(message: string, meta?: any): void;
}

// ── Redaction ─────────────────────────────────────────────────────────

/** Fields whose values are always fully replaced with "[REDACTED]" */
const REDACTED_FIELDS = new Set([
  "password",
  "token",
  "accessToken",
  "access_token",
  "refreshToken",
  "refresh_token",
  "secret",
  "apiKey",
  "api_key",
  "authorization",
  "cookie",
  "sessionToken",
  "session_token",
  "creditCard",
  "credit_card",
  "ssn",
  "privateKey",
  "private_key",
]);

/** Regex patterns applied to *string values* (replace matched portion) */
const VALUE_PATTERNS: { pattern: RegExp; replacement: string }[] = [
  // JWTs — three base64url segments separated by dots
  {
    pattern: /eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    replacement: "[JWT_REDACTED]",
  },

  // Bearer tokens in inline strings
  {
    pattern: /Bearer\s+[A-Za-z0-9._~+/=-]+/gi,
    replacement: "Bearer [REDACTED]",
  },

  // Stripe secret / restricted keys
  {
    pattern: /\b[sr]k_(live|test)_[A-Za-z0-9]{10,}/g,
    replacement: "[STRIPE_KEY_REDACTED]",
  },

  // Generic long hex/base64 secrets (≥40 chars contiguous)
  {
    pattern: /\b[A-Za-z0-9+/]{40,}={0,2}\b/g,
    replacement: "[LONG_SECRET_REDACTED]",
  },

  // Email addresses — redact to preserve domain only
  {
    pattern: /[a-zA-Z0-9._%+-]+@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    replacement: "[EMAIL]@$1",
  },
];

/**
 * Deep-clone an object and redact sensitive fields/values.
 * Safe to call with any input — returns primitives unchanged.
 */
export function redactSensitive(input: unknown, depth = 0): unknown {
  // Prevent infinite recursion on circular structures
  if (depth > 8) return "[MAX_DEPTH]";

  if (input === null || input === undefined) return input;

  // Redact strings in-place
  if (typeof input === "string") {
    let s = input;
    for (const { pattern, replacement } of VALUE_PATTERNS) {
      // Reset lastIndex for global regexes
      pattern.lastIndex = 0;
      s = s.replace(pattern, replacement);
    }
    return s;
  }

  if (typeof input !== "object") return input;

  // Arrays
  if (Array.isArray(input)) {
    return input.map((item) => redactSensitive(item, depth + 1));
  }

  // Plain objects
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (REDACTED_FIELDS.has(key)) {
      out[key] = "[REDACTED]";
    } else {
      out[key] = redactSensitive(value, depth + 1);
    }
  }
  return out;
}

/**
 * Console logger - safe default
 * All meta passed through redactSensitive before output.
 */
export class ConsoleLogger implements Logger {
  log(message: string, meta?: any): void {
    if (meta !== undefined) {
      console.log(message, redactSensitive(meta));
    } else {
      console.log(message);
    }
  }

  warn(message: string, meta?: any): void {
    if (meta !== undefined) {
      console.warn(message, redactSensitive(meta));
    } else {
      console.warn(message);
    }
  }

  error(message: string, meta?: any): void {
    if (meta !== undefined) {
      console.error(message, redactSensitive(meta));
    } else {
      console.error(message);
    }
  }
}
