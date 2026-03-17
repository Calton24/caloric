// Matching Module — barrel export
export {
    matchFoodItem,
    matchFoodItemLocally,
    matchFoodItems
} from "./food-matcher.service";
export type {
    FoodMatch, MatchedFoodItem, MatchSource, NutrientProfile
} from "./matching.types";
export { lookupBarcode, searchOpenFoodFacts } from "./openfoodfacts.service";
export {
    clearFoodRegion,
    getFoodRegion,
    getFoodRegionSync,
    initFoodRegion,
    setFoodRegion
} from "./region.service";
export { searchUsda } from "./usda.service";

