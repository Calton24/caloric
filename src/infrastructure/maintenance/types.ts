/**
 * Maintenance — Contract
 *
 * Defines the maintenance mode types and the client interface
 * that all providers must implement.
 *
 * The system is resilient by design:
 *   - Always resolves (never throws)
 *   - Falls back to { mode: "normal" } on any failure
 *   - Caches last good state in AsyncStorage
 *   - Never blocks app boot
 */

// ── Maintenance mode levels ──

export type MaintenanceMode =
  | "normal"
  | "degraded"
  | "read_only"
  | "maintenance";

/** Why did we enter this mode? */
export type MaintenanceReason =
  | "manual_override"
  | "supabase_unreachable"
  | "network_unreachable"
  | "unknown";

// ── State shape returned by all providers ──

export type MaintenanceState = {
  /** Current operational mode */
  mode: MaintenanceMode;
  /** Optional human-readable message to display */
  message?: string;
  /** Feature keys to force-disable regardless of config */
  blockedFeatures?: string[];
  /** ISO 8601 timestamp — estimated end of maintenance window */
  until?: string;
  /** Why we are in this mode */
  reason?: MaintenanceReason;
  /** Unix ms — when this state was last resolved */
  updatedAt?: number;
};

// ── Provider contract ──

export interface MaintenanceClient {
  /** Resolve current maintenance state. Must never throw. */
  getState(): Promise<MaintenanceState>;

  /**
   * Apply a local override (persisted to AsyncStorage).
   * Pass null to clear the override.
   */
  setLocalOverride?(state: MaintenanceState | null): Promise<void>;

  /**
   * Subscribe to state changes (optional — polling is fine too).
   * Returns an unsubscribe function.
   */
  subscribe?(listener: (state: MaintenanceState) => void): () => void;
}

// ── Shared constants ──

/** Local default — used when no remote state is available */
export const DEFAULT_MAINTENANCE_STATE: MaintenanceState = {
  mode: "normal",
  updatedAt: Date.now(),
};

/** AsyncStorage key for caching last successful remote state */
export const MAINTENANCE_CACHE_KEY = "@mobile_core/maintenance_state";

/** AsyncStorage key for local override */
export const MAINTENANCE_OVERRIDE_KEY = "@mobile_core/maintenance_override";

/** Valid mode values for runtime validation */
export const VALID_MODES: MaintenanceMode[] = [
  "normal",
  "degraded",
  "read_only",
  "maintenance",
];

/** Valid reason values for runtime validation */
export const VALID_REASONS: MaintenanceReason[] = [
  "manual_override",
  "supabase_unreachable",
  "network_unreachable",
  "unknown",
];
