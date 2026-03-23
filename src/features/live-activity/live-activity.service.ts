/**
 * Live Activity Feature — Service
 *
 * Wraps the CalorieTrackerActivity native bridge with a thin state
 * layer that guards against duplicate starts, deduplicates identical
 * payloads, and manages the active activity ID.
 */

import { calorieTrackerActivity } from "../../infrastructure/liveActivity/CalorieTrackerActivity";
import type { LiveActivityPayload } from "./live-activity.types";

let activeActivityId: string | null = null;
let lastPayloadHash: string | null = null;

function hashPayload(p: LiveActivityPayload): string {
  return `${p.caloriesConsumed}|${p.calorieBudget}|${p.protein}|${p.carbs}|${p.fat}|${p.proteinGoal}|${p.carbsGoal}|${p.fatGoal}`;
}

/**
 * Check whether Live Activities are supported and enabled on this device.
 * Returns false on Android, iOS < 16.2, Expo Go, or if the user disabled
 * Live Activities for this app in iOS Settings.
 */
export function areLiveActivitiesAvailable(): boolean {
  return calorieTrackerActivity.isSupported();
}

/**
 * Start a new CalorieTracker Live Activity with the given payload.
 * If one is already running it will be ended first.
 */
export function startLiveActivity(payload: LiveActivityPayload): void {
  // End any existing activity first
  if (activeActivityId) {
    calorieTrackerActivity.end(activeActivityId);
    activeActivityId = null;
  }

  const result = calorieTrackerActivity.start({
    calorieGoal: payload.calorieBudget,
    proteinGoal: payload.proteinGoal,
    carbsGoal: payload.carbsGoal,
    fatGoal: payload.fatGoal,
    caloriesConsumed: payload.caloriesConsumed,
    proteinConsumed: payload.protein,
    carbsConsumed: payload.carbs,
    fatConsumed: payload.fat,
  });

  if (result.status === "started") {
    activeActivityId = result.activityId;
    lastPayloadHash = hashPayload(payload);
  } else {
    console.warn(
      `[LiveActivity] start failed: ${result.status} — ${result.reason}`
    );
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

  calorieTrackerActivity.update(activeActivityId, {
    caloriesConsumed: payload.caloriesConsumed,
    proteinConsumed: payload.protein,
    carbsConsumed: payload.carbs,
    fatConsumed: payload.fat,
  });
}

/**
 * End the running Live Activity, if any.
 */
export function endLiveActivity(): void {
  if (activeActivityId) {
    calorieTrackerActivity.end(activeActivityId);
    activeActivityId = null;
    lastPayloadHash = null;
  }

  // Also clean up any orphans
  calorieTrackerActivity.endAll();
}

/**
 * Whether a Live Activity is currently running.
 */
export function isLiveActivityRunning(): boolean {
  return activeActivityId !== null;
}
