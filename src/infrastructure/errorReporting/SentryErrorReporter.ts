/**
 * Error Reporting - Sentry Implementation
 * Uses dynamic require to avoid bundler crashes when @sentry/react-native is not installed
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

/**
 * Dynamically load Sentry SDK
 * Returns null if SDK is not installed (e.g., in forks that don't need Sentry)
 */
let Sentry: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Sentry = require("@sentry/react-native");
} catch {
  // SDK not installed - this is fine, we'll behave like Noop
  Sentry = null;
}

/**
 * Sentry-based error reporter
 * Gracefully degrades to noop if SDK is not installed
 */
export class SentryErrorReporter implements ErrorReporter {
  private enabled = false;

  init(config: ErrorReporterConfig): void {
    // Check if Sentry SDK is available
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

    // Check if enabled
    const isDev = __DEV__;
    const enableInDev = config.enableInDevelopment ?? false;

    if (isDev && !enableInDev) {
      logger.log(
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
          ? (event: any, hint: any) => {
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
      logger.log(
        `[SentryErrorReporter] Initialized (env: ${config.environment || "production"})`
      );
    } catch (error) {
      logger.error("[SentryErrorReporter] Initialization failed:", error);
    }
  }

  captureException(error: Error, context?: ErrorContext): void {
    if (!this.enabled) return;

    try {
      Sentry.captureException(error, {
        contexts: context,
      });
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
        level: level as any, // Sentry.SeverityLevel (SDK is dynamically loaded)
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
        level: breadcrumb.level as any, // Sentry.SeverityLevel (SDK is dynamically loaded)
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

  /**
   * Check if Sentry SDK is available
   * @returns true if @sentry/react-native is installed
   */
  static isSdkAvailable(): boolean {
    return Sentry !== null;
  }
}
