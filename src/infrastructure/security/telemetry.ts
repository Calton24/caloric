/**
 * Security Telemetry
 *
 * Runtime detection and reporting of suspicious conditions.
 * Reports counts and patterns - NOT raw payloads (privacy-safe).
 *
 * Detects:
 * - Service-role JWT rejection attempts
 * - Repeated 401/403 errors (credential stuffing, token expiry abuse)
 * - Event spam patterns
 * - Rate limit violations
 *
 * @security This module is part of the security hardening initiative.
 * See docs/THREAT-MODEL.md for threat categories this addresses.
 */

import { logger } from "../../logging/logger";
import { analytics } from "../analytics/analytics";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SecurityEventType =
  | "service_role_attempt" // Someone tried to use service_role JWT
  | "repeated_auth_failure" // Multiple 401/403 in short window
  | "rate_limit_hit" // Rate limit triggered
  | "invalid_token_format" // Malformed JWT submitted
  | "suspicious_payload" // Unexpected/malicious payload detected
  | "admin_gate_bypass_attempt" // Attempt to access admin routes in prod
  | "event_spam"; // Same event fired too rapidly

export interface SecurityEvent {
  type: SecurityEventType;
  count: number;
  windowMs: number;
  meta?: Record<string, string | number | boolean>;
}

interface SecurityWindow {
  count: number;
  firstSeen: number;
  lastSeen: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Window duration for counting repeated events
  WINDOW_MS: 60_000, // 1 minute

  // Thresholds before reporting
  AUTH_FAILURE_THRESHOLD: 5, // 5 failures in 1 minute
  EVENT_SPAM_THRESHOLD: 20, // 20 same events in 1 minute
  RATE_LIMIT_THRESHOLD: 3, // 3 rate limits in 1 minute

  // Max events to track (prevent memory bloat from attack)
  MAX_TRACKED_EVENTS: 100,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

const windows = new Map<string, SecurityWindow>();
let reportedThisSession = new Set<string>();

// ─────────────────────────────────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Record a security-relevant event.
 * Tracks counts within sliding windows and reports when thresholds exceeded.
 */
export function recordSecurityEvent(
  type: SecurityEventType,
  meta?: Record<string, string | number | boolean>
): void {
  const now = Date.now();
  const key = `${type}:${JSON.stringify(meta ?? {})}`;

  // Get or create window
  let window = windows.get(key);
  if (!window || now - window.firstSeen > CONFIG.WINDOW_MS) {
    // Window expired or doesn't exist
    window = { count: 0, firstSeen: now, lastSeen: now };
  }

  window.count++;
  window.lastSeen = now;
  windows.set(key, window);

  // Prevent memory bloat from attack patterns
  if (windows.size > CONFIG.MAX_TRACKED_EVENTS) {
    pruneOldWindows(now);
  }

  // Check if threshold exceeded and not yet reported this session
  const threshold = getThreshold(type);
  const reportKey = `${type}:${threshold}`;

  if (window.count >= threshold && !reportedThisSession.has(reportKey)) {
    reportSecurityEvent({
      type,
      count: window.count,
      windowMs: now - window.firstSeen,
      meta,
    });
    reportedThisSession.add(reportKey);
  }
}

/**
 * Report a service_role JWT attempt.
 * This is a critical security event - report immediately.
 */
export function reportServiceRoleAttempt(context?: string): void {
  logger.warn("[Security] service_role JWT detected", { context });
  recordSecurityEvent("service_role_attempt", {
    context: context ?? "unknown",
  });

  // Always report immediately - this is a serious indicator
  analytics.track("security_service_role_attempt", {
    context: context ?? "unknown",
    timestamp: Date.now(),
  });
}

/**
 * Record an auth failure (401/403).
 * Reports when repeated failures indicate credential stuffing or token expiry abuse.
 */
export function recordAuthFailure(statusCode: number, endpoint?: string): void {
  recordSecurityEvent("repeated_auth_failure", {
    statusCode,
    endpoint: endpoint ?? "unknown",
  });
}

/**
 * Record a rate limit hit.
 * Reports when same user/IP hits rate limits repeatedly.
 */
export function recordRateLimitHit(endpoint: string): void {
  recordSecurityEvent("rate_limit_hit", { endpoint });
}

/**
 * Record event spam (same event fired too rapidly).
 */
export function recordEventSpam(eventName: string): void {
  recordSecurityEvent("event_spam", { eventName });
}

/**
 * Record admin gate bypass attempt (accessing admin routes in prod).
 */
export function recordAdminBypassAttempt(route: string): void {
  recordSecurityEvent("admin_gate_bypass_attempt", { route });

  // Always report immediately - this shouldn't happen at all
  logger.error("[Security] Admin gate bypass attempt", { route });
  analytics.track("security_admin_bypass_attempt", {
    route,
    timestamp: Date.now(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT Validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a JWT appears to be a service_role key.
 * Does NOT validate the JWT - only checks for service_role claim pattern.
 *
 * @returns true if JWT contains service_role claim (should be rejected)
 */
export function isServiceRoleJWT(token: string): boolean {
  try {
    // JWTs are base64url encoded: header.payload.signature
    const parts = token.split(".");
    if (parts.length !== 3) return false;

    // Decode payload (second part) using atob (available in RN via hermes)
    // Convert base64url to base64 first
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64));

    // Check for service_role in common claim locations
    return (
      payload.role === "service_role" ||
      payload.aud === "service_role" ||
      payload.sub?.includes("service_role")
    );
  } catch {
    // Invalid JWT format - record but don't flag as service_role
    recordSecurityEvent("invalid_token_format");
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getThreshold(type: SecurityEventType): number {
  switch (type) {
    case "service_role_attempt":
    case "admin_gate_bypass_attempt":
      return 1; // Report immediately
    case "repeated_auth_failure":
      return CONFIG.AUTH_FAILURE_THRESHOLD;
    case "event_spam":
      return CONFIG.EVENT_SPAM_THRESHOLD;
    case "rate_limit_hit":
      return CONFIG.RATE_LIMIT_THRESHOLD;
    default:
      return 5;
  }
}

function reportSecurityEvent(event: SecurityEvent): void {
  // Log for debugging (redacted in production)
  logger.warn("[Security] Threshold exceeded", {
    type: event.type,
    count: event.count,
    windowMs: event.windowMs,
  });

  // Report to analytics (counts only, no PII)
  analytics.track("security_threshold_exceeded", {
    type: event.type,
    count: event.count,
    windowMs: event.windowMs,
    // DO NOT include meta - may contain sensitive data
  });
}

function pruneOldWindows(now: number): void {
  const expiredKeys: string[] = [];
  for (const [key, window] of windows) {
    if (now - window.lastSeen > CONFIG.WINDOW_MS * 2) {
      expiredKeys.push(key);
    }
  }
  for (const key of expiredKeys) {
    windows.delete(key);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset (for testing)
// ─────────────────────────────────────────────────────────────────────────────

/** @internal For testing only */
export function _resetForTesting(): void {
  windows.clear();
  reportedThisSession.clear();
}
