/**
 * Runtime Invariants
 * Production-safe assertions for critical runtime conditions
 */

/**
 * Throws an error with the given message if condition is false.
 * Only runs in development mode for performance.
 */
export function invariant(
  condition: boolean,
  message: string
): asserts condition {
  if (__DEV__) {
    if (!condition) {
      throw new Error(`[Caloric] Invariant violation: ${message}`);
    }
  }
}

/**
 * Logs a warning in development mode only
 */
export function warning(condition: boolean, message: string): void {
  if (__DEV__) {
    if (!condition) {
      console.warn(`[Caloric] Warning: ${message}`);
    }
  }
}
