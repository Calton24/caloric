/**
 * Firebase Public API
 * Export Firebase Crashlytics + Performance + Init.
 * Analytics is handled by src/infrastructure/analytics/ (PostHog via AnalyticsClient interface).
 */

// Initialization
export {
    getCrashlytics,
    getInitializationError,
    getPerformance,
    initializeFirebase,
    isFirebaseReady
} from "./init";

// Crashlytics
export {
    crash,
    deleteUnsentReports,
    didCrashOnPreviousExecution,
    log,
    recordError,
    recordErrorWithContext,
    sendUnsentReports,
    setAttribute,
    setAttributes,
    setCrashCollectionEnabled,
    setCrashUserId
} from "./crashlytics";

