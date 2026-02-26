/**
 * ExpoWidgetsLiveActivityClient
 *
 * The ONLY file that touches expo-widgets. Dynamic require so the app
 * doesn't crash if the native module isn't linked (Android, Expo Go).
 *
 * expo-widgets is alpha — every call is wrapped in try/catch.
 *
 * API references (from expo-widgets docs):
 *   startLiveActivity(name, component, url?) → string (activityId)
 *   updateLiveActivity(id, name, component)  → void
 *   // endLiveActivity is not yet exposed — we update with a "dismissed" state
 */

import type {
    LAEndResult,
    LAStartResult,
    LAUpdateResult,
    LiveActivityClient,
    LiveActivityProps,
} from "./types";

let expoWidgets: any = null;
let sdkAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  expoWidgets = require("expo-widgets");
  sdkAvailable =
    typeof expoWidgets?.startLiveActivity === "function" ||
    typeof expoWidgets?.default?.start === "function";
} catch {
  sdkAvailable = false;
}

export class ExpoWidgetsLiveActivityClient implements LiveActivityClient {
  private readonly available: boolean;

  constructor() {
    this.available = sdkAvailable;
  }

  start(name: string, props: LiveActivityProps, url?: string): LAStartResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "expo-widgets native module not available",
      };
    }

    try {
      // expo-widgets startLiveActivity returns the activity ID string
      const activityId = expoWidgets.startLiveActivity(name, props, url);
      if (typeof activityId === "string" && activityId.length > 0) {
        return { status: "started", activityId };
      }
      return {
        status: "unavailable",
        reason: "startLiveActivity returned no ID",
      };
    } catch (err: any) {
      console.warn("[LiveActivity] start failed:", err?.message ?? err);
      return { status: "unavailable", reason: err?.message ?? "unknown error" };
    }
  }

  update(
    activityId: string,
    name: string,
    props: LiveActivityProps
  ): LAUpdateResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "expo-widgets native module not available",
      };
    }

    try {
      expoWidgets.updateLiveActivity(activityId, name, props);
      return { status: "updated" };
    } catch (err: any) {
      console.warn("[LiveActivity] update failed:", err?.message ?? err);
      return { status: "unavailable", reason: err?.message ?? "unknown error" };
    }
  }

  end(activityId: string, name: string): LAEndResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "expo-widgets native module not available",
      };
    }

    try {
      // expo-widgets may not expose endLiveActivity yet —
      // use updateLiveActivity with a dismissed/ended marker as fallback
      if (typeof expoWidgets.endLiveActivity === "function") {
        expoWidgets.endLiveActivity(activityId, name);
      } else {
        // Graceful fallback: update with empty props to signal end
        expoWidgets.updateLiveActivity(activityId, name, { _ended: true });
      }
      return { status: "ended" };
    } catch (err: any) {
      console.warn("[LiveActivity] end failed:", err?.message ?? err);
      return { status: "unavailable", reason: err?.message ?? "unknown error" };
    }
  }

  isSupported(): boolean {
    return this.available;
  }
}
