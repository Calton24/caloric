/**
 * Activity Monitor — In-memory store
 *
 * Simple Map-backed store for current activity state.
 * Shared between InAppActivityMonitorClient and dev panels.
 */

import type { ActivityPayload, ActivityState } from "./types";

const activities = new Map<string, ActivityState>();

export const activityStore = {
  set(id: string, payload: ActivityPayload): ActivityState {
    const now = Date.now();
    const existing = activities.get(id);
    const state: ActivityState = {
      id,
      payload,
      startedAt: existing?.startedAt ?? now,
      updatedAt: now,
    };
    activities.set(id, state);
    return state;
  },

  get(id: string): ActivityState | null {
    return activities.get(id) ?? null;
  },

  remove(id: string): boolean {
    return activities.delete(id);
  },

  getAll(): ActivityState[] {
    return Array.from(activities.values());
  },

  clear(): void {
    activities.clear();
  },
};
