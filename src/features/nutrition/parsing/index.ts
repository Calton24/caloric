// Parsing Module — barrel export
export type {
    ConfidenceInsight,
    FoodUnit,
    InputSource,
    ItemConfidence,
    ParseMethod,
    ParsedFoodItem,
    ParsedInput
} from "./food-candidate.schema";
export {
    configureLlmModel,
    isLocalLlmAvailable,
    isLocalLlmReady,
    parseImageWithLocalLlm
} from "./local-llm.service";
export { parseNutritionInput } from "./nutrition-parser.service";
export { parseWithRegex } from "./regex-parser";

