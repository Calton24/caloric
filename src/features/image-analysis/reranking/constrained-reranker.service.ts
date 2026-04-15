/**
 * Constrained Reranker Service
 *
 * The final stage of the retrieval-constrained recognition pipeline.
 * Instead of asking a model "What food is this?" (open-ended, hallucination-prone),
 * we give it a CLOSED candidate set and ask it to RANK.
 *
 * Two strategies:
 *   1. **LLM reranking** — multimodal llama.rn ranks from the shortlist
 *   2. **Heuristic reranking** — score-based fallback when no LLM available
 *
 * Both strategies produce the same `ConstrainedRankingResult`.
 *
 * "Retrieval constrains. Models rank. Users confirm."
 */

import type { FoodMatch } from "../../nutrition/matching/matching.types";
import {
    isLocalLlmReady,
    parseImageWithLocalLlm,
} from "../../nutrition/parsing/local-llm.service";
import type { TaxonomyClassification } from "../taxonomy/food-taxonomy";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ConfidenceLevel = "high" | "medium" | "low";

export interface RankedCandidate {
  /** The food match from the dataset */
  food: FoodMatch;
  /** Reranking score 0–1 (higher = more likely) */
  rankScore: number;
  /** Confidence level based on thresholds */
  confidenceLevel: ConfidenceLevel;
  /** Why this was ranked here */
  reason: string;
}

export interface ConstrainedRankingResult {
  /** Best match — the model's top pick */
  bestMatch: RankedCandidate;
  /** Up to 2 alternatives */
  alternatives: RankedCandidate[];
  /** Overall confidence in the ranking */
  confidence: number;
  /** Confidence level based on thresholds */
  confidenceLevel: ConfidenceLevel;
  /** Which strategy was used */
  strategy: "llm_reranking" | "heuristic_reranking";
  /** Whether the user should be forced to choose (low confidence) */
  requiresUserChoice: boolean;
}

// ─── Confidence Thresholds ──────────────────────────────────────────────────

const CONFIDENCE_HIGH = 0.75;
const CONFIDENCE_MEDIUM = 0.5;

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= CONFIDENCE_HIGH) return "high";
  if (score >= CONFIDENCE_MEDIUM) return "medium";
  return "low";
}

// ─── Main API ───────────────────────────────────────────────────────────────

/**
 * Rerank a candidate shortlist using constrained classification.
 *
 * Tries LLM multimodal reranking first, falls back to heuristic scoring.
 *
 * @param imageUri       Path to the captured image
 * @param candidates     Dataset candidates from retrieval service
 * @param taxonomy       Taxonomy classification from ML Kit labels
 * @param ocrText        OCR text found on the image (if any)
 * @param userDesc       Optional user-provided description
 */
export async function rerankCandidates(
  imageUri: string,
  candidates: FoodMatch[],
  taxonomy: TaxonomyClassification,
  ocrText: string | null,
  userDesc?: string
): Promise<ConstrainedRankingResult> {
  if (candidates.length === 0) {
    return buildEmptyResult();
  }

  // Strategy 1: Try LLM-based constrained reranking
  if (isLocalLlmReady()) {
    try {
      const llmResult = await llmRerank(
        imageUri,
        candidates,
        taxonomy,
        ocrText,
        userDesc
      );
      if (llmResult) return llmResult;
    } catch {
      // Fall through to heuristic
    }
  }

  // Strategy 2: Heuristic scoring (always available)
  return heuristicRerank(candidates, taxonomy, ocrText, userDesc);
}

// ─── LLM Constrained Reranking ──────────────────────────────────────────────

/**
 * Build a constrained prompt that forces the LLM to choose from candidates only.
 */
