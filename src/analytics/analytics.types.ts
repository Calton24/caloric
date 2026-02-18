/**
 * Analytics Types
 * Core analytics interface - implementation-agnostic
 */

export interface AnalyticsClient {
  /**
   * Identify a user with traits
   */
  identify(userId: string, traits?: Record<string, any>): void;

  /**
   * Track an event with optional properties
   */
  track(event: string, properties?: Record<string, any>): void;

  /**
   * Reset the current user identity
   */
  reset(): void;
}

/**
 * Noop implementation - safe default
 */
export class NoopAnalyticsClient implements AnalyticsClient {
  identify(_userId: string, _traits?: Record<string, any>): void {
    // No-op
  }

  track(_event: string, _properties?: Record<string, any>): void {
    // No-op
  }

  reset(): void {
    // No-op
  }
}
