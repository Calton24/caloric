/**
 * NoopActivityMonitorClient
 * Safe default — always returns "unavailable".
 * Used when activityMonitor is disabled by config.
 */

import type {
    ActivityMonitorClient,
    ActivityPayload,
    ActivityState,
    EndResult,
    StartResult,
    UpdateResult,
} from "./types";

export class NoopActivityMonitorClient implements ActivityMonitorClient {
  start(_activityId: string, _payload: ActivityPayload): StartResult {
    return "unavailable";
  }

  update(_activityId: string, _payload: ActivityPayload): UpdateResult {
    return "unavailable";
  }

  end(_activityId: string): EndResult {
    return "unavailable";
  }

  isSupported(): boolean {
    return false;
  }

  getAll(): ActivityState[] {
    return [];
  }

  get(_activityId: string): ActivityState | null {
    return null;
  }
}
