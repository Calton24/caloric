/**
 * Analytics Module
 * Singleton analytics instance with swappable client
 */

import type { AnalyticsClient } from "./analytics.types";
import { NoopAnalyticsClient } from "./analytics.types";

let client: AnalyticsClient = new NoopAnalyticsClient();

/**
 * Set the analytics client implementation
 */
export function setAnalyticsClient(newClient: AnalyticsClient): void {
  client = newClient;
}

/**
 * Get the current analytics client (for testing)
 */
export function getAnalyticsClient(): AnalyticsClient {
  return client;
}

/**
 * Analytics singleton - safe to call even if not initialized
 */
export const analytics = {
  /**
   * Identify a user
   */
  identify(userId: string, traits?: Record<string, any>): void {
    try {
      client.identify(userId, traits);
    } catch (error) {
      // Never crash the app due to analytics
      console.warn("[Analytics] identify failed:", error);
    }
  },

  /**
   * Track an event
   */
  track(event: string, properties?: Record<string, any>): void {
    try {
      client.track(event, properties);
    } catch (error) {
      // Never crash the app due to analytics
      console.warn("[Analytics] track failed:", error);
    }
  },

  /**
   * Reset user identity
   */
  reset(): void {
    try {
      client.reset();
    } catch (error) {
      // Never crash the app due to analytics
      console.warn("[Analytics] reset failed:", error);
    }
  },
};
