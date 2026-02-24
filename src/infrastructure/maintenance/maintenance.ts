/**
 * Maintenance — Singleton proxy
 *
 * Every maintenance check in the app goes through this module.
 * The backing client is swapped via setMaintenanceClient() at bootstrap;
 * until then all calls silently return { mode: "normal" }.
 *
 * State resolution priority:
 *   1. Local override (setLocalOverride)  — manual "force maintenance" wins
 *   2. Outage monitor state               — auto-detected Supabase down
 *   3. Provider state (RemoteJson / PostHog / Noop)
 *
 * Every method wraps in try/catch — maintenance must NEVER crash the app.
 */

import { NoopMaintenanceClient } from "./NoopMaintenanceClient";
import type { SupabaseHealthMonitor } from "./SupabaseHealthMonitor";
import {
    DEFAULT_MAINTENANCE_STATE,
    MAINTENANCE_OVERRIDE_KEY,
    VALID_MODES,
    type MaintenanceClient,
    type MaintenanceMode,
    type MaintenanceState,
} from "./types";

function getAsyncStorage(): any {
  try {
    return require("@react-native-async-storage/async-storage").default;
  } catch {
    return null;
  }
}

/**
 * Features implicitly blocked when reason === "supabase_unreachable".
 * These are operations that require Supabase to succeed — blocking them
 * prevents confusing errors when the backend is known to be down.
 */
export const IMPLICIT_SUPABASE_BLOCKS: readonly string[] = [
  "writes",
  "uploads",
  "growth",
  "realtime",
];

let client: MaintenanceClient = new NoopMaintenanceClient();
let healthMonitor: SupabaseHealthMonitor | null = null;
let localOverride: MaintenanceState | null = null;

// ── Transition logging (non-spam) ──
let lastLoggedMode: string | undefined;
let lastLoggedReason: string | undefined;

/**
 * Log ONLY when mode or reason actually changes.
 * Format: [Maintenance] state_changed mode=<mode> reason=<reason> blocked=<csv or "none">
 * Never logs secrets or URLs.
 */
function logTransition(
  prev: { mode?: string; reason?: string },
  next: MaintenanceState
): void {
  if (prev.mode === next.mode && prev.reason === next.reason) return;

  const blocked =
    next.blockedFeatures && next.blockedFeatures.length > 0
      ? next.blockedFeatures.join(",")
      : "none";

  console.log(
    `[Maintenance] state_changed mode=${next.mode} reason=${next.reason ?? "none"} blocked=${blocked}`
  );
}

// ── Subscriber management ──
type Listener = (state: MaintenanceState) => void;
const listeners = new Set<Listener>();

function notifyListeners(state: MaintenanceState): void {
  // Log on transitions
  logTransition(
    { mode: lastLoggedMode, reason: lastLoggedReason },
    state
  );
  lastLoggedMode = state.mode;
  lastLoggedReason = state.reason;

  for (const fn of listeners) {
    try {
      fn(state);
    } catch {
      // listener error must not crash proxy
    }
  }
}

/** Replace the backing maintenance implementation (call once at startup). */
export function setMaintenanceClient(newClient: MaintenanceClient): void {
  client = newClient;
}

/** Retrieve the current client (testing). */
export function getMaintenanceClient(): MaintenanceClient {
  return client;
}

/** Attach the optional outage monitor (called by factory). */
export function setHealthMonitor(monitor: SupabaseHealthMonitor | null): void {
  healthMonitor = monitor;
}

/** Retrieve the current outage monitor (testing). */
export function getHealthMonitor(): SupabaseHealthMonitor | null {
  return healthMonitor;
}

/**
 * Resolve the effective state respecting priority:
 *   local override > outage monitor > provider
 */
async function resolveState(): Promise<MaintenanceState> {
  // 1. Local override wins
  if (localOverride && localOverride.mode !== "normal") {
    return localOverride;
  }

  // 2. Outage monitor escalation
  if (healthMonitor) {
    const monitorState = healthMonitor.getState();
    if (monitorState.mode !== "normal") {
      return monitorState;
    }
  }

  // 3. Provider state
  return client.getState();
}

/**
 * Public maintenance API — import this from feature code.
 *
 * @example
 * ```ts
 * import { maintenance } from "@/infrastructure/maintenance";
 * const state = await maintenance.getState();
 * if (state.mode === "maintenance") showMaintenanceScreen();
 * ```
 */
export const maintenance = {
  async getState(): Promise<MaintenanceState> {
    try {
      const state = await resolveState();
      // Log on transitions even if nobody called subscribe
      logTransition(
        { mode: lastLoggedMode, reason: lastLoggedReason },
        state
      );
      lastLoggedMode = state.mode;
      lastLoggedReason = state.reason;
      return state;
    } catch (error) {
      console.warn("[Maintenance] getState failed:", error);
      return { ...DEFAULT_MAINTENANCE_STATE, updatedAt: Date.now() };
    }
  },

  /**
   * Check whether a feature is blocked.
   * Returns true when:
   *   - mode === "maintenance" (everything blocked)
   *   - feature is listed in blockedFeatures
   *   - reason === "supabase_unreachable" and feature is in IMPLICIT_SUPABASE_BLOCKS
   */
  isBlocked(feature: string): boolean {
    try {
      // Use the last known resolved state synchronously
      const state = localOverride && localOverride.mode !== "normal"
        ? localOverride
        : healthMonitor && healthMonitor.getState().mode !== "normal"
          ? healthMonitor.getState()
          : null;

      // If no override/monitor, fall back to provider's cached last state
      const effective = state ?? { mode: "normal" as MaintenanceMode };

      if (effective.mode === "maintenance") return true;
      if (effective.blockedFeatures?.includes(feature)) return true;
      if (
        effective.reason === "supabase_unreachable" &&
        IMPLICIT_SUPABASE_BLOCKS.includes(feature)
      ) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /**
   * Apply a manual local override. Pass null to clear.
   * Persists to AsyncStorage so it survives restarts.
   */
  async setLocalOverride(
    state: MaintenanceState | null
  ): Promise<void> {
    try {
      localOverride = state;
      const storage = getAsyncStorage();
      if (storage) {
        if (state) {
          await storage.setItem(
            MAINTENANCE_OVERRIDE_KEY,
            JSON.stringify(state)
          );
        } else {
          await storage.removeItem(MAINTENANCE_OVERRIDE_KEY);
        }
      }
      // Notify listeners of the change
      const resolved = await resolveState();
      notifyListeners(resolved);
    } catch (error) {
      console.warn("[Maintenance] setLocalOverride failed:", error);
    }
  },

  /**
   * Subscribe to state changes. Returns unsubscribe fn.
   * State changes are emitted when:
   *   - setLocalOverride is called
   *   - outage monitor transitions
   */
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

/**
 * Load persisted local override from AsyncStorage on boot.
 * Called by factory during init. Never throws.
 */
export async function loadPersistedOverride(): Promise<void> {
  try {
    const storage = getAsyncStorage();
    if (!storage) return;
    const raw = await storage.getItem(MAINTENANCE_OVERRIDE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.mode === "string" &&
      VALID_MODES.includes(parsed.mode as MaintenanceMode)
    ) {
      localOverride = parsed as MaintenanceState;
    }
  } catch {
    // Corrupt override — ignore
  }
}

/**
 * Reset everything — testing only.
 */
export function resetProxy(): void {
  client = new NoopMaintenanceClient();
  healthMonitor = null;
  localOverride = null;
  listeners.clear();
  lastLoggedMode = undefined;
  lastLoggedReason = undefined;
}
