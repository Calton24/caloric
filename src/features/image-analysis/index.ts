/**
 * Image Analysis Module
 *
 * Multi-stage pipeline for food image analysis:
 *   Triage → Extract → Route → Match → Estimate → Compose
 */

export {
    buildPortionOptions,
    calculatePortionNutrients
} from "./estimation/portion-estimator.service";
export {
    buildSearchQuery,
    extractProductInfo
} from "./extraction/packaged-product-extractor";
export { classifyFood } from "./extraction/vision-classifier.service";
export { matchPackagedProduct } from "./matching/packaged-product-matcher";
export { extractTextFromImage } from "./ocr/text-recognition.service";
export { analyzeImage } from "./pipeline";
export { chooseMatchRoute } from "./routing/source-router.service";
export { triageImage } from "./triage/image-triage.service";

export type {
    EvidenceBundle,
    ImageAnalysisResult,
    ImageType,
    MatchRoute,
    OcrExtraction,
    PortionOption,
    PortionPreset,
    ProductCandidate,
    TriageResult,
    VisualClassification
} from "./types";

