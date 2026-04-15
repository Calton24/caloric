/**
 * Image Analysis Pipeline
 *
 * The unified orchestrator for multi-stage image analysis.
 *
 * Pipeline stages:
 *   1. Triage    → classify image type (packaged / plated / label / etc.)
 *   2. Extract   → OCR tokens, brand, flavour, weight, visual category
 *   3. Route     → decide matching strategy based on evidence
 *   4. Match     → query Open Food Facts / USDA / use label directly
 *   5. Estimate  → build portion options with calorie calculations
 *   6. Compose   → assemble ImageAnalysisResult for the confirmation UI
 *
 * For packaged products: OCR-first → OFF search → evidence-rescored ranking
 * For plated meals: falls back to existing text nutrition pipeline
 *
 * "Route-aware architecture. Not one weak guesser."
 */

import {
    buildPortionOptions,
    calculatePortionNutrients,
} from "./estimation/portion-estimator.service";
import { extractProductInfo } from "./extraction/packaged-product-extractor";
import { classifyFood } from "./extraction/vision-classifier.service";
import { matchPackagedProduct } from "./matching/packaged-product-matcher";
import { chooseMatchRoute } from "./routing/source-router.service";
import { triageImage } from "./triage/image-triage.service";
import type {
    EvidenceBundle,
    ImageAnalysisResult,
    OcrExtraction,
    VisualClassification,
} from "./types";

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the full image analysis pipeline.
 *
 * @param imageUri     URI to the captured/selected image
 * @param description  User-provided text describing the food
 * @param ocrText      Raw OCR text extracted from the image (future: from ML Kit)
 * @returns            ImageAnalysisResult or null if pipeline can't produce anything
 */
export async function analyzeImage(
  imageUri: string,
  description: string | null,
  ocrText: string | null = null
): Promise<ImageAnalysisResult | null> {
  // ── Stage 1: Triage ────────────────────────────────────────
  const triage = triageImage(description, ocrText);

  // ── Stage 2: Extraction (parallel) ─────────────────────────
  const combinedText = [description, ocrText].filter(Boolean).join(" ");

  const ocr: OcrExtraction = extractProductInfo(combinedText);
  const visual: VisualClassification = classifyFood(combinedText);

  // ── Build evidence bundle ──────────────────────────────────
  const evidence: EvidenceBundle = {
    imageType: triage.imageType,
    ocr,
    visual,
    barcode: null, // Future: barcode detector
    userDescription: description,
    imageUri,
  };

  // Override triage with visual classifier if more confident
  if (visual.isPackaged && triage.imageType !== "packaged_product") {
    evidence.imageType = "packaged_product";
  }

  // ── Stage 3: Route ─────────────────────────────────────────
  const route = chooseMatchRoute(evidence);

  // For generic meals without packaged product signals, return null
  // to let the caller fall back to the text pipeline
  if (route === "generic_meal_pipeline" || route === "description_only") {
    // Only return null for description_only if there are no packaged signals
    if (!visual.isPackaged && !ocr.brand) {
      return null;
    }
  }

  // ── Stage 4: Match ─────────────────────────────────────────
  const candidates = await matchPackagedProduct(evidence, route);

  if (candidates.length === 0) {
    // No matches found — return null to trigger text pipeline fallback
    return null;
  }

  const bestCandidate = candidates[0];

  // Apply pack size from OCR if available
  if (ocr.weightGrams && !bestCandidate.packSizeGrams) {
    bestCandidate.packSizeGrams = ocr.weightGrams;
  }

  // ── Stage 5: Portion estimation ────────────────────────────
  const portionOptions = buildPortionOptions(bestCandidate);
  const selectedPortion =
    portionOptions.find((p) => p.isDefault) ?? portionOptions[0];

  // Calculate nutrients for the selected portion
  const nutrients = calculatePortionNutrients(
    bestCandidate,
    selectedPortion.grams
  );

  // ── Stage 6: Compose result ────────────────────────────────
  const ocrTokens = ocr.rawTokens.filter((t) => t.length > 2);
  const matchExplanationParts: string[] = [];
  if (ocr.brand) matchExplanationParts.push(`Brand: ${ocr.brand}`);
  if (ocr.flavour) matchExplanationParts.push(`Flavour: ${ocr.flavour}`);
  if (ocr.weightText) matchExplanationParts.push(`Size: ${ocr.weightText}`);
  if (bestCandidate.matchReasons.length > 0) {
    matchExplanationParts.push(bestCandidate.matchReasons[0]);
  }

  const result: ImageAnalysisResult = {
    imageType: evidence.imageType,
    product: bestCandidate,
    alternatives: candidates.slice(1, 4),
    portionOptions,
    selectedPortion,
    nutrients,
    evidence: {
      route,
      ocrTokens,
      visualCategory: visual.category,
      matchExplanation:
        matchExplanationParts.join(" • ") || "Matched from description",
    },
    confidence: {
      ocr: ocr.confidence,
      visual: visual.confidence,
      match: bestCandidate.matchScore,
      overall:
        Math.round(
          (ocr.confidence * 0.3 +
            visual.confidence * 0.2 +
            bestCandidate.matchScore * 0.5) *
            100
        ) / 100,
    },
    clarifications: [],
    imageUri,
  };

  return result;
}
