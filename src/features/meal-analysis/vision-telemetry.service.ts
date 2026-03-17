/**
 * Vision Telemetry Service
 *
 * Handles two post-scan responsibilities:
 *   1. Update the food_scan_events row with final client-side data
 *      (resolved items, original/final totals, correction counts, confidence band)
 *   2. Persist per-item corrections to vision_item_corrections table
 *      (what the model predicted vs what the user changed)
 *
 * All writes are fire-and-forget — failures never block UX.
 */

import { getSupabaseClient } from "../../lib/supabase/client";
import type {
  MealAnalysisResult,
  ResolvedFoodItem,
  ScanTelemetryUpdate,
  VisionCorrectionRecord,
} from "./meal-analysis.types";

// ─── Finalize Scan Event ────────────────────────────────────────────────────

/**
 * Update the food_scan_events row created by the Edge Function
 * with final client-side data after user confirms.
 */
export async function finalizeScanEvent(
  update: ScanTelemetryUpdate
): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !update.scanEventId) return;

  try {
    await client
      .from("food_scan_events")
      .update({
        resolved_items: update.resolvedItems,
        confidence_band: update.confidenceBand,
        original_totals: update.originalTotals,
        final_totals: update.finalTotals,
        items_added: update.itemsAdded,
        items_removed: update.itemsRemoved,
        items_portion_edited: update.itemsPortionEdited,
        confirmed_by_user: true,
        edited_by_user:
          update.itemsAdded > 0 ||
          update.itemsRemoved > 0 ||
          update.itemsPortionEdited > 0,
        final_food_name: update.resolvedItems
          .map((i) => i.resolvedName)
          .join(", "),
        final_calories: update.finalTotals.calories,
        final_protein: update.finalTotals.protein,
        final_carbs: update.finalTotals.carbs,
        final_fat: update.finalTotals.fat,
      })
      .eq("id", update.scanEventId);
  } catch (e) {
    console.warn("[VisionTelemetry] finalizeScanEvent error:", e);
  }
}

// ─── Persist Corrections ────────────────────────────────────────────────────

/**
 * Compute and persist per-item corrections by diffing original vs final items.
 * Writes to vision_item_corrections table for learning/analytics.
 */
