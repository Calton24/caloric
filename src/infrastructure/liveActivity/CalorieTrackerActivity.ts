/**
 * CalorieTrackerActivity — High-level JS API for the Calorie Tracker Live Activity
 *
 * Shows calorie ring, macro progress bars, and 3 CTA buttons (text/voice/camera)
 * in the Dynamic Island and Lock Screen.
 *
 * Usage:
 *   import { calorieTrackerActivity } from "../../infrastructure/liveActivity/CalorieTrackerActivity";
 *   const result = calorieTrackerActivity.start({
 *     calorieGoal: 2050, proteinGoal: 128, carbsGoal: 116, fatGoal: 36,
 *     caloriesConsumed: 0, proteinConsumed: 0, carbsConsumed: 0, fatConsumed: 0,
 *   });
 *   calorieTrackerActivity.update(result.activityId, {
 *     caloriesConsumed: 800, proteinConsumed: 45, carbsConsumed: 60, fatConsumed: 15,
 *   });
 *   calorieTrackerActivity.end(result.activityId);
 */

import { logger } from "../../logging/logger";

export interface CalorieTrackerStartProps {
  calorieGoal: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
  caloriesConsumed?: number;
  proteinConsumed?: number;
  carbsConsumed?: number;
  fatConsumed?: number;
}

export interface CalorieTrackerUpdateProps {
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
}

export type CalorieTrackerStartResult =
  | { status: "started"; activityId: string }
  | { status: "unavailable"; reason: string }
  | { status: "denied"; reason: string };

export type CalorieTrackerUpdateResult =
  | { status: "updated" }
  | { status: "unavailable"; reason: string };

export type CalorieTrackerEndResult =
  | { status: "ended" }
  | { status: "unavailable"; reason: string };

// ── Lazy-load native module ──
let nativeModule: any = null;
let moduleAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requireNativeModule } = require("expo-modules-core");
  nativeModule = requireNativeModule("LiveActivityModule");
  moduleAvailable =
    typeof nativeModule?.startCalorieTrackerActivity === "function";
  logger.log("[CalorieTrackerActivity] moduleAvailable:", {
    moduleAvailable,
    isSupported: nativeModule?.isSupported?.(),
  });
} catch (e) {
  console.warn("[CalorieTrackerActivity] Failed to load native module:", e);
  moduleAvailable = false;
}

class CalorieTrackerActivityClient {
  isSupported(): boolean {
    if (!moduleAvailable) return false;
    try {
      return nativeModule?.isSupported?.() === true;
    } catch {
      return false;
    }
  }

  start(props: CalorieTrackerStartProps): CalorieTrackerStartResult {
    if (!this.isSupported()) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      const activityId = nativeModule.startCalorieTrackerActivity(
        props.calorieGoal,
        props.proteinGoal,
        props.carbsGoal,
        props.fatGoal,
        props.caloriesConsumed ?? 0,
        props.proteinConsumed ?? 0,
        props.carbsConsumed ?? 0,
        props.fatConsumed ?? 0
      );

      if (activityId) {
        return { status: "started", activityId };
      }
      return { status: "denied", reason: "ActivityKit denied the request" };
    } catch (e: any) {
      return { status: "unavailable", reason: e.message ?? "Unknown error" };
    }
  }

  update(
    activityId: string,
    props: CalorieTrackerUpdateProps
  ): CalorieTrackerUpdateResult {
    if (!this.isSupported()) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      nativeModule.updateCalorieTrackerActivity(
        activityId,
        props.caloriesConsumed,
        props.proteinConsumed,
        props.carbsConsumed,
        props.fatConsumed
      );
      return { status: "updated" };
    } catch (e: any) {
      return { status: "unavailable", reason: e.message ?? "Unknown error" };
    }
  }

  end(activityId: string): CalorieTrackerEndResult {
    if (!this.isSupported()) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      nativeModule.endCalorieTrackerActivity(activityId);
      return { status: "ended" };
    } catch (e: any) {
      return { status: "unavailable", reason: e.message ?? "Unknown error" };
    }
  }

  endAll(): void {
    if (!this.isSupported()) return;
    try {
      nativeModule.endAllCalorieTrackerActivities();
    } catch {
      // silently fail
    }
  }
}

export const calorieTrackerActivity = new CalorieTrackerActivityClient();
