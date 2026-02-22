/**
 * Logger Types
 * Core logging interface - implementation-agnostic
 */

export interface Logger {
  /**
   * Log informational message
   */
  log(message: string, meta?: any): void;

  /**
   * Log warning message
   */
  warn(message: string, meta?: any): void;

  /**
   * Log error message
   */
  error(message: string, meta?: any): void;
}

/**
 * Console logger - safe default
 */
export class ConsoleLogger implements Logger {
  log(message: string, meta?: any): void {
    if (meta !== undefined) {
      console.log(message, meta);
    } else {
      console.log(message);
    }
  }

  warn(message: string, meta?: any): void {
    if (meta !== undefined) {
      console.warn(message, meta);
    } else {
      console.warn(message);
    }
  }

  error(message: string, meta?: any): void {
    if (meta !== undefined) {
      console.error(message, meta);
    } else {
      console.error(message);
    }
  }
}
