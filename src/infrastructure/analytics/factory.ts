/**
 * Analytics — Factory
 *
 * Env vars (credentials only):
 *   EXPO_PUBLIC_POSTHOG_API_KEY
 *   EXPO_PUBLIC_POSTHOG_HOST (default: https://us.i.posthog.com)
 *
 * Gating:
 *   getAppConfig().features.analytics must be true, otherwise noop.
 */

import Constants from "expo-constants";
import { getAppConfig } from "../../config";
import { logger } from "../../logging/logger";
import { setAnalyticsClient } from "./analytics";
import { NoopAnalyticsClient } from "./NoopAnalyticsClient";
import { PostHogAnalyticsClient } from "./PostHogAnalyticsClient";
import type { AnalyticsClient } from "./types";

function env(key: string): string | undefined {
  return (
    (Constants.expoConfig?.extra as any)?.[key] ??
    process.env[`EXPO_PUBLIC_${key}`] ??
    undefined
  );
}

let initialized = false;
let resolvedClient: AnalyticsClient = new NoopAnalyticsClient();

type AnalyticsMode =
  | "disabled_by_config"
  | "enabled_missing_key"
  | "posthog_initialized"
  | "sdk_missing_fallback_noop";

function logMode(mode: AnalyticsMode): void {
  logger.log(`[Analytics] mode=${mode}`);
}

export function initAnalytics(): AnalyticsClient {
  if (initialized) return resolvedClient;

  const config = getAppConfig();
  const enabled = !!config.features.analytics;

  if (!enabled) {
    resolvedClient = new NoopAnalyticsClient();
    setAnalyticsClient(resolvedClient);
    initialized = true;
    logMode("disabled_by_config");
    return resolvedClient;
  }

  const apiKey = env("POSTHOG_API_KEY");
  const host = env("POSTHOG_HOST") ?? "https://us.i.posthog.com";

  if (!apiKey) {
    resolvedClient = new NoopAnalyticsClient();
    setAnalyticsClient(resolvedClient);
    initialized = true;
    logMode("enabled_missing_key");
    return resolvedClient;
  }

  const posthog = new PostHogAnalyticsClient(apiKey, host);

  // PostHogAnalyticsClient degrades to noop if the SDK isn't installed
  if (posthog instanceof PostHogAnalyticsClient && !(posthog as any).client) {
    resolvedClient = new NoopAnalyticsClient();
    setAnalyticsClient(resolvedClient);
    initialized = true;
    logMode("sdk_missing_fallback_noop");
    return resolvedClient;
  }

  resolvedClient = posthog;
  setAnalyticsClient(resolvedClient);
  initialized = true;
  logMode("posthog_initialized");
  return resolvedClient;
}

/** Testing only */
export function resetAnalytics(): void {
  resolvedClient = new NoopAnalyticsClient();
  setAnalyticsClient(resolvedClient);
  initialized = false;
}
