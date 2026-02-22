/**
 * PostHogAnalyticsClient
 * Adapter that implements AnalyticsClient using the PostHog React-Native SDK.
 *
 * The SDK is loaded via dynamic require so the package is truly optional:
 * if `posthog-react-native` is not installed the constructor gracefully
 * falls back to noop behaviour.
 */

import type { AnalyticsClient } from "./types";

let PostHogSDK: any = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  PostHogSDK = require("posthog-react-native");
} catch {
  PostHogSDK = null;
}

export class PostHogAnalyticsClient implements AnalyticsClient {
  private client: any | null;

  constructor(apiKey: string, host: string) {
    if (!PostHogSDK?.PostHog) {
      this.client = null;

      if (__DEV__) {
        console.warn(
          "[Analytics] posthog-react-native not installed. Falling back to noop."
        );
      }

      return;
    }

    this.client = new PostHogSDK.PostHog(apiKey, { host });
  }

  identify(userId: string, traits?: Record<string, unknown>): void {
    if (!this.client) return;
    this.client.identify(userId, traits);
  }

  track(event: string, properties?: Record<string, unknown>): void {
    if (!this.client) return;
    this.client.capture(event, properties);
  }

  screen(name: string, properties?: Record<string, unknown>): void {
    if (!this.client) return;
    this.client.screen(name, properties);
  }

  reset(): void {
    if (!this.client) return;
    this.client.reset();
  }
}
