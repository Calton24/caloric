/**
 * NativeLiveActivityClient
 *
 * Bridges to the local Expo native module (modules/live-activity/).
 * This talks directly to iOS ActivityKit, making Live Activities appear
 * in the Dynamic Island and on the Lock Screen.
 *
 * Dynamic require so the app never crashes on Android / Expo Go.
 * Every call is wrapped in try/catch — Live Activities must NEVER crash the app.
 */

import type {
    LAEndResult,
    LAStartResult,
    LAUpdateResult,
    LiveActivityClient,
    LiveActivityProps,
} from "./types";

let nativeModule: any = null;
let moduleAvailable = false;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { requireNativeModule } = require("expo-modules-core");
  nativeModule = requireNativeModule("LiveActivityModule");
  moduleAvailable = typeof nativeModule?.isSupported === "function";
} catch {
  moduleAvailable = false;
}

export class NativeLiveActivityClient implements LiveActivityClient {
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

  start(name: string, props: LiveActivityProps, url?: string): LAStartResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      const title = String(props.title ?? name);
      const value = String(props.value ?? props.status ?? "");
      const icon = props.icon ? String(props.icon) : null;
      const subtitle = props.subtitle ? String(props.subtitle) : null;
      const progress =
        typeof props.progress === "number" ? props.progress : null;

      let activityId: string | null = null;

      // Use ETA variant if endTime is provided
      if (typeof props.endTime === "number") {
        activityId = nativeModule.startActivityWithETA(
          name,
          title,
          value,
          icon,
          subtitle,
          props.endTime
        );
      } else {
        activityId = nativeModule.startActivity(
          name,
          title,
          value,
          icon,
          subtitle,
          progress
        );
      }

      if (typeof activityId === "string" && activityId.length > 0) {
        return { status: "started", activityId };
      }
      return {
        status: "denied",
        reason: "Live Activities denied or failed to start",
      };
    } catch (err: any) {
      console.warn("[LiveActivity] native start failed:", err?.message ?? err);
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
        reason: "LiveActivityModule not available",
      };
    }

    try {
      const title = String(props.title ?? name);
      const value = String(props.value ?? props.status ?? "");
      const subtitle = props.subtitle ? String(props.subtitle) : null;
      const progress =
        typeof props.progress === "number" ? props.progress : null;

      // Use ETA variant if endTime is provided
      if (typeof props.endTime === "number") {
        nativeModule.updateActivityWithETA(
          activityId,
          title,
          value,
          subtitle,
          props.endTime
        );
      } else {
        nativeModule.updateActivity(
          activityId,
          title,
          value,
          subtitle,
          progress
        );
      }

      return { status: "updated" };
    } catch (err: any) {
      console.warn("[LiveActivity] native update failed:", err?.message ?? err);
      return { status: "unavailable", reason: err?.message ?? "unknown error" };
    }
  }

  end(activityId: string, _name: string): LAEndResult {
    if (!this.available) {
      return {
        status: "unavailable",
        reason: "LiveActivityModule not available",
      };
    }

    try {
      nativeModule.endActivity(activityId);
      return { status: "ended" };
    } catch (err: any) {
      console.warn("[LiveActivity] native end failed:", err?.message ?? err);
      return { status: "unavailable", reason: err?.message ?? "unknown error" };
    }
  }

  isSupported(): boolean {
    return this.available;
  }
}
