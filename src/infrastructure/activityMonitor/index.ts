/**
 * Activity Monitor — Public barrel export
 */

// ── Consumer API (feature code uses these) ──
export {
    activityMonitor,
    getActivityMonitorClient,
    setActivityMonitorClient
} from "./activityMonitor";

// ── Bootstrap (called once in MobileCoreProviders) ──
export { initActivityMonitor, resetActivityMonitor } from "./factory";

// ── Store (for dev panels) ──
export { activityStore } from "./store";

// ── Types ──
export type {
    ActivityMonitorClient,
    ActivityPayload,
    ActivityState,
    EndResult,
    EtaPayload,
    ProgressPayload,
    StartResult,
    StepsPayload,
    TimerPayload,
    UpdateResult
} from "./types";

// ── Implementations (swap in factory or tests) ──
export { InAppActivityMonitorClient } from "./InAppActivityMonitorClient";
export { NoopActivityMonitorClient } from "./NoopActivityMonitorClient";

