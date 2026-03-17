/**
 * Vision Pipeline — Detect → Classify → Candidates
 *
 * The new image recognition pipeline built on ML Kit labels + food taxonomy.
 *
 * Architecture:
 *   1. Quality Gate    → reject unusable images (too dark, blurry, etc.)
 *   2. ML Kit Labels   → on-device image labeling (no network)
 *   3. Taxonomy        → classify labels into (L1, L2) food categories
 *   4. Candidates      → generate top-3 food candidates with confidence
 *
 * This pipeline does NOT do nutrition lookup. It only identifies WHAT the
 * food is. The nutrition lookup happens AFTER the user confirms which
 * candidate is correct.
 *
 * "Detect → Classify → Confirm → Map → Log"
 */

import {
  retrieveCandidates,
  type CandidateShortlist,
  type RetrievalSignals,
} from "../nutrition/matching/food-candidate-retrieval.service";
import type { FoodMatch } from "../nutrition/matching/matching.types";
import { getRawFoodLabels, labelFoodImage } from "./ocr/image-labeling.service";
import { extractTextFromImage } from "./ocr/text-recognition.service";
import { checkImageQuality } from "./quality/image-quality-gate";
import {
  rerankCandidates,
  type ConstrainedRankingResult,
} from "./reranking/constrained-reranker.service";
import {
  classifyIntoTaxonomy,
  getTaxonomyCandidates,
  type TaxonomyClassification,
} from "./taxonomy/food-taxonomy";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VisionCandidate {
  /** Human-readable food name */
  name: string;
  /** Food taxonomy classification */
  taxonomy: TaxonomyClassification;
  /** Confidence 0–1 that this IS the food in the image */
  confidence: number;
  /** Additional context from ML Kit labels */
  rawLabels: string[];
  /** OCR text found on the item (empty if none) */
  ocrText: string | null;
}

