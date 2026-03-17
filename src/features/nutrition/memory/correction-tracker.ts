/**
 * Meal Correction Tracker
 *
 * Captures the delta between pipeline estimates and user-confirmed values.
 * This data enables:
 *   - Measuring pipeline accuracy over time
 *   - Identifying systematic biases (e.g., always over-estimating rice)
 *   - Training data for model improvement
 *   - Confidence weight calibration
 */

import { analytics } from "../../../infrastructure/analytics";
import { MealDraft } from "../nutrition.draft.types";
import { recordItemCorrections } from "./portion-learning.service";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface MealCorrection {
  /** Original pipeline estimate */
  original: {
    title: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    confidence: number;
    parseMethod: string;
    source: string;
  };
  /** User-confirmed final values */
  confirmed: {
    title: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  /** Whether the user changed anything */
  wasEdited: boolean;
  /** Specific fields that were changed */
  editedFields: string[];
  /** Calorie delta (confirmed - original) */
  calorieDelta: number;
  /** Timestamp */
  timestamp: string;
}

// ─── Snapshot Storage ───────────────────────────────────────────────────────

let originalSnapshot: {
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  parseMethod: string;
  source: string;
} | null = null;

/** Per-item original calorie snapshots for portion learning */
let originalItemSnapshots: {
  name: string;
  calories: number;
}[] = [];

/**
 * Capture the pipeline's original estimate before user edits.
 * Called when the confirm-meal screen first loads.
 */
export function captureOriginalEstimate(draft: MealDraft): void {
  originalSnapshot = {
    title: draft.title,
    calories: draft.calories,
    protein: draft.protein,
    carbs: draft.carbs,
    fat: draft.fat,
    confidence: draft.confidence ?? 0,
    parseMethod: draft.parseMethod ?? "unknown",
    source: draft.source,
  };

  // Capture per-item originals for portion learning
  originalItemSnapshots =
    draft.estimatedItems?.map((item) => ({
      name: item.parsed?.name ?? item.matchedName ?? "unknown",
      calories: item.nutrients.calories,
    })) ?? [];
}

/**
 * Compare the final confirmed values against the original estimate.
 * Called when the user presses "Confirm & Log".
 *
 * Returns the correction record and fires analytics events.
 */
export function trackCorrection(finalDraft: MealDraft): MealCorrection | null {
  if (!originalSnapshot) return null;

  const editedFields: string[] = [];

  if (finalDraft.title !== originalSnapshot.title) editedFields.push("title");
  if (finalDraft.calories !== originalSnapshot.calories)
    editedFields.push("calories");
  if (finalDraft.protein !== originalSnapshot.protein)
    editedFields.push("protein");
  if (finalDraft.carbs !== originalSnapshot.carbs) editedFields.push("carbs");
  if (finalDraft.fat !== originalSnapshot.fat) editedFields.push("fat");

  const correction: MealCorrection = {
    original: {
      title: originalSnapshot.title,
      calories: originalSnapshot.calories,
      protein: originalSnapshot.protein,
      carbs: originalSnapshot.carbs,
      fat: originalSnapshot.fat,
      confidence: originalSnapshot.confidence,
      parseMethod: originalSnapshot.parseMethod,
      source: originalSnapshot.source,
    },
    confirmed: {
      title: finalDraft.title,
      calories: finalDraft.calories,
      protein: finalDraft.protein,
      carbs: finalDraft.carbs,
      fat: finalDraft.fat,
    },
    wasEdited: editedFields.length > 0,
    editedFields,
    calorieDelta: finalDraft.calories - originalSnapshot.calories,
    timestamp: new Date().toISOString(),
  };

  // Fire analytics
  analytics.track("meal_logged", {
    source: originalSnapshot.source,
    parseMethod: originalSnapshot.parseMethod,
    confidence: originalSnapshot.confidence,
    calories: finalDraft.calories,
    wasEdited: correction.wasEdited,
    editedFields: editedFields.join(","),
    calorieDelta: correction.calorieDelta,
  });

  if (correction.wasEdited) {
    analytics.track("meal_corrected", {
      source: originalSnapshot.source,
      parseMethod: originalSnapshot.parseMethod,
      confidence: originalSnapshot.confidence,
      editedFields: editedFields.join(","),
      originalCalories: originalSnapshot.calories,
      confirmedCalories: finalDraft.calories,
      calorieDelta: correction.calorieDelta,
      originalProtein: originalSnapshot.protein,
      confirmedProtein: finalDraft.protein,
    });

    // Feed per-item corrections into the portion learning loop
    if (
      finalDraft.estimatedItems &&
      finalDraft.estimatedItems.length > 0 &&
      originalItemSnapshots.length === finalDraft.estimatedItems.length
    ) {
      const itemCorrections = originalItemSnapshots.map((orig, i) => ({
        name: orig.name,
        originalCalories: orig.calories,
        confirmedCalories: finalDraft.estimatedItems![i].nutrients.calories,
      }));
      recordItemCorrections(itemCorrections);
    } else if (originalItemSnapshots.length === 0) {
      // Single-item meal — use meal-level correction
      recordItemCorrections([
        {
          name: finalDraft.title,
          originalCalories: originalSnapshot.calories,
          confirmedCalories: finalDraft.calories,
        },
      ]);
    }
  }

  // Clear snapshots
  originalSnapshot = null;
  originalItemSnapshots = [];

  return correction;
}

/**
 * Clear the snapshot without tracking (e.g., user cancelled).
 */
export function clearOriginalEstimate(): void {
  originalSnapshot = null;
  originalItemSnapshots = [];
}
