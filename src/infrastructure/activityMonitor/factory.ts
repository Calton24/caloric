/**
 * Activity Monitor — Factory
 *
 * Gating:
 *   getAppConfig().features.activityMonitor must be true, otherwise noop.
 *
 * Phase 1: InAppActivityMonitorClient (memory-backed)
 * Phase 2: liveActivity infra (expo-widgets) provides real iOS Live Activities
 */

import { getAppConfig } from "../../config";
import { InAppActivityMonitorClient } from "./InAppActivityMonitorClient";
import { NoopActivityMonitorClient } from "./NoopActivityMonitorClient";
import { setActivityMonitorClient } from "./activityMonitor";
import type { ActivityMonitorClient } from "./types";

let initialized = false;
let resolvedClient: ActivityMonitorClient = new NoopActivityMonitorClient();

type ActivityMode = "disabled_by_config" | "enabled_inapp";

function logMode(mode: ActivityMode): void {
  console.log(`[Activity] mode=${mode}`);
}

export function initActivityMonitor(): ActivityMonitorClient {
  if (initialized) return resolvedClient;

  const config = getAppConfig();
  const enabled = !!config.features.activityMonitor;

  if (!enabled) {
    resolvedClient = new NoopActivityMonitorClient();
    setActivityMonitorClient(resolvedClient);
    initialized = true;
    logMode("disabled_by_config");
    return resolvedClient;
  }

  resolvedClient = new InAppActivityMonitorClient();
  setActivityMonitorClient(resolvedClient);
  initialized = true;
  logMode("enabled_inapp");
  return resolvedClient;
}

/** Testing only */
export function resetActivityMonitor(): void {
  resolvedClient = new NoopActivityMonitorClient();
  setActivityMonitorClient(resolvedClient);
  initialized = false;
}
