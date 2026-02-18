/**
 * Sentry Logger Implementation
 * Production-grade error tracking using Sentry
 */

import * as Sentry from "sentry-expo";
import type { Logger } from "./logger.types";

/**
 * Sentry-backed logger for production error tracking
 *
 * Features:
 * - Captures exceptions in Sentry
 * - Attaches contextual metadata
 * - Respects environment (dev vs production)
 * - Falls back gracefully if Sentry is not initialized
 */
export class SentryLogger implements Logger {
  private readonly isDev: boolean;

  constructor() {
    this.isDev = __DEV__;
  }

  /**
   * Log informational message
   * In production, sends to Sentry as breadcrumb
   * In dev, logs to console
   */
  log(message: string, meta?: any): void {
    if (this.isDev) {
      console.log(message, meta);
      return;
    }

    try {
      Sentry.Native.addBreadcrumb({
        message,
        level: "info",
        data: meta,
      });
    } catch {
      // Fallback to console if Sentry fails
      console.log("[Sentry fallback]", message, meta);
    }
  }

  /**
   * Log warning message
   * In production, sends to Sentry as breadcrumb
   * In dev, logs to console
   */
  warn(message: string, meta?: any): void {
    if (this.isDev) {
      console.warn(message, meta);
      return;
    }

    try {
      Sentry.Native.addBreadcrumb({
        message,
        level: "warning",
        data: meta,
      });
    } catch {
      // Fallback to console if Sentry fails
      console.warn("[Sentry fallback]", message, meta);
    }
  }

  /**
   * Log error message
   * In production, captures exception in Sentry
   * In dev, logs to console
   */
  error(message: string, meta?: any): void {
    if (this.isDev) {
      console.error(message, meta);
      return;
    }

    try {
      // Create an Error object for better stack traces
      const error = new Error(message);

      // Attach metadata as context
      if (meta) {
        Sentry.Native.setContext("error_metadata", meta);
      }

      // Capture the exception
      Sentry.Native.captureException(error);
    } catch {
      // Fallback to console if Sentry fails
      console.error("[Sentry fallback]", message, meta);
    }
  }
}