export async function persistCorrections(params: {
  scanEventId: string;
  originalItems: ResolvedFoodItem[];
  finalItems: ResolvedFoodItem[];
  removedItems: ResolvedFoodItem[];
  addedItems: ResolvedFoodItem[];
}): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !params.scanEventId) return;

  try {
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return;

    const corrections: VisionCorrectionRecord[] = [];

    // Detect portion/name/macro edits by matching original → final
    for (const original of params.originalItems) {
      const final = params.finalItems.find(
        (f) => f.detected.label === original.detected.label
      );

      if (!final) {
        // Item was removed
        corrections.push({
          originalLabel: original.resolvedName,
          originalGrams: original.detected.portion.grams,
          originalCalories: original.nutrients.calories,
          originalConfidence: original.confidence.overall,
          correctedLabel: null,
          correctedGrams: null,
          correctedCalories: null,
          correctionType: "removed",
        });
        continue;
      }

      // Check for portion edit
      if (final.detected.portion.grams !== original.detected.portion.grams) {
        corrections.push({
          originalLabel: original.resolvedName,
          originalGrams: original.detected.portion.grams,
          originalCalories: original.nutrients.calories,
          originalConfidence: original.confidence.overall,
          correctedLabel: final.resolvedName,
          correctedGrams: final.detected.portion.grams,
          correctedCalories: final.nutrients.calories,
          correctionType: "portion_edit",
        });
      }

      // Check for name edit
      if (final.resolvedName !== original.resolvedName) {
        corrections.push({
          originalLabel: original.resolvedName,
          originalGrams: original.detected.portion.grams,
          originalCalories: original.nutrients.calories,
          originalConfidence: original.confidence.overall,
          correctedLabel: final.resolvedName,
          correctedGrams: final.detected.portion.grams,
          correctedCalories: final.nutrients.calories,
          correctionType: "name_edit",
        });
      }
    }

    // Record added items
    for (const added of params.addedItems) {
      corrections.push({
        originalLabel: "",
        originalGrams: null,
        originalCalories: null,
        originalConfidence: null,
        correctedLabel: added.resolvedName,
        correctedGrams: added.detected.portion.grams,
        correctedCalories: added.nutrients.calories,
        correctionType: "added",
      });
    }

    // Record explicitly removed items (from removedItems tracking)
    for (const removed of params.removedItems) {
      // Skip if already recorded from the original→final diff
      const alreadyRecorded = corrections.some(
        (c) =>
          c.correctionType === "removed" &&
          c.originalLabel === removed.resolvedName
      );
      if (alreadyRecorded) continue;

      corrections.push({
        originalLabel: removed.resolvedName,
        originalGrams: removed.detected.portion.grams,
        originalCalories: removed.nutrients.calories,
        originalConfidence: removed.confidence.overall,
        correctedLabel: null,
        correctedGrams: null,
        correctedCalories: null,
        correctionType: "removed",
      });
    }

    if (corrections.length === 0) return;

    // Batch insert corrections
    const rows = corrections.map((c) => ({
      scan_event_id: params.scanEventId,
      user_id: userData.user.id,
      original_label: c.originalLabel,
      original_grams: c.originalGrams,
      original_calories: c.originalCalories,
      original_confidence: c.originalConfidence,
      corrected_label: c.correctedLabel,
      corrected_grams: c.correctedGrams,
      corrected_calories: c.correctedCalories,
      correction_type: c.correctionType,
    }));

    const { error } = await client.from("vision_item_corrections").insert(rows);

    if (error) {
      console.warn(
        "[VisionTelemetry] persistCorrections error:",
        error.message
      );
    }
  } catch (e) {
    console.warn("[VisionTelemetry] persistCorrections error:", e);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Compute correction counts from original vs final items.
 */
export function computeCorrectionCounts(
  originalItems: ResolvedFoodItem[],
  finalItems: ResolvedFoodItem[],
  removedItems: ResolvedFoodItem[],
  addedItems: ResolvedFoodItem[]
): { portionEdited: number; removed: number; added: number } {
  let portionEdited = 0;

  for (const original of originalItems) {
    const final = finalItems.find(
      (f) => f.detected.label === original.detected.label
    );
    if (
      final &&
      final.detected.portion.grams !== original.detected.portion.grams
    ) {
      portionEdited++;
    }
  }

  return {
    portionEdited,
    removed: removedItems.length,
    added: addedItems.length,
  };
}

/**
 * Build a ScanTelemetryUpdate from the analysis result and correction data.
 */
export function buildTelemetryUpdate(
  result: MealAnalysisResult,
  scanEventId: string,
  originalItems: ResolvedFoodItem[],
  removedItems: ResolvedFoodItem[],
  addedItems: ResolvedFoodItem[],
  tokensUsed: number | null
): ScanTelemetryUpdate {
  const counts = computeCorrectionCounts(
    originalItems,
    result.items,
    removedItems,
    addedItems
  );

  const originalTotals = originalItems.reduce(
    (sum, i) => ({
      calories: sum.calories + i.nutrients.calories,
      protein: sum.protein + i.nutrients.protein,
      carbs: sum.carbs + i.nutrients.carbs,
      fat: sum.fat + i.nutrients.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );

  return {
    scanEventId,
    visionModel: "gpt-4o-mini",
    visionLatencyMs: result.modelLatencyMs,
    visionTokensUsed: tokensUsed,
    decomposition: result.decomposition,
    resolvedItems: result.items,
    confidenceBand: result.confidenceBand,
    originalTotals,
    finalTotals: result.totals,
    itemsAdded: counts.added,
    itemsRemoved: counts.removed,
    itemsPortionEdited: counts.portionEdited,
  };
}
