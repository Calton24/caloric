/**
 * Error Reporting - No-op Implementation
 * Used when error reporting is disabled
 */

import {
    Breadcrumb,
    ErrorContext,
    ErrorLevel,
    ErrorReporter,
    ErrorReporterConfig,
    User,
} from "./types";

/**
 * No-op error reporter (does nothing)
 * Used when error reporting is not configured
 */
export class NoopErrorReporter implements ErrorReporter {
  private enabled = false;

  init(_config: ErrorReporterConfig): void {
    // No-op
  }

  captureException(_error: Error, _context?: ErrorContext): void {
    // No-op
  }

  captureMessage(
    _message: string,
    _level?: ErrorLevel,
    _context?: ErrorContext
  ): void {
    // No-op
  }

  setUser(_user: User | null): void {
    // No-op
  }

  setTag(_key: string, _value: string): void {
    // No-op
  }

  addBreadcrumb(_breadcrumb: Breadcrumb): void {
    // No-op
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
