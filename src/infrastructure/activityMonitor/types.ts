/**
 * Activity Monitor — Contract
 *
 * Abstraction over iOS Live Activities / in-app activity tracking.
 * No React Native types. No Expo types. Pure contract.
 *
 * Phase 1: InAppActivityMonitorClient (memory-only)
 * Phase 2: Bridges to liveActivity infra (expo-widgets) for real iOS Live Activities
 */

// ---------- Payload types ----------

export interface StepsPayload {
  type: "steps";
  current: number;
  goal: number;
  label?: string;
}

export interface EtaPayload {
  type: "eta";
  /** ISO 8601 timestamp */
  estimatedArrival: string;
  label?: string;
  status?: string;
}

export interface TimerPayload {
  type: "timer";
  /** Duration in seconds */
  totalSeconds: number;
  /** Elapsed in seconds */
  elapsedSeconds: number;
  label?: string;
}

export interface ProgressPayload {
  type: "progress";
  /** 0..1 */
  progress: number;
  label?: string;
  status?: string;
}

export type ActivityPayload =
  | StepsPayload
  | EtaPayload
  | TimerPayload
  | ProgressPayload;

// ---------- Result types ----------

export type StartResult = "started" | "unavailable" | "denied";
export type UpdateResult = "updated" | "unavailable";
export type EndResult = "ended" | "unavailable";

// ---------- Activity state ----------

export interface ActivityState {
  id: string;
  payload: ActivityPayload;
  startedAt: number; // Date.now()
  updatedAt: number;
}

// ---------- Client contract ----------

export interface ActivityMonitorClient {
  /** Start a new activity */
  start(activityId: string, payload: ActivityPayload): StartResult;

  /** Update an existing activity */
  update(activityId: string, payload: ActivityPayload): UpdateResult;

  /** End an activity */
  end(activityId: string): EndResult;

  /** Whether this provider supports activities at all */
  isSupported(): boolean;

  /** Get all current activities (for dev panel) */
  getAll(): ActivityState[];

  /** Get a single activity by ID */
  get(activityId: string): ActivityState | null;
}
