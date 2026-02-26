/**
 * FitnessActivity — High-level JS API for the Fitness Live Activity
 *
 * Shows steps on the left and a calorie ring on the right
 * in the Dynamic Island and Lock Screen.
 *
 * Usage:
 *   import { fitnessActivity } from "../../infrastructure/liveActivity/FitnessActivity";
 *   const result = fitnessActivity.start({ calorieGoal: 2000, steps: 0, caloriesUsed: 0, distance: 0 });
 *   fitnessActivity.update(result.activityId, { steps: 3400, caloriesUsed: 420, distance: 2.1 });
 *   fitnessActivity.end(result.activityId);
 */

export interface FitnessActivityStartProps {
  calorieGoal: number;
  steps: number;
  caloriesUsed: number;
  distance: number; // km
}

export interface FitnessActivityUpdateProps {
  steps: number;
  caloriesUsed: number;
  distance: number; // km
}

export type FitnessStartResult =
  | { status: "started"; activityId: string }
  | { status: "unavailable"; reason: string }
  | { status: "denied"; reason: string };

export type FitnessUpdateResult =
  | { status: "updated" }
  | { status: "unavailable"; reason: string };

export type FitnessEndResult =
  | { status: "ended" }
  | { status: "unavailable"; reason: string };

// ── Lazy-load native module ──
let nativeModule: any = null;
let moduleAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requireNativeModule } = require("expo-modules-core");
  nativeModule = requireNativeModule("LiveActivityModule");
  moduleAvailable = typeof nativeModule?.startFitnessActivity === "function";
} catch {
  moduleAvailable = false;
}

class FitnessActivityClient {
  private readonly available: boolean;

  constructor() {
    this.available = moduleAvailable && this.checkSupport();
  }

  private checkSupport(): boolean {
    try {
      return nativeModule?.isSupported?.() === true;
    } catch {
      return false;
    }
  }

  isSupported(): boolean {
    return this.available;
  }

  start(props: FitnessActivityStartProps): FitnessStartResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      const activityId: string | null = nativeModule.startFitnessActivity(
        props.calorieGoal,
        props.steps,
        props.caloriesUsed,
        props.distance
      );

      if (typeof activityId === "string" && activityId.length > 0) {
        return { status: "started", activityId };
      }
      return {
        status: "denied",
        reason: "Live Activities denied or failed to start",
      };
    } catch (err: any) {
      console.warn("[FitnessActivity] start failed:", err?.message ?? err);
      return { status: "unavailable", reason: err?.message ?? "unknown error" };
    }
  }

  update(
    activityId: string,
    props: FitnessActivityUpdateProps
  ): FitnessUpdateResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      nativeModule.updateFitnessActivity(
        activityId,
        props.steps,
        props.caloriesUsed,
        props.distance
      );
      return { status: "updated" };
    } catch (err: any) {
      console.warn("[FitnessActivity] update failed:", err?.message ?? err);
      return { status: "unavailable", reason: err?.message ?? "unknown error" };
    }
  }

  end(activityId: string): FitnessEndResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      nativeModule.endFitnessActivity(activityId);
      return { status: "ended" };
    } catch (err: any) {
      console.warn("[FitnessActivity] end failed:", err?.message ?? err);
      return { status: "unavailable", reason: err?.message ?? "unknown error" };
    }
  }

  /**
   * End ALL active fitness activities.
   */
  endAll(): boolean {
    if (!this.available) return false;
    try {
      return nativeModule.endAllFitnessActivities?.() ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Query active fitness activities from ActivityKit.
   * Returns array with id, calorieGoal, steps, caloriesUsed, distance, activityState.
   */
  getActiveActivities(): Record<string, any>[] {
    if (!this.available) return [];
    try {
      return nativeModule.getActiveFitnessActivities?.() ?? [];
    } catch {
      return [];
    }
  }
}

/** Singleton — safe on Android / Expo Go (returns "unavailable" on every call) */
export const fitnessActivity = new FitnessActivityClient();
