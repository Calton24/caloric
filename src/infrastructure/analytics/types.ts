/**
 * Analytics — Contract
 *
 * The ONLY interface feature code may depend on.
 * Implementations live in this directory as provider files.
 */

export interface AnalyticsClient {
  /** Associate a user with future events */
  identify(userId: string, traits?: Record<string, unknown>): void;

  /** Fire a named event */
  track(event: string, properties?: Record<string, unknown>): void;

  /** Record a screen view (mobile-specific) */
  screen(name: string, properties?: Record<string, unknown>): void;

  /** Clear identity (logout) */
  reset(): void;
}
