/**
 * Firebase Initialization
 * Conditionally initializes Firebase based on feature flags
 * Safe no-op when Firebase is disabled
 */

import { getAppConfig } from "@/src/config";
import { logger } from "../../logging/logger";

// Firebase imports are optional - only loaded if installed
let analytics: any = null;
let crashlytics: any = null;
let perf: any = null;
let firebaseApp: any = null;

let isInitialized = false;
let initializationError: Error | null = null;

/**
 * Initialize Firebase with current app configuration
 * Only initializes if Firebase features are enabled
 * Safe to call multiple times (singleton pattern)
 */
export async function initializeFirebase(): Promise<boolean> {
  // Already initialized or attempted
  if (isInitialized) {
    return firebaseApp !== null;
  }

  const config = getAppConfig();

  // Check if any Firebase features are enabled
  const isFirebaseEnabled =
    config.features.firebaseAnalytics ||
    config.features.crashReporting ||
    config.features.performanceMonitoring;

  if (!isFirebaseEnabled) {
    logger.log("[Firebase] All Firebase features disabled, skipping init");
    isInitialized = true;
    return false;
  }

  // Check if Firebase config exists
  if (!config.firebase) {
    logger.warn(
      "[Firebase] Features enabled but no Firebase config found in profile"
    );
    isInitialized = true;
    return false;
  }

  try {
    const firebaseModule = await import("@react-native-firebase/app").catch(
      () => null
    );

    if (!firebaseModule) {
      throw new Error(
        "@react-native-firebase/app not installed. Run: npm install @react-native-firebase/app"
      );
    }

    // Initialize Firebase app with config
    // Firebase auto-initializes from google-services.json / GoogleService-Info.plist
    // We just need to verify it's configured correctly
    firebaseApp = firebaseModule.default.app();

    logger.log("[Firebase] App initialized:", firebaseApp.name);

    // Initialize Analytics if enabled
    if (config.features.firebaseAnalytics) {
      const analyticsModule =
        await import("@react-native-firebase/analytics").catch(() => null);

      if (analyticsModule) {
        analytics = analyticsModule.default();
        await analytics.setAnalyticsCollectionEnabled(true);
        logger.log("[Firebase] Analytics enabled");
      } else {
        logger.warn(
          "[Firebase] Analytics enabled but @react-native-firebase/analytics not installed"
        );
      }
    }

    // Initialize Crashlytics if enabled
    if (config.features.crashReporting) {
      const crashlyticsModule =
        await import("@react-native-firebase/crashlytics").catch(() => null);

      if (crashlyticsModule) {
        crashlytics = crashlyticsModule.default();
        await crashlytics.setCrashlyticsCollectionEnabled(true);
        logger.log("[Firebase] Crashlytics enabled");
      } else {
        logger.warn(
          "[Firebase] Crash reporting enabled but @react-native-firebase/crashlytics not installed"
        );
      }
    }

    // Initialize Performance Monitoring if enabled
    if (config.features.performanceMonitoring) {
      const perfModule = await import("@react-native-firebase/perf").catch(
        () => null
      );

      if (perfModule) {
        perf = perfModule.default();
        await perf.setPerformanceCollectionEnabled(true);
        logger.log("[Firebase] Performance Monitoring enabled");
      } else {
        logger.warn(
          "[Firebase] Performance monitoring enabled but @react-native-firebase/perf not installed"
        );
      }
    }

    isInitialized = true;
    return true;
  } catch (error) {
    initializationError = error as Error;
    logger.error("[Firebase] Initialization failed:", error);
    isInitialized = true;
    return false;
  }
}

/**
 * Get Firebase Analytics instance
 * Returns null if not initialized or disabled
 */
export function getAnalytics() {
  if (!analytics) {
    logger.warn("[Firebase] Analytics not initialized or disabled");
  }
  return analytics;
}

/**
 * Get Firebase Crashlytics instance
 * Returns null if not initialized or disabled
 */
export function getCrashlytics() {
  if (!crashlytics) {
    logger.warn("[Firebase] Crashlytics not initialized or disabled");
  }
  return crashlytics;
}

/**
 * Get Firebase Performance instance
 * Returns null if not initialized or disabled
 */
export function getPerformance() {
  if (!perf) {
    logger.warn(
      "[Firebase] Performance Monitoring not initialized or disabled"
    );
  }
  return perf;
}

/**
 * Check if Firebase is initialized and ready
 */
export function isFirebaseReady(): boolean {
  return isInitialized && firebaseApp !== null;
}

/**
 * Get initialization error if any
 */
export function getInitializationError(): Error | null {
  return initializationError;
}
