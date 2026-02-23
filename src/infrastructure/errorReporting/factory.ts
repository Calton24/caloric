/**
 * Error Reporting - Factory
 * Creates the appropriate error reporter based on configuration
 */

import Constants from "expo-constants";
import { getAppConfig } from "../../config";
import { NoopErrorReporter } from "./NoopErrorReporter";
import { SentryErrorReporter } from "./SentryErrorReporter";
import { ErrorReporter, ErrorReporterConfig } from "./types";

// Singleton instance
let reporterInstance: ErrorReporter | null = null;

/**
 * Initialize error reporting system
 * Call this once at app startup
 */
export function initErrorReporting(): ErrorReporter {
  if (reporterInstance) {
    return reporterInstance;
  }

  // Get configuration
  const config = getAppConfig();
  const isDev = __DEV__;

  // Check if crash reporting is enabled in config
  if (!config.features.crashReporting) {
    console.log("[ErrorReporting] mode=disabled_by_config");
    reporterInstance = new NoopErrorReporter();
    return reporterInstance;
  }

  // Get Sentry DSN from environment
  const sentryDsn =
    Constants.expoConfig?.extra?.sentryDsn ||
    process.env.EXPO_PUBLIC_SENTRY_DSN;

  if (!sentryDsn) {
    console.log("[ErrorReporting] mode=enabled_missing_dsn");
    reporterInstance = new NoopErrorReporter();
    return reporterInstance;
  }

  // Check if Sentry SDK is available
  if (!SentryErrorReporter.isSdkAvailable()) {
    console.log("[ErrorReporting] mode=sdk_missing_fallback_noop");
    reporterInstance = new NoopErrorReporter();
    return reporterInstance;
  }

  // Initialize Sentry
  const enableInDev =
    Constants.expoConfig?.extra?.enableSentryInDev ||
    process.env.EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV === "true";

  const environment =
    Constants.expoConfig?.extra?.environment ||
    process.env.EXPO_PUBLIC_APP_ENV ||
    (isDev ? "development" : "production");

  const sentryConfig: ErrorReporterConfig = {
    dsn: sentryDsn,
    environment,
    enableInDevelopment: enableInDev,
    debug: isDev,
  };

  reporterInstance = new SentryErrorReporter();
  reporterInstance.init(sentryConfig);
  console.log("[ErrorReporting] mode=sentry_initialized");

  return reporterInstance;
}

/**
 * Get the current error reporter instance
 * Must call initErrorReporting() first
 */
export function getErrorReporter(): ErrorReporter {
  if (!reporterInstance) {
    console.warn(
      "[ErrorReporting] Not initialized, returning no-op reporter. Call initErrorReporting() first."
    );
    return new NoopErrorReporter();
  }

  return reporterInstance;
}

/**
 * Reset error reporting (useful for testing)
 */
export function resetErrorReporting(): void {
  reporterInstance = null;
}
