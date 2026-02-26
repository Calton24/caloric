/**
 * Logger Module
 * Singleton logger with swappable implementation
 */

import type { Logger } from "./logger.types";
import { ConsoleLogger } from "./logger.types";

let loggerInstance: Logger = new ConsoleLogger();

/**
 * Set the logger implementation
 */
export function setLogger(newLogger: Logger): void {
  loggerInstance = newLogger;
}

/**
 * Get the current logger (for testing)
 */
export function getLogger(): Logger {
  return loggerInstance;
}

/**
 * Logger singleton - safe to call always
 */
export const logger = {
  /**
   * Log informational message
   */
  log(message: string, meta?: any): void {
    try {
      loggerInstance.log(message, meta);
    } catch {
      // Fallback to console if logger fails
      console.log("[Logger fallback]", message, meta);
    }
  },

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void {
    try {
      loggerInstance.warn(message, meta);
    } catch {
      // Fallback to console if logger fails
      console.warn("[Logger fallback]", message, meta);
    }
  },

  /**
   * Log error message
   */
  error(message: string, meta?: any): void {
    try {
      loggerInstance.error(message, meta);
    } catch {
      // Fallback to console if logger fails
      console.error("[Logger fallback]", message, meta);
    }
  },
};
/**
 * Re-export redaction utilities for use throughout the app
 */
export { redactObjectSensitiveFields, redactSensitive } from "./redactor";

