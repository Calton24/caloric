/**
 * Firebase Public API
 * Export all Firebase functionality with safe no-op behavior
 */

// Initialization
export {
    getAnalytics,
    getCrashlytics, getInitializationError, getPerformance, initializeFirebase,
    isFirebaseReady
} from "./init";

// Analytics
export {
    logAppOpen,
    // Pre-defined events
    logLogin, logPurchase, logScreenView, logSearch,
    logSelectContent, logSignUp, resetAnalyticsData, setAnalyticsCollectionEnabled, setUserId,
    setUserProperties, trackEvent
} from "./analytics";

// Crashlytics
export {
    crash, deleteUnsentReports, didCrashOnPreviousExecution, log, recordError, recordErrorWithContext, sendUnsentReports, setAttribute,
    setAttributes,
    setCrashCollectionEnabled, setCrashUserId
} from "./crashlytics";

