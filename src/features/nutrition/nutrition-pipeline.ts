/**
 * Nutrition Pipeline
 *
 * The unified entry point for the nutrition stack.
 * All three input modes (voice, text, image) call this same pipeline:
 *
 *   raw input
 *   → parse (LLM → regex fallback)
 *   → match (USDA + Open Food Facts → local fallback)
 *   → estimate (deterministic portion calculator)
 *   → MealDraft (ready for confirmation screen)
 *
 * "One pipeline. Three entry points."
 */

import type {
    EstimatedFoodItem,
    MealEstimate,
} from "./estimation/estimation.types";
import { estimateMeal } from "./estimation/portion-estimator.service";
import {
    matchFoodItemLocally,
    matchFoodItems,
} from "./matching/food-matcher.service";
import type { MatchedFoodItem } from "./matching/matching.types";
import { detectMealTime, type MealTime } from "./mealtime";
import { findBestMemoryMatch } from "./memory/food-memory.service";
import type { MealDraft } from "./nutrition.draft.types";
import { translateFoodAlias } from "./ontology/food-aliases";
import { getMealEmoji } from "./ontology/food-emoji";
import { deduplicateItems } from "./parsing/dedup-items";
import type { InputSource } from "./parsing/food-candidate.schema";
import { parseNutritionInput } from "./parsing/nutrition-parser.service";
import { groupFoodPhrases } from "./parsing/phrase-grouper";
import { cleanTranscript } from "./parsing/transcript-cleaner";

// ─── Pipeline Options ────────────────────────────────────────────────────────

export interface PipelineOptions {
  /**
   * Skip network calls (USDA/OFF) and use local-only matching.
   * Useful for offline mode or instant previews.
   * Default: false
   */
  offlineOnly?: boolean;

  /**
   * Timeout in ms for the network matching phase.
   * If exceeded, falls back to local matching.
   * Default: 5000
   */
  matchTimeoutMs?: number;

  /**
   * Meal time context for portion estimation.
   * Auto-detected from current time if not provided.
   */
  mealTime?: MealTime;

  /**
   * Skip the local LLM parsing step and go straight to regex.
   * Use when the input is already structured (ML Kit labels, image captions)
   * or the LLM has already run in a prior stage.
   * Default: false
   */
  skipLlmParse?: boolean;
}

// ─── Main Pipeline ───────────────────────────────────────────────────────────

/**
 * Run the full nutrition pipeline: parse → match → estimate.
 *
 * Returns a `MealEstimate` with individual items + totals + confidence.
 * The caller can then convert this to a `MealDraft` for the confirm screen.
 *
 * @param rawInput  User's raw input (transcript, typed text, or image caption)
 * @param source    How the input was captured
 * @param options   Pipeline configuration
 */
