/**
 * Maintenance — Factory
 *
 * Provider selection:
 *   1. config.features.maintenance === false  → NoopMaintenanceClient (disabled)
 *   2. EXPO_PUBLIC_MAINTENANCE_URL present    → RemoteJsonMaintenanceClient
 *   3. EXPO_PUBLIC_POSTHOG_API_KEY present    → PostHogMaintenanceClient
 *   4. else                                    → NoopMaintenanceClient (local_default)
 *
 * Additionally: if Supabase URL + anon key are present, start outage monitor.
 * Manual override always wins over outage monitor (handled in proxy).
 *
 * Gating:
 *   getAppConfig().features.maintenance must be true, otherwise noop.
 */

import Constants from "expo-constants";
import { getAppConfig } from "../../config";
import {
    loadPersistedOverride,
    maintenance,
    setHealthMonitor,
    setMaintenanceClient,
} from "./maintenance";
import { NoopMaintenanceClient } from "./NoopMaintenanceClient";
import { PostHogMaintenanceClient } from "./PostHogMaintenanceClient";
import { RemoteJsonMaintenanceClient } from "./RemoteJsonMaintenanceClient";
import { SupabaseHealthMonitor } from "./SupabaseHealthMonitor";
import type { MaintenanceClient } from "./types";

function env(key: string): string | undefined {
  return (
    (Constants.expoConfig?.extra as any)?.[key] ??
    process.env[`EXPO_PUBLIC_${key}`] ??
    undefined
  );
}

let initialized = false;
let resolvedClient: MaintenanceClient = new NoopMaintenanceClient();
let monitor: SupabaseHealthMonitor | null = null;

type MaintenanceBootMode =
  | "disabled_by_config"
  | "remote_json"
  | "posthog"
  | "local_default";

function logMode(mode: MaintenanceBootMode): void {
  console.log(`[Maintenance] mode=${mode}`);
}

export function initMaintenance(): MaintenanceClient {
  if (initialized) return resolvedClient;

  const config = getAppConfig();
  const enabled = !!config.features.maintenance;

  if (!enabled) {
    resolvedClient = new NoopMaintenanceClient();
    setMaintenanceClient(resolvedClient);
    initialized = true;
    logMode("disabled_by_config");
    return resolvedClient;
  }

  // ── Select provider ───────────────────────────────────────────────────

  // Priority 1: Remote JSON endpoint
  const maintenanceUrl = env("MAINTENANCE_URL");
  if (maintenanceUrl) {
    resolvedClient = new RemoteJsonMaintenanceClient(maintenanceUrl);
    setMaintenanceClient(resolvedClient);
    logMode("remote_json");
  }
  // Priority 2: PostHog feature flags
  else {
    const posthogKey = env("POSTHOG_API_KEY");
    const posthogHost = env("POSTHOG_HOST") ?? "https://us.i.posthog.com";
    if (posthogKey) {
      resolvedClient = new PostHogMaintenanceClient(posthogKey, posthogHost);
      setMaintenanceClient(resolvedClient);
      logMode("posthog");
    } else {
      // Fallback: Noop
      resolvedClient = new NoopMaintenanceClient();
      setMaintenanceClient(resolvedClient);
      logMode("local_default");
    }
  }

  // ── Outage monitor (optional) ─────────────────────────────────────────
  const supabaseUrl = env("SUPABASE_URL");
  const supabaseKey = env("SUPABASE_ANON_KEY");

  if (supabaseUrl && supabaseKey) {
    monitor = new SupabaseHealthMonitor(supabaseUrl, supabaseKey);
    setHealthMonitor(monitor);
    monitor.start();
    console.log("[Maintenance] mode=outage_monitor_enabled");
  }

  // ── Load persisted override asynchronously (non-blocking) ─────────────
  void loadPersistedOverride();

  // ── Populate lastResolvedState so isBlocked() works from first tick ───
  // Also logs a seed confirmation so operators can grep for boot proof.
  void maintenance.getState().then(() => {
    console.log("[Maintenance] seeded=true source=init");
  });

  initialized = true;
  return resolvedClient;
}

/** Testing only */
export function resetMaintenance(): void {
  if (monitor) {
    monitor.stop();
    monitor = null;
  }
  setHealthMonitor(null);
  resolvedClient = new NoopMaintenanceClient();
  setMaintenanceClient(resolvedClient);
  initialized = false;
}

/** Get the current health monitor instance (testing). */
export function getMonitor(): SupabaseHealthMonitor | null {
  return monitor;
}
