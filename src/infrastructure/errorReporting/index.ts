/**
 * Error Reporting - Public API
 * Use this barrel export throughout the app
 */

// Factory
export { getErrorReporter, initErrorReporting } from "./factory";

// Error Boundary component
export { ErrorBoundary } from "./ErrorBoundary";

// Types
export type {
    Breadcrumb, ErrorContext,
    ErrorLevel, ErrorReporter,
    ErrorReporterConfig, User
} from "./types";

// Implementations (rarely needed directly, but exported for advanced use cases)
export { NoopErrorReporter } from "./NoopErrorReporter";
export { SentryErrorReporter } from "./SentryErrorReporter";

