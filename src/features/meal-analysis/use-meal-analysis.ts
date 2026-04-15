/**
 * useMealAnalysis Hook
 *
 * State machine for the AI meal analysis pipeline.
 * Manages the full lifecycle: capture → upload → analyze → resolve → edit → confirm.
 *
 * States:
 *   idle → capturing → uploading → analyzing → completed → editing → confirmed
 *                                            → error (recoverable)
 *
 * Usage:
 *   const { state, result, analyze, updateItem, confirm } = useMealAnalysis();
 *   await analyze(imageUri);  // drives state machine automatically
 *   updateItem(0, { grams: 250 });  // user edits a component
 *   confirm();  // saves to nutrition store
 */

import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { useAuth } from "../auth/useAuth";
import { matchFoodItemLocally } from "../nutrition/matching/food-matcher.service";
import type { NutrientProfile } from "../nutrition/matching/matching.types";
import { detectMealTime } from "../nutrition/mealtime";
import { rebuildFoodMemory } from "../nutrition/memory/food-memory.service";
import { useNutritionDraftStore } from "../nutrition/nutrition.draft.store";
import { buildMealEntryFromDraft } from "../nutrition/nutrition.helpers";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { getFoodEmoji } from "../nutrition/ontology/food-emoji";
import {
    analyzeMealImage,
    MealAnalysisError,
    type MealAnalysisResultWithMeta,
} from "./meal-analysis.service";
import type {
    AnalysisState,
    MealAnalysisResult,
    ResolvedFoodItem,
} from "./meal-analysis.types";
import {
    buildTelemetryUpdate,
    finalizeScanEvent,
    persistCorrections,
} from "./vision-telemetry.service";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MealAnalysisHook {
  /** Current pipeline state */
  state: AnalysisState;
  /** Analysis result (available in completed/editing states) */
  result: MealAnalysisResult | null;
  /** Error message (available in error state) */
  error: string | null;
  /** Source image URI */
  imageUri: string | null;

  /** Start analysis from an image URI */
  analyze: (imageUri: string, userHint?: string) => Promise<void>;
  /** Update a specific food item (portion, name, nutrients) */
  updateItem: (index: number, updates: ItemUpdate) => void;
  /** Remove a food item */
  removeItem: (index: number) => void;
  /** Add a manual food item */
  addItem: (name: string, grams: number) => void;
  /** Confirm and save the meal */
  confirm: () => void;
  /** Reset to idle state */
  reset: () => void;
  /** Retry after error */
  retry: () => Promise<void>;
}

