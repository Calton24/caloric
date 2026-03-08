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

import type { MealEstimate } from "./estimation/estimation.types";
import { estimateMeal } from "./estimation/portion-estimator.service";
import {
  matchFoodItemLocally,
  matchFoodItems,
} from "./matching/food-matcher.service";
import type { MatchedFoodItem } from "./matching/matching.types";
import type { MealDraft } from "./nutrition.draft.types";
import { translateFoodAlias } from "./ontology/food-aliases";
import { getMealEmoji } from "./ontology/food-emoji";
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
  const { offlineOnly = false, matchTimeoutMs = 5000 } = options;

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
  const parsed = await parseNutritionInput(textToParse, source);

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

  // 3. Estimate: matched items → final calories/macros (with layered confidence)
  const estimate = estimateMeal(
    matched,
    rawInput,
    source,
    parsed.parseMethod,
    asrConfidence
  );

  return estimate;
}

// ─── Draft Conversion ────────────────────────────────────────────────────────

/**
 * Convert a MealEstimate into a MealDraft for the confirmation screen.
 * This bridges the new pipeline output into the existing draft → confirm flow.
 */
export function mealEstimateToDraft(estimate: MealEstimate): MealDraft {
  // Build a title from the canonical matched names (not raw voice transcription)
  const title =
    estimate.items.length > 0
      ? estimate.items
          .map((i) => {
            const qty = i.parsed.quantity !== 1 ? `${i.parsed.quantity} ` : "";
            // Prefer parsed.name when it's a recognizable variant of the match
            // (e.g. plurals like "eggs" for "egg"). Use matchedName when
            // parsed.name looks like ASR noise (doesn't resemble the match).
            const pn = i.parsed.name.toLowerCase();
            const mn = (i.matchedName ?? "").toLowerCase();
            const nameIsVariant = !mn || pn.includes(mn) || mn.includes(pn);
            const name = nameIsVariant
              ? i.parsed.name
              : i.matchedName || i.parsed.name;
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
        name: i.parsed.name,
        calories: i.nutrients.calories,
      }))
    ),
  };
}
