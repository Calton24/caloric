/**
 * NoopAnalyticsClient
 * Safe default — silently discards every call.
 * Used when analytics is not configured or disabled.
 */

import type { AnalyticsClient } from "./types";

export class NoopAnalyticsClient implements AnalyticsClient {
  identify(_userId: string, _traits?: Record<string, unknown>): void {
    // No-op
  }

  track(_event: string, _properties?: Record<string, unknown>): void {
    // No-op
  }

  screen(_name: string, _properties?: Record<string, unknown>): void {
    // No-op
  }

  reset(): void {
    // No-op
  }
}
