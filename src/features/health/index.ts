// Health Feature — barrel export
export {
    exportMealsToHealthKit,
    exportWeightToHealthKit,
    importWeightFromHealthKit,
    syncWithHealthKit
} from "./health-sync.service";
export { getHealthService, resetHealthService } from "./health.factory";
export type {
    HealthKitNutritionSample,
    HealthKitWeightSample,
    HealthService,
    WriteDietaryEnergySampleInput,
} from "./health.types";
export {
    buildAppleHealthFoodPayload,
    toWriteDietaryEnergySampleInput,
} from "./apple-health-food.adapter";
export {
    buildWriteDietaryEnergySampleInputFromMeal,
    type MealForHealthKit,
} from "./healthkitFoodPayload";
export {
    isHealthKitFoodWriteExplicitlyEnabled,
    saveFoodToAppleHealthSafely,
} from "./save-food-to-apple-health-safely";
export { useHealthAutoSync } from "./use-health-auto-sync";

