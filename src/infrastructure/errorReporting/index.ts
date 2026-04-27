/**
 * Error Reporting - Public API
 * Use this barrel export throughout the app
 */

// Factory
export {
    getErrorReporter,
    initErrorReporting,
    resetErrorReporting,
} from "./factory";

// Error Boundary component
export { ErrorBoundary } from "./ErrorBoundary";

// High-level reporting helpers (preferred entry point for callers)
export {
    reportBreadcrumb,
    reportError,
    scrubExtra,
} from "./reportError";
export type { ReportArea, ReportContext } from "./reportError";

// Types
export type {
    Breadcrumb,
    ErrorContext,
    ErrorLevel,
    ErrorReporter,
    ErrorReporterConfig,
    User,
} from "./types";

// Noop implementation (safe for testing/mocking)
export { NoopErrorReporter } from "./NoopErrorReporter";

// Note: SentryErrorReporter is NOT exported to avoid static imports of @sentry/react-native
// It's only used internally by the factory
