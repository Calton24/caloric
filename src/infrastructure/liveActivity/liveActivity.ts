/**
 * Live Activity — Singleton proxy
 *
 * Every Live Activity call in the app goes through this module.
 * The backing client is swapped via setLiveActivityClient() at bootstrap;
 * until then all calls silently return "unavailable".
 *
 * Every method wraps in try/catch — Live Activities must NEVER crash the app.
 */

import { NoopLiveActivityClient } from "./NoopLiveActivityClient";
import type {
    LAEndResult,
    LAStartResult,
    LAUpdateResult,
    LiveActivityClient,
    LiveActivityProps,
} from "./types";

let client: LiveActivityClient = new NoopLiveActivityClient();

/** Replace the backing Live Activity implementation (call once at startup). */
export function setLiveActivityClient(newClient: LiveActivityClient): void {
  client = newClient;
}

/** Retrieve the current client (testing). */
export function getLiveActivityClient(): LiveActivityClient {
  return client;
}

/**
 * Public Live Activity API — import this from feature code.
 *
 * @example
 * ```ts
 * import { liveActivity } from "@/infrastructure/liveActivity";
 * const result = liveActivity.start("DeliveryActivity", { etaMinutes: 15, status: "On the way" });
 * if (result.status === "started") {
 *   liveActivity.update(result.activityId, "DeliveryActivity", { etaMinutes: 5 });
 *   liveActivity.end(result.activityId, "DeliveryActivity");
 * }
 * ```
 */
export const liveActivity = {
  start(name: string, props: LiveActivityProps, url?: string): LAStartResult {
    try {
      return client.start(name, props, url);
    } catch (error) {
      console.warn("[LiveActivity] start failed:", error);
      return { status: "unavailable", reason: "proxy catch" };
    }
  },

  update(
    activityId: string,
    name: string,
    props: LiveActivityProps
  ): LAUpdateResult {
    try {
      return client.update(activityId, name, props);
    } catch (error) {
      console.warn("[LiveActivity] update failed:", error);
      return { status: "unavailable", reason: "proxy catch" };
    }
  },

  end(activityId: string, name: string): LAEndResult {
    try {
      return client.end(activityId, name);
    } catch (error) {
      console.warn("[LiveActivity] end failed:", error);
      return { status: "unavailable", reason: "proxy catch" };
    }
  },

  isSupported(): boolean {
    try {
      return client.isSupported();
    } catch {
      return false;
    }
  },
};
