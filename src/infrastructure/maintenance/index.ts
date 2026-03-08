/**
 * Maintenance — Public barrel export
 */

// ── Consumer API (feature code uses these) ──
export {
    IMPLICIT_SUPABASE_BLOCKS, getMaintenanceClient, maintenance,
    resetProxy,
    setHealthMonitor,
    setMaintenanceClient
} from "./maintenance";

// ── Bootstrap (called once in CaloricProviders) ──
export { getMonitor, initMaintenance, resetMaintenance } from "./factory";

// ── Health monitor ──
export { getHealthMonitor } from "./maintenance";
export { SupabaseHealthMonitor } from "./SupabaseHealthMonitor";

// ── Types ──
export {
    DEFAULT_MAINTENANCE_STATE,
    MAINTENANCE_CACHE_KEY,
    MAINTENANCE_OVERRIDE_KEY,
    VALID_MODES,
    VALID_REASONS
} from "./types";
export type {
    MaintenanceClient,
    MaintenanceMode,
    MaintenanceReason,
    MaintenanceState
} from "./types";

// ── Components ──
export { MaintenanceGate, useMaintenanceState } from "./MaintenanceGate";

// ── Implementations (swap in factory or tests) ──
export { NoopMaintenanceClient } from "./NoopMaintenanceClient";
export { PostHogMaintenanceClient } from "./PostHogMaintenanceClient";
export { RemoteJsonMaintenanceClient } from "./RemoteJsonMaintenanceClient";

