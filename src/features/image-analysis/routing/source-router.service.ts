/**
 * Source Router
 *
 * Stage 3 of the image analysis pipeline.
 * Given an evidence bundle, decides the best matching strategy:
 * - Barcode lookup (fastest, most accurate for packaged products)
 * - Packaged product search via Open Food Facts
 * - Direct nutrition label parsing (skip database entirely)
 * - Generic meal pipeline (existing text-based pipeline)
 */

import type { EvidenceBundle, MatchRoute } from "../types";

/**
 * Decide the best matching route based on available evidence.
 */
export function chooseMatchRoute(evidence: EvidenceBundle): MatchRoute {
  // Priority 1: Barcode — highest accuracy
  if (evidence.barcode) {
    return "barcode_lookup";
  }

  // Priority 2: Nutrition label visible — direct extraction, skip fuzzy
  if (
    evidence.ocr.nutritionLabel &&
    evidence.ocr.nutritionLabel.calories !== undefined
  ) {
    return "nutrition_label_direct";
  }

  // Priority 3: Packaged product with brand/product signals
  if (
    evidence.imageType === "packaged_product" ||
    evidence.visual.isPackaged ||
    evidence.ocr.brand !== null
  ) {
    return "packaged_product_search";
  }

  // Priority 4: User provided a description → use text pipeline
  if (evidence.userDescription && evidence.userDescription.trim().length > 0) {
    return "description_only";
  }

  // Fallback: generic meal pipeline
  return "generic_meal_pipeline";
}