export interface ItemUpdate {
  /** New portion in grams */
  grams?: number;
  /** Override resolved name */
  name?: string;
  /** Direct nutrient override */
  nutrients?: Partial<NutrientProfile>;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useMealAnalysis(): MealAnalysisHook {
  const router = useRouter();
  const { session } = useAuth();
  const setDraft = useNutritionDraftStore((s) => s.setDraft);
  const clearDraft = useNutritionDraftStore((s) => s.clearDraft);
  const addMeal = useNutritionStore((s) => s.addMeal);
  const meals = useNutritionStore((s) => s.meals);

  const [state, setState] = useState<AnalysisState>("idle");
  const [result, setResult] = useState<MealAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Track last params for retry
  const lastParamsRef = useRef<{ uri: string; hint?: string } | null>(null);

  // Correction tracking — snapshots taken when analysis completes
  const originalItemsRef = useRef<ResolvedFoodItem[]>([]);
  const removedItemsRef = useRef<ResolvedFoodItem[]>([]);
  const addedItemsRef = useRef<ResolvedFoodItem[]>([]);
  const scanEventIdRef = useRef<string | null>(null);
  const tokensUsedRef = useRef<number | null>(null);

  // ── Analyze ──

  const analyze = useCallback(
    async (uri: string, userHint?: string) => {
      lastParamsRef.current = { uri, hint: userHint };
      setImageUri(uri);
      setError(null);
      setState("uploading");

      // Reset correction tracking
      originalItemsRef.current = [];
      removedItemsRef.current = [];
      addedItemsRef.current = [];
      scanEventIdRef.current = null;
      tokensUsedRef.current = null;

      try {
        setState("analyzing");
        const analysisResult = await analyzeMealImage(
          uri,
          userHint,
          session?.accessToken
        );

        // Snapshot originals for correction diffing
        originalItemsRef.current = analysisResult.items.map((item) => ({
          ...item,
          detected: { ...item.detected, portion: { ...item.detected.portion } },
          nutrients: { ...item.nutrients },
          confidence: { ...item.confidence },
        }));

        // Capture server metadata for telemetry
        const meta = analysisResult as MealAnalysisResultWithMeta;
        scanEventIdRef.current = meta.scanEventId ?? null;
        tokensUsedRef.current = meta.tokensUsed ?? null;

        setResult(analysisResult);
        setState("completed");
      } catch (err) {
        const message =
          err instanceof MealAnalysisError
            ? err.message
            : "Something went wrong. Please try again.";
        setError(message);
        setState("error");
      }
    },
    [session?.accessToken]
  );

  // ── Edit Items ──

  const updateItem = useCallback((index: number, updates: ItemUpdate) => {
    setResult((prev) => {
      if (!prev) return prev;
      const items = [...prev.items];
      const item = { ...items[index] };

      if (updates.grams !== undefined) {
        // Rescale nutrients based on new gram amount
        const scale = updates.grams / 100;
        item.nutrients = {
          calories: Math.round(item.nutrientsPer100g.calories * scale),
          protein: Math.round(item.nutrientsPer100g.protein * scale * 10) / 10,
          carbs: Math.round(item.nutrientsPer100g.carbs * scale * 10) / 10,
          fat: Math.round(item.nutrientsPer100g.fat * scale * 10) / 10,
        };
        item.detected = {
          ...item.detected,
          portion: {
            ...item.detected.portion,
            grams: updates.grams,
          },
        };
      }

      if (updates.name !== undefined) {
        item.resolvedName = updates.name;
      }

      if (updates.nutrients) {
        item.nutrients = { ...item.nutrients, ...updates.nutrients };
      }

      items[index] = item;

      // Recalculate totals
      const totals = items.reduce(
        (sum, i) => ({
          calories: sum.calories + i.nutrients.calories,
          protein: sum.protein + i.nutrients.protein,
          carbs: sum.carbs + i.nutrients.carbs,
          fat: sum.fat + i.nutrients.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );

      return {
        ...prev,
        items,
        totals: {
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein * 10) / 10,
          carbs: Math.round(totals.carbs * 10) / 10,
          fat: Math.round(totals.fat * 10) / 10,
        },
      };
    });
    setState("editing");
  }, []);

  const removeItem = useCallback((index: number) => {
    setResult((prev) => {
      if (!prev) return prev;

      // Track the removed item for correction persistence
      const removedItem = prev.items[index];
      if (removedItem) {
        removedItemsRef.current = [...removedItemsRef.current, removedItem];
      }

      const items = prev.items.filter((_, i) => i !== index);
      const totals = items.reduce(
        (sum, i) => ({
          calories: sum.calories + i.nutrients.calories,
          protein: sum.protein + i.nutrients.protein,
          carbs: sum.carbs + i.nutrients.carbs,
          fat: sum.fat + i.nutrients.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      return {
        ...prev,
        items,
        totals: {
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein * 10) / 10,
          carbs: Math.round(totals.carbs * 10) / 10,
          fat: Math.round(totals.fat * 10) / 10,
        },
      };
    });
  }, []);

  const addItem = useCallback((name: string, grams: number) => {
    // Attempt to resolve nutrition through local DB
    const parsed = {
      name: name.toLowerCase().trim(),
      quantity: 1,
      unit: "serving" as const,
      preparation: null,
      confidence: 1,
      rawFragment: name,
    };
    const matched = matchFoodItemLocally(parsed);
    const match = matched?.selectedMatch;

    let nutrients: NutrientProfile;
    let nutrientsPer100g: NutrientProfile;
    let nutritionSource: ResolvedFoodItem["nutritionSource"] = "fallback";
    let nutritionMatchConfidence = 0.2;

    if (match && match.nutrients) {
      const servingGrams = match.servingSize ?? 100;
      nutrientsPer100g = {
        calories: Math.round((match.nutrients.calories / servingGrams) * 100),
        protein:
          Math.round((match.nutrients.protein / servingGrams) * 100 * 10) / 10,
        carbs:
          Math.round((match.nutrients.carbs / servingGrams) * 100 * 10) / 10,
        fat: Math.round((match.nutrients.fat / servingGrams) * 100 * 10) / 10,
      };
      const scale = grams / 100;
      nutrients = {
        calories: Math.round(nutrientsPer100g.calories * scale),
        protein: Math.round(nutrientsPer100g.protein * scale * 10) / 10,
        carbs: Math.round(nutrientsPer100g.carbs * scale * 10) / 10,
        fat: Math.round(nutrientsPer100g.fat * scale * 10) / 10,
      };
      nutritionSource =
        (match.source as ResolvedFoodItem["nutritionSource"]) || "local";
      nutritionMatchConfidence = match.matchScore ?? 0.7;
    } else {
      // Fallback: ~150 cal/100g generic
      nutrientsPer100g = { calories: 150, protein: 5, carbs: 20, fat: 5 };
      const scale = grams / 100;
      nutrients = {
        calories: Math.round(nutrientsPer100g.calories * scale),
        protein: Math.round(nutrientsPer100g.protein * scale * 10) / 10,
        carbs: Math.round(nutrientsPer100g.carbs * scale * 10) / 10,
        fat: Math.round(nutrientsPer100g.fat * scale * 10) / 10,
      };
    }

    const newItem: ResolvedFoodItem = {
      detected: {
        label: name,
        visualDescription: "Manually added",
        portion: {
          grams,
          humanReadable: `${grams}g`,
          reasoning: "User specified",
        },
        confidence: 1,
        count: 0,
        itemSize: "unknown",
        isAmbiguous: false,
        alternatives: [],
        relativeArea: 0,
      },
      resolvedName: match?.name ?? name,
      nutritionSource,
      nutrients,
      nutrientsPer100g,
      confidence: {
        detection: 1,
        portion: 1,
        nutritionMatch: nutritionMatchConfidence,
        overall: nutritionMatchConfidence > 0.5 ? 0.8 : 0.5,
      },
      needsReview: nutritionMatchConfidence < 0.5,
      reviewReason:
        nutritionMatchConfidence < 0.5
          ? "Manually added — verify nutrition"
          : undefined,
    };

    // Track for correction persistence
    addedItemsRef.current = [...addedItemsRef.current, newItem];

    setResult((prev) => {
      if (!prev) return prev;
      const items = [...prev.items, newItem];
      const totals = items.reduce(
        (sum, i) => ({
          calories: sum.calories + i.nutrients.calories,
          protein: sum.protein + i.nutrients.protein,
          carbs: sum.carbs + i.nutrients.carbs,
          fat: sum.fat + i.nutrients.fat,
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      return {
        ...prev,
        items,
        totals: {
          calories: Math.round(totals.calories),
          protein: Math.round(totals.protein * 10) / 10,
          carbs: Math.round(totals.carbs * 10) / 10,
          fat: Math.round(totals.fat * 10) / 10,
        },
      };
    });
    setState("editing");
  }, []);

  // ── Confirm ──

  const confirm = useCallback(() => {
    if (!result) return;

    const mealTime = detectMealTime();
    const title =
      result.decomposition.mealSummary ||
      result.items.map((i) => i.resolvedName).join(", ");
    const emoji = getFoodEmoji(title, null) || "🍽️";

    // Convert to draft format for the existing meal persistence system
    setDraft({
      title,
      source: "camera",
      rawInput: `AI scan: ${result.decomposition.mealSummary}`,
      calories: result.totals.calories,
      protein: result.totals.protein,
      carbs: result.totals.carbs,
      fat: result.totals.fat,
      confidence: result.overallConfidence,
      parseMethod: "vision-ai-decomposition",
      emoji,
      mealTime,
      imageUri: imageUri ?? undefined,
      estimatedItems: result.items.map((item) => ({
        parsed: {
          name: item.detected.label,
          quantity: 1,
          unit: "serving",
          preparation: null,
          confidence: item.confidence.detection,
          rawFragment: item.detected.label,
        },
        matchedName: item.resolvedName,
        matchSource:
          item.nutritionSource === "local"
            ? "local-fallback"
            : item.nutritionSource,
        matchId: `vision_${item.detected.label}`,
        estimatedServings: 1,
        nutrients: item.nutrients,
        confidence: item.confidence.overall,
        needsUserConfirmation: item.needsReview,
        ambiguityReason: item.reviewReason,
        emoji: getFoodEmoji(item.resolvedName, null),
      })) as never[],
    });

    // Build and save the meal entry
    const draft = {
      title,
      source: "camera" as const,
      rawInput: `AI scan: ${result.decomposition.mealSummary}`,
      calories: result.totals.calories,
      protein: result.totals.protein,
      carbs: result.totals.carbs,
      fat: result.totals.fat,
      confidence: result.overallConfidence,
      parseMethod: "vision-ai-decomposition",
      emoji,
      mealTime,
      imageUri: imageUri ?? undefined,
    };

    const meal = buildMealEntryFromDraft({ draft });
    addMeal(meal);
    clearDraft();

    // Rebuild food memory
    rebuildFoodMemory([meal, ...meals]);

    // ── Telemetry (fire-and-forget) ──
    if (scanEventIdRef.current) {
      const telemetryUpdate = buildTelemetryUpdate(
        result,
        scanEventIdRef.current,
        originalItemsRef.current,
        removedItemsRef.current,
        addedItemsRef.current,
        tokensUsedRef.current
      );
      finalizeScanEvent(telemetryUpdate).catch(() => {});
      persistCorrections({
        scanEventId: scanEventIdRef.current,
        originalItems: originalItemsRef.current,
        finalItems: result.items,
        removedItems: removedItemsRef.current,
        addedItems: addedItemsRef.current,
      }).catch(() => {});
    }

    setState("confirmed");

    // Navigate back
    router.dismissAll();
    router.back();
  }, [result, setDraft, clearDraft, addMeal, meals, router]);

  // ── Reset ──

  const reset = useCallback(() => {
    setState("idle");
    setResult(null);
    setError(null);
    setImageUri(null);
    lastParamsRef.current = null;
    originalItemsRef.current = [];
    removedItemsRef.current = [];
    addedItemsRef.current = [];
    scanEventIdRef.current = null;
    tokensUsedRef.current = null;
  }, []);

  // ── Retry ──

  const retry = useCallback(async () => {
    if (lastParamsRef.current) {
      await analyze(lastParamsRef.current.uri, lastParamsRef.current.hint);
    }
  }, [analyze]);

  return {
    state,
    result,
    error,
    imageUri,
    analyze,
    updateItem,
    removeItem,
    addItem,
    confirm,
    reset,
    retry,
  };
}
