/**
 * PedometerActivity — High-level JS API for the Pedometer Live Activity
 *
 * Uses CMPedometer on iOS to track real steps, distance, floors,
 * and pace, then pushes updates to a Live Activity in real time.
 *
 * Usage:
 *   import { pedometerActivity } from "../../infrastructure/liveActivity/PedometerActivity";
 *   const result = pedometerActivity.start({ stepGoal: 10000 });
 *   const data = pedometerActivity.getData();
 *   pedometerActivity.end();
 */

export interface PedometerStartProps {
  stepGoal: number;
}

export type PedometerStartResult =
  | { status: "started"; activityId: string }
  | { status: "unavailable"; reason: string }
  | { status: "denied"; reason: string };

export type PedometerEndResult =
  | { status: "ended" }
  | { status: "unavailable"; reason: string };

export interface PedometerData {
  activityId: string;
  steps: number;
  distance: number; // meters
  floorsAscended: number;
  pace: number; // steps per minute
  stepGoal: number;
  elapsedSeconds: number;
}

// ── Lazy-load native module ──
let nativeModule: any = null;
let moduleAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requireNativeModule } = require("expo-modules-core");
  nativeModule = requireNativeModule("LiveActivityModule");
  moduleAvailable = typeof nativeModule?.startPedometerActivity === "function";
} catch {
  moduleAvailable = false;
}

class PedometerActivityClient {
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

  isPedometerAvailable(): boolean {
    if (!this.available) return false;
    try {
      return nativeModule.isPedometerAvailable?.() === true;
    } catch {
      return false;
    }
  }

  isTracking(): boolean {
    if (!this.available) return false;
    try {
      return nativeModule.isPedometerTracking?.() === true;
    } catch {
      return false;
    }
  }

  start(props: PedometerStartProps): PedometerStartResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    if (!this.isPedometerAvailable()) {
      return {
        status: "unavailable",
        reason: "CMPedometer not available on this device",
      };
    }

    try {
      const activityId: string | null = nativeModule.startPedometerActivity(
        props.stepGoal
      );

      if (typeof activityId === "string" && activityId.length > 0) {
        return { status: "started", activityId };
      }
      return {
        status: "denied",
        reason: "Live Activities denied or failed to start",
      };
    } catch (err: any) {
      console.warn("[PedometerActivity] start failed:", err?.message ?? err);
      return {
        status: "unavailable",
        reason: err?.message ?? "unknown error",
      };
    }
  }

  getData(): PedometerData | null {
    if (!this.available) return null;

    try {
      const data = nativeModule.getPedometerData?.();
      if (data && typeof data.activityId === "string") {
        return data as PedometerData;
      }
      return null;
    } catch (err: any) {
      console.warn("[PedometerActivity] getData failed:", err?.message ?? err);
      return null;
    }
  }

  end(): PedometerEndResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      nativeModule.endPedometerActivity();
      return { status: "ended" };
    } catch (err: any) {
      console.warn("[PedometerActivity] end failed:", err?.message ?? err);
      return {
        status: "unavailable",
        reason: err?.message ?? "unknown error",
      };
    }
  }

  endAll(): boolean {
    if (!this.available) return false;
    try {
      return nativeModule.endAllPedometerActivities?.() ?? false;
    } catch {
      return false;
    }
  }

  getActiveActivities(): Record<string, any>[] {
    if (!this.available) return [];
    try {
      return nativeModule.getActivePedometerActivities?.() ?? [];
    } catch {
      return [];
    }
  }
}

/** Singleton — safe on Android / Expo Go (returns "unavailable" on every call) */
export const pedometerActivity = new PedometerActivityClient();
