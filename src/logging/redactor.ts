/**
 * Sensitive Data Redaction Utility
 *
 * Provides pattern-based redaction for logs containing:
 * - JWT tokens
 * - Authorization headers
 * - API keys (Stripe, AWS, generic)
 * - Supabase URLs
 * - URL query parameters with tokens/keys
 *
 * Usage:
 *   console.log(redactSensitive(`Token: ${jwtToken}`))
 */

/**
 * Redacts sensitive data from text using pattern matching
 */
export function redactSensitive(text: string): string {
  if (!text || typeof text !== "string") return text;

  // Redact JWT tokens (ey* strings with base64url format)
  text = text.replace(
    /ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
    "[JWT_REDACTED]"
  );

  // Redact Authorization Bearer tokens
  text = text.replace(
    /Authorization\s*:\s*Bearer\s+[^\s,\)]+/gi,
    "Authorization: Bearer [TOKEN_REDACTED]"
  );

  // Redact Stripe API keys (test and live)
  text = text.replace(
    /(?:sk|pk)(?:_test|_live)_[A-Za-z0-9_-]{20,}/g,
    "[STRIPE_KEY_REDACTED]"
  );

  // Redact AWS secret keys
  text = text.replace(/AKIA[0-9A-Z]{16}/g, "[AWS_KEY_REDACTED]");

  // Redact Supabase URLs with potential keys
  text = text.replace(
    /https:\/\/[a-z0-9]+\.supabase\.co\/rest\/v\d+\/[^\s\)]+/gi,
    "[SUPABASE_URL_REDACTED]"
  );

  // Redact URL query parameters containing tokens/keys/secrets
  text = text.replace(
    /([?&](?:token|access_token|refresh_token|key|apikey|api_key|secret|code|session_id|auth)=)[^\s&"')]+/gi,
    "$1[QUERY_TOKEN_REDACTED]"
  );

  // Redact generic API key patterns
  text = text.replace(
    /(?:api[_-]?key|apikey|access[_-]?token)\s*[=:]\s*[^\s,\)]+/gi,
    (match) => {
      const prefix = match.split(/[=:]/)[0];
      return `${prefix}=[KEY_REDACTED]`;
    }
  );

  return text;
}

/**
 * Redacts sensitive fields from objects for logging
 * Useful for logging entire objects safely
 */
export function redactObjectSensitiveFields(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  const redacted = { ...obj };

  // List of field names that might contain sensitive data
  const sensitiveFields = [
    "token",
    "accessToken",
    "access_token",
    "refreshToken",
    "refresh_token",
    "apiKey",
    "api_key",
    "secret",
    "password",
    "authorization",
  ];

  for (const field of sensitiveFields) {
    if (field in redacted && redacted[field]) {
      if (typeof redacted[field] === "string") {
        redacted[field] = redactSensitive(redacted[field]);
      }
    }
  }

  return redacted;
}
