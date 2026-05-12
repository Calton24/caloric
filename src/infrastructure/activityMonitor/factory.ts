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
import {
  FOOD_LOG_SAFE_MODE,
  assertFoodLogSafeModeImport,
} from "../../features/debug/safe-mode-flags";
import { logger } from "../../logging/logger";
import { InAppActivityMonitorClient } from "./InAppActivityMonitorClient";
import { NoopActivityMonitorClient } from "./NoopActivityMonitorClient";
import { setActivityMonitorClient } from "./activityMonitor";
import type { ActivityMonitorClient } from "./types";

assertFoodLogSafeModeImport("activity_monitor");

let initialized = false;
let resolvedClient: ActivityMonitorClient = new NoopActivityMonitorClient();

type ActivityMode =
  | "disabled_by_config"
  | "disabled_food_log_safe_mode"
  | "enabled_inapp";

function logMode(mode: ActivityMode): void {
  logger.log(`[Activity] mode=${mode}`);
}

export function initActivityMonitor(): ActivityMonitorClient {
  if (initialized) return resolvedClient;

  if (FOOD_LOG_SAFE_MODE) {
    resolvedClient = new NoopActivityMonitorClient();
    setActivityMonitorClient(resolvedClient);
    initialized = true;
    logMode("disabled_food_log_safe_mode");
    if (__DEV__) {
      console.log("[SafeModeViolation:guard]", {
        site: "activity_monitor.init",
        action: "noop_returned",
      });
    }
    return resolvedClient;
  }

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