function buildConstrainedPrompt(
  candidates: FoodMatch[],
  taxonomy: TaxonomyClassification,
  ocrText: string | null,
  userDesc?: string
): string {
  const candidateList = candidates
    .slice(0, 20) // Max 20 in the prompt
    .map((c, i) => {
      const brand = c.brand ? ` (${c.brand})` : "";
      const cal = c.nutrients.calories;
      return `${i + 1}. ${c.name}${brand} — ${cal} cal/serving`;
    })
    .join("\n");

  const categoryInfo = `Top-level category: ${taxonomy.l1.replace(/_/g, " ")}`;
  const subCategoryInfo =
    taxonomy.l2 !== "unknown"
      ? `\nSub-category: ${taxonomy.l2.replace(/_/g, " ")}`
      : "";
  const ocrInfo = ocrText ? `\nOCR text visible: "${ocrText}"` : "";
  const descInfo = userDesc ? `\nUser description: "${userDesc}"` : "";

  return `Analyze this food image.

${categoryInfo}${subCategoryInfo}${ocrInfo}${descInfo}

You must choose the most likely food from the candidate list below.
Do not invent new foods. Do not add foods not on this list.
Return your top 3 ranked options only.

Candidates:
${candidateList}

Return valid JSON only:
{
  "best_match": "exact candidate name from the list",
  "alternatives": ["second best name", "third best name"],
  "confidence": 0.0 to 1.0,
  "reason": "brief explanation"
}`;
}

async function llmRerank(
  imageUri: string,
  candidates: FoodMatch[],
  taxonomy: TaxonomyClassification,
  ocrText: string | null,
  userDesc?: string
): Promise<ConstrainedRankingResult | null> {
  const prompt = buildConstrainedPrompt(
    candidates,
    taxonomy,
    ocrText,
    userDesc
  );

  const result = await parseImageWithLocalLlm(imageUri, prompt);
  if (!result.success || result.items.length === 0) return null;

  // The LLM gave us ParsedFoodItem[], but we used a custom prompt.
  // We need to match the LLM's chosen name back to our candidate list.
  // Since parseImageWithLocalLlm tries to parse JSON, let's work with
  // the raw items it returns and match them to candidates.

  const bestItemName = result.items[0]?.name?.toLowerCase();
  if (!bestItemName) return null;

  const matched = matchNameToCandidates(bestItemName, candidates);
  if (!matched) return null;

  const alts = result.items
    .slice(1, 3)
    .map((item) => matchNameToCandidates(item.name.toLowerCase(), candidates))
    .filter((r): r is FoodMatch => r !== null);

  const confidence = result.items[0]?.confidence ?? 0.7;
  const confidenceLevel = getConfidenceLevel(confidence);

  return {
    bestMatch: {
      food: matched,
      rankScore: confidence,
      confidenceLevel,
      reason: "LLM selected from constrained candidate list",
    },
    alternatives: alts.map((alt, i) => ({
      food: alt,
      rankScore: Math.max(confidence - 0.1 * (i + 1), 0.3),
      confidenceLevel: getConfidenceLevel(
        Math.max(confidence - 0.1 * (i + 1), 0.3)
      ),
      reason: "LLM alternative pick",
    })),
    confidence,
    confidenceLevel,
    strategy: "llm_reranking",
    requiresUserChoice: confidenceLevel === "low",
  };
}

/**
 * Fuzzy match an LLM-returned name back to a candidate in our list.
 */
function matchNameToCandidates(
  name: string,
  candidates: FoodMatch[]
): FoodMatch | null {
  const lower = name.trim().toLowerCase();

  // Exact match
  const exact = candidates.find((c) => c.name.toLowerCase() === lower);
  if (exact) return exact;

  // Contains match
  const contains = candidates.find(
    (c) =>
      c.name.toLowerCase().includes(lower) ||
      lower.includes(c.name.toLowerCase())
  );
  if (contains) return contains;

  // Word overlap scoring
  const queryWords = new Set(lower.split(/\s+/));
  let bestOverlap = 0;
  let bestCandidate: FoodMatch | null = null;

  for (const c of candidates) {
    const candWords = c.name.toLowerCase().split(/\s+/);
    let overlap = 0;
    for (const w of candWords) {
      if (queryWords.has(w)) overlap++;
    }
    const score = candWords.length > 0 ? overlap / candWords.length : 0;
    if (score > bestOverlap && score >= 0.4) {
      bestOverlap = score;
      bestCandidate = c;
    }
  }

  return bestCandidate;
}

// ─── Heuristic Reranking ────────────────────────────────────────────────────

/**
 * Score-based reranking when no LLM is available.
 *
 * Scoring signals:
 *   - Name relevance to taxonomy food guess
 *   - OCR token overlap with name/brand
 *   - User description overlap
 *   - Dataset match score (from retrieval)
 *   - Data quality bonus
 */
