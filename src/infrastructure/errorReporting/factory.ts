/**
 * Error Reporting - Factory
 * Creates the appropriate error reporter based on configuration
 */

import Constants from "expo-constants";
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
    console.warn(
      "[ErrorReporting] Already initialized, returning existing instance"
    );
    return reporterInstance;
  }

  // Get configuration from environment
  const sentryDsn =
    Constants.expoConfig?.extra?.sentryDsn ||
    process.env.EXPO_PUBLIC_SENTRY_DSN;

  const enableInDev =
    Constants.expoConfig?.extra?.enableSentryInDev ||
    process.env.EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV === "true";

  const environment =
    Constants.expoConfig?.extra?.environment ||
    process.env.EXPO_PUBLIC_APP_ENV ||
    (__DEV__ ? "development" : "production");

  // Decide which reporter to use
  if (sentryDsn) {
    const config: ErrorReporterConfig = {
      dsn: sentryDsn,
      environment,
      enableInDevelopment: enableInDev,
      debug: __DEV__,
    };

    reporterInstance = new SentryErrorReporter();
    reporterInstance.init(config);
  } else {
    console.log(
      "[ErrorReporting] No SENTRY_DSN configured - error reporting disabled"
    );
    reporterInstance = new NoopErrorReporter();
  }

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
