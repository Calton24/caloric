// Nutrition Feature — barrel export

// ── Legacy parser (kept for backward compat) ──
export { parseMealInput } from "./nutrition-parser.service";

// ── New pipeline ──
export {
    mealEstimateToDraft,
    runNutritionPipeline
} from "./nutrition-pipeline";
export type { PipelineOptions } from "./nutrition-pipeline";

// ── Parsing ──
export { parseNutritionInput, parseWithRegex } from "./parsing";
export type {
    FoodUnit,
    InputSource,
    ParseMethod,
    ParsedFoodItem,
    ParsedInput
} from "./parsing";

// ── Matching ──
export {
    matchFoodItem,
    matchFoodItemLocally,
    matchFoodItems
} from "./matching";
export type { FoodMatch, MatchedFoodItem, NutrientProfile } from "./matching";

// ── Estimation ──
export {
    CONFIDENCE_HIGH,
    CONFIDENCE_LOW,
    CONFIDENCE_NEEDS_REVIEW,
    estimateFoodItem,
    estimateMeal
} from "./estimation";
export type {
    EstimatedFoodItem,
    MealEstimate,
    SavedFoodItem
} from "./estimation";

// ── Image ──
export { captionFoodImage } from "./image";
export type { ImageCaptionResult } from "./image";

// ── Draft / Confirmation ──
export { useNutritionDraftStore } from "./nutrition.draft.store";
export type { MealDraft } from "./nutrition.draft.types";
export { buildMealEntryFromDraft } from "./nutrition.helpers";
export { useLoggingFlow } from "./use-logging-flow";

// ── Storage ──
export { getMealsForDate, getNutritionTotals } from "./nutrition.selectors";
export { useNutritionStore } from "./nutrition.store";
export type {
    DailyNutritionSummary,
    MealEntry,
    MealSource
} from "./nutrition.types";