export interface VisionPipelineResult {
  /** Whether the pipeline produced candidates */
  success: boolean;
  /** Top candidates, ranked by confidence (best first) */
  candidates: VisionCandidate[];
  /** Dataset-backed candidate shortlist from retrieval service */
  datasetCandidates: FoodMatch[];
  /** Constrained reranking result (best match + alternatives) */
  rankingResult: ConstrainedRankingResult | null;
  /** Retrieval strategy and signals used */
  retrievalInfo: CandidateShortlist | null;
  /** User feedback if quality gate failed */
  qualityFeedback: string | null;
  /** Source image URI */
  imageUri: string;
  /** Raw ML Kit labels for debugging */
  rawLabels: { label: string; confidence: number }[];
  /** Whether OCR found text on the image */
  hasOcrText: boolean;
  /** OCR text extracted from the image */
  ocrText: string | null;
  /** Best taxonomy classification */
  taxonomy: TaxonomyClassification | null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the full vision pipeline on a captured image.
 *
 * @param imageUri    URI to the captured/picked image
 * @param userDesc    Optional user-provided description
 * @returns           VisionPipelineResult with top-3 candidates
 */
export async function runVisionPipeline(
  imageUri: string,
  userDesc?: string
): Promise<VisionPipelineResult> {
  // ── Step 1: Quality Gate ────────────────────────────────
  const quality = await checkImageQuality(imageUri);
  if (!quality.passed) {
    return {
      success: false,
      candidates: [],
      datasetCandidates: [],
      rankingResult: null,
      retrievalInfo: null,
      qualityFeedback: quality.feedback,
      imageUri,
      rawLabels: [],
      hasOcrText: false,
      ocrText: null,
      taxonomy: null,
    };
  }

  // ── Step 2: ML Kit Labels + OCR (parallel) ─────────────
  const [rawLabels, ocrText] = await Promise.all([
    getRawFoodLabels(imageUri),
    extractTextFromImage(imageUri).catch(() => null),
  ]);

  const cleanOcr =
    ocrText && ocrText.trim().length >= 4 ? ocrText.trim() : null;

  // ── Step 3: Taxonomy Classification ─────────────────────
  if (rawLabels.length === 0 && !cleanOcr && !userDesc) {
    return {
      success: false,
      candidates: [],
      datasetCandidates: [],
      rankingResult: null,
      retrievalInfo: null,
      qualityFeedback: "Couldn't detect any food — try a clearer photo",
      imageUri,
      rawLabels: [],
      hasOcrText: false,
      ocrText: null,
      taxonomy: null,
    };
  }

  // Get top-3 taxonomy candidates from ML Kit labels
  const taxonomyCandidates = getTaxonomyCandidates(rawLabels, 3);

  // ── Step 4: Build Candidates ────────────────────────────
  const candidates: VisionCandidate[] = [];

  // Add taxonomy-derived candidates
  for (const tc of taxonomyCandidates) {
    candidates.push({
      name: tc.foodGuess,
      taxonomy: tc,
      confidence: tc.confidence,
      rawLabels: tc.contributingLabels,
      ocrText: cleanOcr,
    });
  }

  // If ML Kit gave us a mapped food name that's better than taxonomy,
  // add it as candidate too (uses the combination rules from label-food-mapper)
  const mappedFood = await labelFoodImage(imageUri).catch(() => null);
  if (mappedFood && !candidates.some((c) => c.name === mappedFood)) {
    const bestTaxonomy =
      taxonomyCandidates[0] ?? classifyIntoTaxonomy(rawLabels);
    candidates.push({
      name: mappedFood,
      taxonomy: bestTaxonomy,
      confidence: bestTaxonomy.confidence * 0.9,
      rawLabels: rawLabels.map((l) => l.label),
      ocrText: cleanOcr,
    });
  }

  // If user provided a description, add it as a candidate
  if (userDesc?.trim()) {
    const descTaxonomy =
      taxonomyCandidates[0] ?? classifyIntoTaxonomy(rawLabels);
    candidates.push({
      name: userDesc.trim(),
      taxonomy: descTaxonomy,
      confidence: 0.6,
      rawLabels: [],
      ocrText: cleanOcr,
    });
  }

  // Sort by confidence, take top 3
  candidates.sort((a, b) => b.confidence - a.confidence);
  const topCandidates = candidates.slice(0, 3);

  // ── Step 5: Dataset Candidate Retrieval ─────────────────
  // The key trick: use taxonomy classification + OCR signals to retrieve
  // a constrained candidate set from the 1.85M-food dataset.
  // The model only needs to RANK these — not invent from scratch.
  const bestTaxonomy = taxonomyCandidates[0] ?? classifyIntoTaxonomy(rawLabels);

  const ocrTokens = cleanOcr
    ? cleanOcr.split(/\s+/).filter((t) => t.length >= 3)
    : [];

  const retrievalSignals: RetrievalSignals = {
    coarseCategory: bestTaxonomy.l1,
    subCategory: bestTaxonomy.l2,
    foodGuess: bestTaxonomy.foodGuess,
    ocrTokens: ocrTokens.length > 0 ? ocrTokens : undefined,
  };

  // Add user description as extra signal
  if (userDesc?.trim()) {
    retrievalSignals.ocrTokens = [
      ...(retrievalSignals.ocrTokens ?? []),
      ...userDesc.split(/\s+/).filter((t) => t.length >= 3),
    ];
  }

  let retrievalInfo: CandidateShortlist | null = null;
  let datasetCandidates: FoodMatch[] = [];

  try {
    retrievalInfo = await retrieveCandidates(retrievalSignals, 15);
    datasetCandidates = retrievalInfo.candidates;
  } catch {
    // Dataset retrieval is optional — pipeline works without it
  }

  // ── Step 6: Constrained Reranking ─────────────────────────
  // If we have dataset candidates, rerank them using the constrained
  // model (LLM if available, heuristic fallback). This produces a
  // best_match + alternatives with confidence levels.
  let rankingResult: ConstrainedRankingResult | null = null;

  if (datasetCandidates.length > 0) {
    try {
      rankingResult = await rerankCandidates(
        imageUri,
        datasetCandidates,
        bestTaxonomy,
        cleanOcr,
        userDesc
      );
    } catch {
      // Reranking failure is non-blocking
    }
  }

  return {
    success: topCandidates.length > 0 || datasetCandidates.length > 0,
    candidates: topCandidates,
    datasetCandidates,
    rankingResult,
    retrievalInfo,
    qualityFeedback: null,
    imageUri,
    rawLabels,
    hasOcrText: !!cleanOcr,
    ocrText: cleanOcr,
    taxonomy: bestTaxonomy,
  };
}
