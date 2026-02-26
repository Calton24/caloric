/**
 * Activity Monitor — Singleton proxy
 *
 * Every activity call in the app goes through this module.
 * The backing client is swapped via setActivityMonitorClient() at bootstrap;
 * until then all calls silently return "unavailable".
 *
 * Every method wraps in try/catch — activities must NEVER crash the app.
 */

import { NoopActivityMonitorClient } from "./NoopActivityMonitorClient";
import type {
    ActivityMonitorClient,
    ActivityPayload,
    ActivityState,
    EndResult,
    StartResult,
    UpdateResult,
} from "./types";

let client: ActivityMonitorClient = new NoopActivityMonitorClient();

/** Replace the backing activity monitor implementation (call once at startup). */
export function setActivityMonitorClient(
  newClient: ActivityMonitorClient
): void {
  client = newClient;
}

/** Retrieve the current client (testing). */
export function getActivityMonitorClient(): ActivityMonitorClient {
  return client;
}

/**
 * Public activity monitor API — import this from feature code.
 *
 * @example
 * ```ts
 * import { activityMonitor } from "@/infrastructure/activityMonitor";
 * activityMonitor.start("steps-1", { type: "steps", current: 500, goal: 10000 });
 * activityMonitor.update("steps-1", { type: "steps", current: 750, goal: 10000 });
 * activityMonitor.end("steps-1");
 * ```
 */
export const activityMonitor = {
  start(activityId: string, payload: ActivityPayload): StartResult {
    try {
      return client.start(activityId, payload);
    } catch (error) {
      console.warn("[Activity] start failed:", error);
      return "unavailable";
    }
  },

  update(activityId: string, payload: ActivityPayload): UpdateResult {
    try {
      return client.update(activityId, payload);
    } catch (error) {
      console.warn("[Activity] update failed:", error);
      return "unavailable";
    }
  },

  end(activityId: string): EndResult {
    try {
      return client.end(activityId);
    } catch (error) {
      console.warn("[Activity] end failed:", error);
      return "unavailable";
    }
  },

  isSupported(): boolean {
    try {
      return client.isSupported();
    } catch {
      return false;
    }
  },

  getAll(): ActivityState[] {
    try {
      return client.getAll();
    } catch {
      return [];
    }
  },

  get(activityId: string): ActivityState | null {
    try {
      return client.get(activityId);
    } catch {
      return null;
    }
  },
};
