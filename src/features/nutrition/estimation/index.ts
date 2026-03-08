// Estimation Module — barrel export
export {
    CONFIDENCE_HIGH,
    CONFIDENCE_LOW,
    CONFIDENCE_NEEDS_REVIEW,
    computeOverallConfidence,
    getAmbiguityReason,
    scoreMatchConfidence,
    scoreParserConfidence,
    scorePortionConfidence
} from "./confidence.service";
export type {
    EstimatedFoodItem,
    MealEstimate,
    SavedFoodItem
} from "./estimation.types";
export { estimateFoodItem, estimateMeal } from "./portion-estimator.service";