export async function runNutritionPipeline(
  rawInput: string,
  source: InputSource,
  options: PipelineOptions = {}
): Promise<MealEstimate> {
  const {
    offlineOnly = false,
    matchTimeoutMs = 5000,
    mealTime,
    skipLlmParse = false,
  } = options;
  const resolvedMealTime = mealTime ?? detectMealTime();

  // 0. Transcript cleanup: remove ASR artifacts, filler words
  const { cleaned, asrConfidence } = cleanTranscript(rawInput, source);

  // 0.25. Multilingual alias translation: "pollo" → "chicken", "guláš" → "goulash"
  const { translated } = translateFoodAlias(cleaned);

  // 0.5. Phrase grouping: detect compound foods before parsing
  const groups = groupFoodPhrases(translated);
  const textToParse =
    groups.length > 0 ? groups.map((g) => g.text).join(", ") : cleaned;

  // Build a map of grouping confidence per fragment
  const groupingMap = new Map<string, number>();
  for (const g of groups) {
    groupingMap.set(g.text.toLowerCase(), g.groupingConfidence);
  }

  // 1. Parse: raw text → structured food candidates
  const parsed = await parseNutritionInput(textToParse, source, {
    skipLlm: skipLlmParse,
  });

  // 1.5. Deduplicate: merge repeated items ("toast and eggs and toast" → 2× toast + eggs)
  parsed.items = deduplicateItems(parsed.items);

  if (parsed.items.length === 0) {
    return {
      items: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      overallConfidence: 0,
      rawInput,
      source,
      parseMethod: parsed.parseMethod,
    };
  }

  // 2. Match: candidates → DB-backed nutrient data
  let matched: MatchedFoodItem[];

  if (offlineOnly) {
    // Local-only: instant, no network
    matched = parsed.items.map(matchFoodItemLocally);
  } else {
    // Try network matching with timeout
    try {
      matched = await Promise.race([
        matchFoodItems(parsed.items),
        new Promise<MatchedFoodItem[]>((_, reject) =>
          setTimeout(() => reject(new Error("Match timeout")), matchTimeoutMs)
        ),
      ]);
    } catch {
      // Network failed or timed out — fall back to local
      console.warn("Network matching failed, using local fallback");
      matched = parsed.items.map(matchFoodItemLocally);
    }
  }

  // Attach grouping confidence to matched items
  for (const m of matched) {
    const key = m.parsed.name.toLowerCase();
    // Look up grouping confidence by matching against group text
    const groupConf =
      groupingMap.get(key) ??
      Array.from(groupingMap.entries()).find(
        ([gKey]) => gKey.includes(key) || key.includes(gKey)
      )?.[1] ??
      0.85; // default = no grouping ambiguity
    m.groupingConfidence = groupConf;
  }

  // 2.5. Food Memory: personal calibration from past meals
  //      If the user has logged this food before, boost confidence
  //      and optionally use their personal average (more accurate than DB).
  for (const m of matched) {
    const memory = findBestMemoryMatch(m.parsed.name);
    if (memory && memory.similarity >= 0.8) {
      // Boost match confidence — user has logged this before
      const memoryBoost = Math.min(memory.entry.frequency * 0.03, 0.15);
      m.matchConfidence = Math.min(1, (m.matchConfidence ?? 0.5) + memoryBoost);

      // If the match source is local fallback and we have personal data,
      // use the user's personal averages instead of generic defaults
      if (
        m.selectedMatch?.source === "local-fallback" &&
        memory.entry.frequency >= 3 &&
        m.selectedMatch
      ) {
        m.selectedMatch = {
          ...m.selectedMatch,
          name: memory.entry.name,
          nutrients: {
            calories: memory.entry.avgCalories,
            protein: memory.entry.avgProtein,
            carbs: memory.entry.avgCarbs,
            fat: memory.entry.avgFat,
          },
          source: "personal-history",
          matchScore: Math.min(1, 0.85 + memoryBoost),
        };
      }
    }
  }

  // 3. Estimate: matched items → final calories/macros (with layered confidence)
  const estimate = estimateMeal(
    matched,
    rawInput,
    source,
    parsed.parseMethod,
    asrConfidence,
    resolvedMealTime
  );

  return estimate;
}

// ─── Display Helpers ─────────────────────────────────────────────────────────

/**
 * Pick the best display name for a food item.
 *
 * Prefers `matchedName` (the database-resolved food name) over `parsed.name`
 * (the raw transcript text). This ensures users see "Protein Shake" not
 * "protein bar had a protein shake".
 *
 * Falls back to `parsed.name` only when `matchedName` is missing or is
 * a generic fallback like "unknown food".
 */
export function displayName(item: EstimatedFoodItem): string {
  const matched = item.matchedName?.trim();
  const parsed = item.parsed?.name?.trim();

  // Use matched name if it's a real food name (not empty, not a generic fallback)
  if (matched && matched.length > 0 && matched.toLowerCase() !== "unknown") {
    return matched;
  }

  return parsed || "food";
}

// ─── Draft Conversion ────────────────────────────────────────────────────────

/**
 * Convert a MealEstimate into a MealDraft for the confirmation screen.
 * This bridges the new pipeline output into the existing draft → confirm flow.
 */
export function mealEstimateToDraft(estimate: MealEstimate): MealDraft {
  // Build title from the matched food names (what the database resolved).
  // This shows the actual food detected, not the raw transcript.
  const title =
    estimate.items.length > 0
      ? estimate.items
          .map((i) => {
            const qty =
              (i.parsed?.quantity ?? 1) !== 1 ? `${i.parsed?.quantity} ` : "";
            const name = displayName(i);
            return `${qty}${name}`;
          })
          .join(", ")
      : estimate.rawInput;

  // Map source to MealSource
  const sourceMap: Record<InputSource, MealDraft["source"]> = {
    voice: "voice",
    text: "manual",
    image: "camera",
  };

  return {
    title,
    source: sourceMap[estimate.source] ?? "manual",
    rawInput: estimate.rawInput,
    calories: estimate.totals.calories,
    protein: estimate.totals.protein,
    carbs: estimate.totals.carbs,
    fat: estimate.totals.fat,
    estimatedItems: estimate.items,
    confidence: estimate.overallConfidence,
    parseMethod: estimate.parseMethod,
    emoji: getMealEmoji(
      estimate.items.map((i) => ({
        name: displayName(i),
        calories: i.nutrients.calories,
      }))
    ),
    mealTime: estimate.mealTime,
  };
}
