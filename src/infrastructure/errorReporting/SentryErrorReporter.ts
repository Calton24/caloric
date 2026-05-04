/**
 * Error Reporting - Sentry Implementation
 *
 * IMPORTANT: This reporter does NOT call `Sentry.init`. The SDK is initialized
 * exactly once at module-load time in `app/_layout.tsx` (see RootLayout). This
 * file is a thin wrapper that forwards captureException / setTag / breadcrumbs
 * to the already-initialized SDK. Having two init paths leads to dropped events,
 * mismatched DSNs, and double-loaded native crash handlers.
 *
 * Uses dynamic require to avoid bundler crashes when @sentry/react-native is
 * not installed (e.g. local dev without the dependency).
 */

import { Platform } from "react-native";
import { logger } from "../../logging/logger";
import {
    Breadcrumb,
    ErrorContext,
    ErrorLevel,
    ErrorReporter,
    ErrorReporterConfig,
    User,
} from "./types";

let Sentry: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require("@sentry/react-native");
} catch {
  Sentry = null;
}

/**
 * Sentry-based error reporter. Gracefully degrades to noop if SDK is missing
 * OR if `app/_layout.tsx` decided not to enable Sentry (e.g. no DSN).
 */
export class SentryErrorReporter implements ErrorReporter {
  private enabled = false;

  init(config: ErrorReporterConfig): void {
    if (!Sentry) {
      logger.warn(
        "[SentryErrorReporter] @sentry/react-native not installed - error reporting disabled"
      );
      return;
    }

    if (!config.dsn) {
      logger.warn(
        "[SentryErrorReporter] No DSN provided - error reporting disabled"
      );
      return;
    }

    // Sentry.init is owned by app/_layout.tsx. Here we only mark the wrapper
    // as enabled and attach platform tags. Tags set via Sentry.setTag are
    // applied to the existing scope, so this is safe even if Sentry.init has
    // already run.
    try {
      Sentry.setTag?.("platform", Platform.OS);
      const platformVersion =
        Platform.Version != null ? String(Platform.Version) : "unknown";
      Sentry.setTag?.("platform.version", platformVersion);
      this.enabled = true;
      logger.log(
        `[SentryErrorReporter] Wired up (env: ${config.environment || "production"})`
      );
    } catch (error) {
      logger.error("[SentryErrorReporter] Wire-up failed:", error);
    }
  }

  captureException(error: Error, context?: ErrorContext): void {
    if (!this.enabled) return;

    try {
      // Recognise our richer ReportContext-shaped fields (tags / user / level
      // / extra / contexts) and hoist them onto the scope. Otherwise fall
      // back to the legacy `{ contexts: <ctx> }` shape used by the existing
      // ErrorBoundary call sites so we don't break their payloads.
      if (context && hasScopeFields(context)) {
        Sentry.withScope((scope: any) => {
          if (context.tags) {
            for (const [k, v] of Object.entries(context.tags)) {
              if (v == null) continue;
              scope.setTag?.(k, String(v));
            }
          }
          if (context.user) scope.setUser?.(context.user);
          if (context.level) scope.setLevel?.(context.level);
          if (context.extra) {
            for (const [k, v] of Object.entries(context.extra)) {
              scope.setExtra?.(k, v);
            }
          }
          if (context.contexts) {
            for (const [k, v] of Object.entries(context.contexts)) {
              scope.setContext?.(k, v as any);
            }
          }
          Sentry.captureException(error);
        });
      } else {
        Sentry.captureException(error, {
          contexts: context,
        });
      }
    } catch (err) {
      logger.error("[SentryErrorReporter] Failed to capture exception:", err);
    }
  }

  captureMessage(
    message: string,
    level: ErrorLevel = "info",
    context?: ErrorContext
  ): void {
    if (!this.enabled) return;

    try {
      Sentry.captureMessage(message, {
        level: level as any,
        contexts: context,
      });
    } catch (err) {
      logger.error("[SentryErrorReporter] Failed to capture message:", err);
    }
  }

  setUser(user: User | null): void {
    if (!this.enabled) return;

    try {
      Sentry.setUser(user);
    } catch (err) {
      logger.error("[SentryErrorReporter] Failed to set user:", err);
    }
  }

  setTag(key: string, value: string): void {
    if (!this.enabled) return;

    try {
      Sentry.setTag(key, value);
    } catch (err) {
      logger.error("[SentryErrorReporter] Failed to set tag:", err);
    }
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!this.enabled) return;

    try {
      Sentry.addBreadcrumb({
        message: breadcrumb.message,
        category: breadcrumb.category,
        level: breadcrumb.level as any,
        data: breadcrumb.data,
        timestamp: breadcrumb.timestamp,
      });
    } catch (err) {
      logger.error("[SentryErrorReporter] Failed to add breadcrumb:", err);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  static isSdkAvailable(): boolean {
    return Sentry !== null;
  }
}

function hasScopeFields(context: ErrorContext): boolean {
  return (
    context.tags != null ||
    context.user != null ||
    context.level != null ||
    context.extra != null ||
    context.contexts != null
  );
}
