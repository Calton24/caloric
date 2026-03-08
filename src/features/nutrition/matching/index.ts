// Matching Module — barrel export
export {
    matchFoodItem,
    matchFoodItemLocally,
    matchFoodItems
} from "./food-matcher.service";
export type {
    FoodMatch, MatchSource, MatchedFoodItem, NutrientProfile
} from "./matching.types";
export { lookupBarcode, searchOpenFoodFacts } from "./openfoodfacts.service";
export { searchUsda } from "./usda.service";

