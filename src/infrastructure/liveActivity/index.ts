/**
 * Live Activity — Public barrel export
 */

// ── Consumer API (feature code uses these) ──
export {
    getLiveActivityClient,
    liveActivity,
    setLiveActivityClient
} from "./liveActivity";

// ── Bootstrap (called once in CaloricProviders) ──
export { initLiveActivity, resetLiveActivity } from "./factory";

// ── Types ──
export type {
    LAEndResult,
    LAStartResult,
    LAUpdateResult,
    LiveActivityClient,
    LiveActivityProps
} from "./types";

// ── Implementations (swap in factory or tests) ──
export { ExpoWidgetsLiveActivityClient } from "./ExpoWidgetsLiveActivityClient";
export { NativeLiveActivityClient } from "./NativeLiveActivityClient";
export { NoopLiveActivityClient } from "./NoopLiveActivityClient";

// ── Fitness Activity (steps + calorie ring) ──
export { fitnessActivity } from "./FitnessActivity";
export type {
    FitnessActivityStartProps,
    FitnessActivityUpdateProps,
    FitnessEndResult,
    FitnessStartResult,
    FitnessUpdateResult
} from "./FitnessActivity";

// ── Pedometer Activity (real CMPedometer tracking) ──
export { pedometerActivity } from "./PedometerActivity";
export type {
    PedometerData,
    PedometerEndResult,
    PedometerStartProps,
    PedometerStartResult
} from "./PedometerActivity";

// ── Calorie Budget Activity (intake vs budget tracking) ──
export { calorieBudgetActivity } from "./CalorieBudgetActivity";
export type {
    CalorieBudgetEndResult,
    CalorieBudgetMode,
    CalorieBudgetStartProps,
    CalorieBudgetStartResult,
    CalorieBudgetUpdateProps,
    CalorieBudgetUpdateResult
} from "./CalorieBudgetActivity";

