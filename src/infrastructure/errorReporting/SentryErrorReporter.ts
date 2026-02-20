/**
 * Error Reporting - Sentry Implementation
 * Only imports Sentry SDK - isolated from rest of app
 */

import * as Sentry from "@sentry/react-native";
import { Platform } from "react-native";
import {
    Breadcrumb,
    ErrorContext,
    ErrorLevel,
    ErrorReporter,
    ErrorReporterConfig,
    User,
} from "./types";

/**
 * Sentry-based error reporter
 * Only this file imports @sentry/react-native
 */
export class SentryErrorReporter implements ErrorReporter {
  private enabled = false;

  init(config: ErrorReporterConfig): void {
    if (!config.dsn) {
      console.warn(
        "[SentryErrorReporter] No DSN provided - error reporting disabled"
      );
      return;
    }

    // Check if enabled
    const isDev = __DEV__;
    const enableInDev = config.enableInDevelopment ?? false;

    if (isDev && !enableInDev) {
      console.log(
        "[SentryErrorReporter] Disabled in development (set EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV=true to enable)"
      );
      return;
    }

    try {
      Sentry.init({
        dsn: config.dsn,
        environment:
          config.environment || (isDev ? "development" : "production"),
        debug: config.debug ?? isDev,
        enableAutoSessionTracking: true,
        enableNative: true,
        enableNativeCrashHandling: true,
        enableNativeNagger: false,
        tracesSampleRate: isDev ? 1.0 : 0.2,
        attachStacktrace: true,
        autoInitializeNativeSdk: true,
        enableAutoPerformanceTracing: true,
        integrations: [
          Sentry.mobileReplayIntegration({
            maskAllText: true,
            maskAllImages: true,
            maskAllVectors: true,
          }),
        ],
        beforeSend: config.beforeSend
          ? (event, hint) => {
              // Call custom filter with error object
              const error = hint.originalException as Error;
              const shouldSend = config.beforeSend!(error, event.contexts);
              return shouldSend ? event : null;
            }
          : undefined,
      });

      // Set platform tag
      Sentry.setTag("platform", Platform.OS);
      Sentry.setTag("platform.version", Platform.Version.toString());

      this.enabled = true;
      console.log(
        `[SentryErrorReporter] Initialized (env: ${config.environment || "production"})`
      );
    } catch (error) {
      console.error("[SentryErrorReporter] Initialization failed:", error);
    }
  }

  captureException(error: Error, context?: ErrorContext): void {
    if (!this.enabled) return;

    try {
      Sentry.captureException(error, {
        contexts: context,
      });
    } catch (err) {
      console.error("[SentryErrorReporter] Failed to capture exception:", err);
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
        level: level as Sentry.SeverityLevel,
        contexts: context,
      });
    } catch (err) {
      console.error("[SentryErrorReporter] Failed to capture message:", err);
    }
  }

  setUser(user: User | null): void {
    if (!this.enabled) return;

    try {
      Sentry.setUser(user);
    } catch (err) {
      console.error("[SentryErrorReporter] Failed to set user:", err);
    }
  }

  setTag(key: string, value: string): void {
    if (!this.enabled) return;

    try {
      Sentry.setTag(key, value);
    } catch (err) {
      console.error("[SentryErrorReporter] Failed to set tag:", err);
    }
  }

  addBreadcrumb(breadcrumb: Breadcrumb): void {
    if (!this.enabled) return;

    try {
      Sentry.addBreadcrumb({
        message: breadcrumb.message,
        category: breadcrumb.category,
        level: breadcrumb.level as Sentry.SeverityLevel,
        data: breadcrumb.data,
        timestamp: breadcrumb.timestamp,
      });
    } catch (err) {
      console.error("[SentryErrorReporter] Failed to add breadcrumb:", err);
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
