/**
 * Live Activity Feature — Service
 *
 * Wraps the existing CalorieBudgetActivity native bridge with a
 * thin state layer that guards against duplicate starts, deduplicates
 * identical payloads, and manages the active activity ID.
 */

import { calorieBudgetActivity } from "../../infrastructure/liveActivity/CalorieBudgetActivity";
import type { LiveActivityPayload } from "./live-activity.types";

let activeActivityId: string | null = null;
let lastPayloadHash: string | null = null;

function hashPayload(p: LiveActivityPayload): string {
  return `${p.caloriesConsumed}|${p.calorieBudget}|${p.protein}|${p.carbs}|${p.fat}`;
}

/**
 * Check whether Live Activities are supported and enabled on this device.
 * Returns false on Android, iOS < 16.2, Expo Go, or if the user disabled
 * Live Activities for this app in iOS Settings.
 */
export function areLiveActivitiesAvailable(): boolean {
  return calorieBudgetActivity.isSupported();
}

/**
 * Start a new CalorieBudget Live Activity with the given payload.
 * If one is already running it will be ended first.
 */
export function startLiveActivity(payload: LiveActivityPayload): void {
  // End any existing activity first
  if (activeActivityId) {
    calorieBudgetActivity.end(activeActivityId);
    activeActivityId = null;
  }

  const result = calorieBudgetActivity.start({
    baseGoal: payload.calorieBudget,
    consumed: payload.caloriesConsumed,
    activityBonus: 0,
    mode: "strict",
  });

  if (result.status === "started") {
    activeActivityId = result.activityId;
    lastPayloadHash = hashPayload(payload);
  }
}

/**
 * Update the running Live Activity. If none is running, starts one.
 * No-ops if the payload hasn't changed.
 */
export function updateLiveActivity(payload: LiveActivityPayload): void {
  const nextHash = hashPayload(payload);

  if (!activeActivityId) {
    startLiveActivity(payload);
    return;
  }

  if (lastPayloadHash === nextHash) {
    return; // nothing changed
  }

  lastPayloadHash = nextHash;

  calorieBudgetActivity.update(activeActivityId, {
    consumed: payload.caloriesConsumed,
    activityBonus: 0,
  });
}

/**
 * End the running Live Activity, if any.
 */
export function endLiveActivity(): void {
  if (activeActivityId) {
    calorieBudgetActivity.end(activeActivityId);
    activeActivityId = null;
    lastPayloadHash = null;
  }

  // Also clean up any orphans
  calorieBudgetActivity.endAll();
}

/**
 * Whether a Live Activity is currently running.
 */
export function isLiveActivityRunning(): boolean {
  return activeActivityId !== null;
}