function heuristicRerank(
  candidates: FoodMatch[],
  taxonomy: TaxonomyClassification,
  ocrText: string | null,
  userDesc?: string
): ConstrainedRankingResult {
  const scored = candidates.map((candidate) => {
    let score = candidate.matchScore * 0.4; // Base: retrieval score (40% weight)

    // Signal 1: Name vs taxonomy food guess
    const nameLower = candidate.name.toLowerCase();
    const guessLower = taxonomy.foodGuess.toLowerCase();
    const guessWords = guessLower.split(/\s+/);

    if (nameLower.includes(guessLower)) {
      score += 0.25;
    } else {
      const matchedWords = guessWords.filter((w) => nameLower.includes(w));
      score += (matchedWords.length / guessWords.length) * 0.2;
    }

    // Signal 2: OCR token overlap
    if (ocrText) {
      const ocrWords = new Set(
        ocrText
          .toLowerCase()
          .split(/\s+/)
          .filter((w) => w.length >= 3)
      );
      const nameWords = nameLower.split(/\s+/);
      const brandLower = (candidate.brand ?? "").toLowerCase();
      let ocrHits = 0;
      for (const w of ocrWords) {
        if (nameWords.some((nw) => nw.includes(w) || w.includes(nw))) ocrHits++;
        if (brandLower.includes(w)) ocrHits++;
      }
      if (ocrWords.size > 0) {
        score += Math.min(ocrHits / ocrWords.size, 1) * 0.2;
      }
    }

    // Signal 3: User description overlap
    if (userDesc) {
      const descWords = userDesc
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length >= 3);
      const nameWords = nameLower.split(/\s+/);
      let descHits = 0;
      for (const dw of descWords) {
        if (nameWords.some((nw) => nw.includes(dw) || dw.includes(nw)))
          descHits++;
      }
      if (descWords.length > 0) {
        score += Math.min(descHits / descWords.length, 1) * 0.15;
      }
    }

    // Clamp to 0–1
    score = Math.min(Math.max(score, 0), 1);

    return {
      food: candidate,
      rankScore: score,
      confidenceLevel: getConfidenceLevel(score),
      reason: buildHeuristicReason(candidate, taxonomy, ocrText),
    } satisfies RankedCandidate;
  });

  // Sort by score descending
  scored.sort((a, b) => b.rankScore - a.rankScore);

  const best = scored[0];
  const alts = scored.slice(1, 3);

  return {
    bestMatch: best,
    alternatives: alts,
    confidence: best.rankScore,
    confidenceLevel: best.confidenceLevel,
    strategy: "heuristic_reranking",
    requiresUserChoice: best.confidenceLevel === "low",
  };
}

function buildHeuristicReason(
  candidate: FoodMatch,
  taxonomy: TaxonomyClassification,
  ocrText: string | null
): string {
  const parts: string[] = [];
  const nameLower = candidate.name.toLowerCase();
  const guessLower = taxonomy.foodGuess.toLowerCase();

  if (nameLower.includes(guessLower)) {
    parts.push(`matches "${taxonomy.foodGuess}"`);
  }
  if (candidate.brand) {
    parts.push(`brand: ${candidate.brand}`);
  }
  if (ocrText && nameLower.includes(ocrText.toLowerCase().split(/\s+/)[0])) {
    parts.push("OCR text match");
  }

  return parts.length > 0 ? parts.join(", ") : `${taxonomy.l2} category match`;
}

// ─── Empty Result ───────────────────────────────────────────────────────────

function buildEmptyResult(): ConstrainedRankingResult {
  return {
    bestMatch: {
      food: {
        source: "dataset",
        sourceId: "",
        name: "Unknown food",
        nutrients: { calories: 0, protein: 0, carbs: 0, fat: 0 },
        servingSize: 100,
        servingUnit: "g",
        servingDescription: "100g",
        matchScore: 0,
      },
      rankScore: 0,
      confidenceLevel: "low",
      reason: "No candidates available",
    },
    alternatives: [],
    confidence: 0,
    confidenceLevel: "low",
    strategy: "heuristic_reranking",
    requiresUserChoice: true,
  };
}
