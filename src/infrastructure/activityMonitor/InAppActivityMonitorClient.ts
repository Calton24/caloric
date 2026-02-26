/**
 * InAppActivityMonitorClient — Phase 1
 *
 * Stores activity state in memory. Never crashes.
 * Phase 2: liveActivity infra (expo-widgets) provides real iOS Live Activities.
 */

import { activityStore } from "./store";
import type {
    ActivityMonitorClient,
    ActivityPayload,
    ActivityState,
    EndResult,
    StartResult,
    UpdateResult,
} from "./types";

export class InAppActivityMonitorClient implements ActivityMonitorClient {
  start(activityId: string, payload: ActivityPayload): StartResult {
    try {
      activityStore.set(activityId, payload);
      return "started";
    } catch (err) {
      console.warn("[Activity] start failed:", err);
      return "unavailable";
    }
  }

  update(activityId: string, payload: ActivityPayload): UpdateResult {
    try {
      const existing = activityStore.get(activityId);
      if (!existing) return "unavailable";
      activityStore.set(activityId, payload);
      return "updated";
    } catch (err) {
      console.warn("[Activity] update failed:", err);
      return "unavailable";
    }
  }

  end(activityId: string): EndResult {
    try {
      const removed = activityStore.remove(activityId);
      return removed ? "ended" : "unavailable";
    } catch (err) {
      console.warn("[Activity] end failed:", err);
      return "unavailable";
    }
  }

  isSupported(): boolean {
    return true;
  }

  getAll(): ActivityState[] {
    return activityStore.getAll();
  }

  get(activityId: string): ActivityState | null {
    return activityStore.get(activityId);
  }
}
