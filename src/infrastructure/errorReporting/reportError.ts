/**
 * reportError / reportBreadcrumb
 *
 * Single, typed entry point for sending errors and trail-breadcrumbs to the
 * underlying error-reporting backend (Sentry today, Noop in dev/web/tests).
 *
 *   - reportError(err, ctx?)        full Sentry event
 *   - reportBreadcrumb(msg, ctx?)   crumb only (no event quota)
 *
 * Use breadcrumbs for high-frequency, expected-failure paths (per-meal sync,
 * cache fallbacks, intermittent network blips) and full reports for
 * low-frequency critical failures (login, paywall, app boot, AI scan).
 *
 * ── PII / sensitive-data policy ──
 * Never send:
 *   • food images / base64 / data: URIs / file:// URIs
 *   • auth tokens, refresh tokens, JWTs
 *   • passwords, API keys, secrets
 *   • emails (use a hashed_<x> handle if you must distinguish users)
 *   • full request bodies or response bodies for paid endpoints
 *
 * Anything passed via `extra` is scrubbed by `scrubExtra` before it leaves
 * the device. Keys whose name matches the redaction patterns are replaced
 * with "[redacted]"; long string values are truncated.
 */

import { logger } from "../../logging/logger";
import { initErrorReporting } from "./factory";
import type { ErrorContext, ErrorLevel, ErrorReporter } from "./types";

export type ReportArea =
  | "billing"
  | "auth"
  | "scan"
  | "sync"
  | "challenge"
  | "bootstrap"
  | "storage"
  | "dev"
  | "home"
  | "food_log"
  | "food_logging";

export interface ReportContext {
  /** High-level area of the app this error came from. Used as a Sentry tag. */
  area: ReportArea;
  /** Specific action that failed, e.g. "purchasePackage" or "restoreFromSupabase". */
  action: string;
  /** Optional screen / route (e.g. "auth/sign-in"). */
  screen?: string;
  /** Optional user id; never send the email or any PII here. */
  userId?: string;
  /** Optional provider tag (e.g. "revenuecat", "supabase", "openfoodfacts"). */
  provider?: string;
  /** Sentry severity. Defaults to "error" for reportError, "info" for breadcrumb. */
  level?: ErrorLevel;
  /** Free-form structured metadata. Will be PII-scrubbed before sending. */
  extra?: Record<string, unknown>;
}

// ── PII scrubbing ──────────────────────────────────────────────────────────

const REDACTED_KEY_PATTERNS: RegExp[] = [
  /password/i,
  /token/i,
  /authorization/i,
  /api[_-]?key/i,
  /secret/i,
  /cookie/i,
  /session/i,
  /email/i,
  /image[_-]?base64/i,
  /base64/i,
  /\bimage\b/i,
  /image[_-]?uri/i,
  /image[_-]?url/i,
  /photo/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
];

const MAX_STRING_LENGTH = 2_000;
const MAX_DEPTH = 4;

function isProbablySensitiveKey(key: string): boolean {
  return REDACTED_KEY_PATTERNS.some((p) => p.test(key));
}

function scrubValue(value: unknown, depth: number): unknown {
  if (value == null) return value;
  if (depth > MAX_DEPTH) return "[depth-limit]";

  if (typeof value === "string") {
    if (value.startsWith("data:")) return "[redacted-data-uri]";
    if (value.startsWith("file://")) return "[redacted-file-uri]";
    if (value.length > MAX_STRING_LENGTH) {
      return `${value.slice(0, 200)}…[truncated:${value.length}b]`;
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((v) => scrubValue(v, depth + 1));
  }

  if (typeof value === "object") {
    return scrubObject(value as Record<string, unknown>, depth + 1);
  }

  return String(value);
}

function scrubObject(
  obj: Record<string, unknown>,
  depth = 0
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (isProbablySensitiveKey(key)) {
      out[key] = "[redacted]";
      continue;
    }
    out[key] = scrubValue(value, depth);
  }
  return out;
}

/** Exported for unit tests; same function used by reportError + reportBreadcrumb. */
export function scrubExtra(
  extra: Record<string, unknown>
): Record<string, unknown> {
  return scrubObject(extra, 0);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildErrorContext(ctx?: ReportContext): ErrorContext | undefined {
  if (!ctx) return undefined;
  const tags: Record<string, string> = {
    area: ctx.area,
    action: ctx.action,
  };
  if (ctx.screen) tags.screen = ctx.screen;
  if (ctx.provider) tags.provider = ctx.provider;

  const out: ErrorContext = { tags };
  if (ctx.userId) out.user = { id: ctx.userId };
  if (ctx.level) out.level = ctx.level;
  if (ctx.extra) out.extra = scrubExtra(ctx.extra);
  return out;
}

function normaliseError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (typeof error === "string") return new Error(error);
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string") return new Error(maybeMessage);
    try {
      return new Error(JSON.stringify(error));
    } catch {
      return new Error(String(error));
    }
  }
  return new Error(String(error));
}

function getReporter(): ErrorReporter {
  // initErrorReporting is idempotent (singleton). Calling it here means
  // call sites don't have to worry about init ordering / "Not initialized"
  // warnings if they fire before CalCutProviders mounts.
  return initErrorReporting();
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Capture an unexpected error. Sends a full Sentry event.
 * Safe to call from any thread / promise / module-load — it never throws.
 */
export function reportError(error: unknown, context?: ReportContext): void {
  try {
    const reporter = getReporter();
    const err = normaliseError(error);
    const sentryContext = buildErrorContext(context);

    if (__DEV__) {
      logger.warn(
        `[reportError] ${context?.area ?? "?"}/${context?.action ?? "?"}: ${err.message}`
      );
    }

    reporter.captureException(err, sentryContext);
  } catch (innerErr) {
    if (__DEV__) {
      logger.warn("[reportError] failed to capture:", innerErr);
    }
  }
}

/**
 * Drop a structured breadcrumb. Does NOT consume Sentry event quota.
 *
 * Use for high-frequency / expected failures (e.g. per-meal sync retries,
 * intermittent OpenFoodFacts misses) so the timeline of a later real error
 * still has the surrounding context, without flooding the dashboard.
 */
export function reportBreadcrumb(
  message: string,
  context?: ReportContext
): void {
  try {
    const reporter = getReporter();
    const data: Record<string, unknown> = {};
    if (context) {
      data.area = context.area;
      data.action = context.action;
      if (context.screen) data.screen = context.screen;
      if (context.provider) data.provider = context.provider;
      if (context.userId) data.userId = context.userId;
      if (context.extra) Object.assign(data, scrubExtra(context.extra));
    }
    reporter.addBreadcrumb({
      message,
      category: context?.area ?? "general",
      level: context?.level ?? "info",
      data: Object.keys(data).length > 0 ? data : undefined,
    });
  } catch (innerErr) {
    if (__DEV__) {
      logger.warn("[reportBreadcrumb] failed to add crumb:", innerErr);
    }
  }
}
