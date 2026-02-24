/**
 * CalorieBudgetActivity — High-level JS API for the Calorie Budget Live Activity
 *
 * Tracks daily calorie intake vs. budget (base goal + activity bonus)
 * in the Dynamic Island and Lock Screen.
 *
 * Usage:
 *   import { calorieBudgetActivity } from "../../infrastructure/liveActivity/CalorieBudgetActivity";
 *   const result = calorieBudgetActivity.start({ baseGoal: 2000, consumed: 0, activityBonus: 0 });
 *   calorieBudgetActivity.update(result.activityId, { consumed: 800, activityBonus: 200 });
 *   calorieBudgetActivity.end(result.activityId);
 */

export type CalorieBudgetMode = "strict" | "adaptive";

export interface CalorieBudgetStartProps {
  baseGoal: number;
  consumed?: number;
  activityBonus?: number;
  /** "strict" = budget is baseGoal only, "adaptive" = baseGoal + activityBonus */
  mode?: CalorieBudgetMode;
}

export interface CalorieBudgetUpdateProps {
  consumed: number;
  activityBonus: number;
}

export type CalorieBudgetStartResult =
  | { status: "started"; activityId: string }
  | { status: "unavailable"; reason: string }
  | { status: "denied"; reason: string };

export type CalorieBudgetUpdateResult =
  | { status: "updated" }
  | { status: "unavailable"; reason: string };

export type CalorieBudgetEndResult =
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
    typeof nativeModule?.startCalorieBudgetActivity === "function";
} catch {
  moduleAvailable = false;
}

class CalorieBudgetActivityClient {
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

  start(props: CalorieBudgetStartProps): CalorieBudgetStartResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      const activityId: string | null = nativeModule.startCalorieBudgetActivity(
        props.baseGoal,
        props.consumed ?? 0,
        props.activityBonus ?? 0,
        props.mode ?? "adaptive"
      );

      if (typeof activityId === "string" && activityId.length > 0) {
        return { status: "started", activityId };
      }
      return {
        status: "denied",
        reason: "Live Activities denied or failed to start",
      };
    } catch (err: any) {
      console.warn(
        "[CalorieBudgetActivity] start failed:",
        err?.message ?? err
      );
      return { status: "unavailable", reason: err?.message ?? "unknown error" };
    }
  }

  update(
    activityId: string,
    props: CalorieBudgetUpdateProps
  ): CalorieBudgetUpdateResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      nativeModule.updateCalorieBudgetActivity(
        activityId,
        props.consumed,
        props.activityBonus
      );
      return { status: "updated" };
    } catch (err: any) {
      console.warn(
        "[CalorieBudgetActivity] update failed:",
        err?.message ?? err
      );
      return { status: "unavailable", reason: err?.message ?? "unknown error" };
    }
  }

  end(activityId: string): CalorieBudgetEndResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      nativeModule.endCalorieBudgetActivity(activityId);
      return { status: "ended" };
    } catch (err: any) {
      console.warn("[CalorieBudgetActivity] end failed:", err?.message ?? err);
      return { status: "unavailable", reason: err?.message ?? "unknown error" };
    }
  }

  /**
   * End ALL active calorie budget activities.
   */
  endAll(): boolean {
    if (!this.available) return false;
    try {
      return nativeModule.endAllCalorieBudgetActivities?.() ?? false;
    } catch {
      return false;
    }
  }

  /**
   * Query active calorie budget activities from ActivityKit.
   * Returns array with id, baseGoal, consumed, activityBonus, activityState.
   */
  getActiveActivities(): Record<string, any>[] {
    if (!this.available) return [];
    try {
      return nativeModule.getActiveCalorieBudgetActivities?.() ?? [];
    } catch {
      return [];
    }
  }
}

/** Singleton — safe on Android / Expo Go (returns "unavailable" on every call) */
export const calorieBudgetActivity = new CalorieBudgetActivityClient();
