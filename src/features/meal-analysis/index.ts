/**
 * Meal Analysis Module
 *
 * AI-powered food image analysis pipeline using gpt-4o-mini.
 * Decomposes meal photos into individual food components with
 * estimated portions and resolved nutrition data.
 */

export { MealAnalysisError, analyzeMealImage } from "./meal-analysis.service";
export type {
    MealAnalysisErrorCode,
    MealAnalysisResultWithMeta
} from "./meal-analysis.service";

export { resolveDecomposition } from "./nutrition-resolver.service";

export { isSameFood, normalizeFood } from "./food-normalizer.service";

export { applyPortionGuardrails } from "./portion-reference.service";
export type { PortionGuardrailResult } from "./portion-reference.service";

export { useMealAnalysis } from "./use-meal-analysis";
export type { ItemUpdate, MealAnalysisHook } from "./use-meal-analysis";

export {
    buildTelemetryUpdate,
    computeCorrectionCounts, finalizeScanEvent,
    persistCorrections
} from "./vision-telemetry.service";

export type {
    AnalysisState,
    AnalyzeMealRequest,
    AnalyzeMealResponse,
    ConfidenceBand,
    CorrectionType,
    DetectedFoodComponent,
    MealAnalysisResult,
    MealDecomposition,
    ResolvedFoodItem,
    ScanTelemetryUpdate,
    VisionCorrectionRecord
} from "./meal-analysis.types";

