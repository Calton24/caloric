/**
 * PostHog Analytics Client
 * Adapter implementation for PostHog
 */

import type { AnalyticsClient } from "./analytics.types";

/**
 * PostHog client adapter
 * Defensive implementation - safe if PostHog not initialized
 */
export class PostHogAnalyticsClient implements AnalyticsClient {
  private posthog: any;
  private initialized = false;

  constructor(apiKey: string, host: string) {
    try {
      // Dynamic import to avoid bundling if not used
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const posthog = require("posthog-react-native");
      if (posthog?.PostHog) {
        this.posthog = new posthog.PostHog(apiKey, { host });
        this.initialized = true;
      }
    } catch (error) {
      console.warn("[PostHog] Failed to initialize:", error);
      this.initialized = false;
    }
  }

  identify(userId: string, traits?: Record<string, any>): void {
    if (!this.initialized || !this.posthog) return;

    try {
      this.posthog.identify(userId, traits);
    } catch (error) {
      console.warn("[PostHog] identify failed:", error);
    }
  }

  track(event: string, properties?: Record<string, any>): void {
    if (!this.initialized || !this.posthog) return;

    try {
      this.posthog.capture(event, properties);
    } catch (error) {
      console.warn("[PostHog] track failed:", error);
    }
  }

  reset(): void {
    if (!this.initialized || !this.posthog) return;

    try {
      this.posthog.reset();
    } catch (error) {
      console.warn("[PostHog] reset failed:", error);
    }
  }
}
