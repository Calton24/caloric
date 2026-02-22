/**
 * Analytics — Singleton proxy
 *
 * Every analytics call in the app goes through this module.
 * The backing client is swapped via setAnalyticsClient() at bootstrap;
 * until then all calls silently no-op.
 *
 * Every method wraps in try/catch — analytics must NEVER crash the app.
 */

import { NoopAnalyticsClient } from "./NoopAnalyticsClient";
import type { AnalyticsClient } from "./types";

let client: AnalyticsClient = new NoopAnalyticsClient();

/** Replace the backing analytics implementation (call once at startup). */
export function setAnalyticsClient(newClient: AnalyticsClient): void {
  client = newClient;
}

/** Retrieve the current client (testing). */
export function getAnalyticsClient(): AnalyticsClient {
  return client;
}

/**
 * Public analytics API — import this from feature code.
 *
 * @example
 * ```ts
 * import { analytics } from "@/infrastructure/analytics";
 * analytics.track("button_pressed", { screen: "home" });
 * ```
 */
export const analytics = {
  identify(userId: string, traits?: Record<string, unknown>): void {
    try {
      client.identify(userId, traits);
    } catch (error) {
      console.warn("[Analytics] identify failed:", error);
    }
  },

  track(event: string, properties?: Record<string, unknown>): void {
    try {
      client.track(event, properties);
    } catch (error) {
      console.warn("[Analytics] track failed:", error);
    }
  },

  screen(name: string, properties?: Record<string, unknown>): void {
    try {
      client.screen(name, properties);
    } catch (error) {
      console.warn("[Analytics] screen failed:", error);
    }
  },

  reset(): void {
    try {
      client.reset();
    } catch (error) {
      console.warn("[Analytics] reset failed:", error);
    }
  },
};
