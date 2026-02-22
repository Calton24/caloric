/**
 * Error Reporting - Type Definitions
 * Provider-agnostic error reporting interface
 */

export type ErrorLevel = "fatal" | "error" | "warning" | "info" | "debug";

export interface ErrorContext {
  [key: string]: any;
}

export interface Breadcrumb {
  message: string;
  category?: string;
  level?: ErrorLevel;
  data?: ErrorContext;
  timestamp?: number;
}

export interface User {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: any;
}

export interface ErrorReporterConfig {
  dsn?: string;
  environment?: string;
  enabled?: boolean;
  enableInDevelopment?: boolean;
  debug?: boolean;
  beforeSend?: (error: Error, context?: ErrorContext) => boolean;
  [key: string]: any;
}

/**
 * Provider-agnostic error reporting interface
 */
export interface ErrorReporter {
  /**
   * Initialize the error reporter
   */
  init(config: ErrorReporterConfig): void;

  /**
   * Capture an exception/error
   */
  captureException(error: Error, context?: ErrorContext): void;

  /**
   * Capture a message (log entry)
   */
  captureMessage(
    message: string,
    level?: ErrorLevel,
    context?: ErrorContext
  ): void;

  /**
   * Set user context
   */
  setUser(user: User | null): void;

  /**
   * Set a tag (key-value metadata)
   */
  setTag(key: string, value: string): void;

  /**
   * Add a breadcrumb (trail of events)
   */
  addBreadcrumb(breadcrumb: Breadcrumb): void;

  /**
   * Check if error reporting is enabled
   */
  isEnabled(): boolean;
}
