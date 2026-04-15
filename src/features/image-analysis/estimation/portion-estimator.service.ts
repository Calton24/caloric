/**
 * Portion Estimator
 *
 * Generates portion options for the confirmation UI.
 * For packaged products: full pack, half pack, quarter pack, one serving.
 * For plated meals: standard portion with adjustable multiplier.
 */

import type { NutrientProfile } from "../../nutrition/matching/matching.types";
import type { PortionOption, ProductCandidate } from "../types";

/**
 * Scale nutrients by a multiplier (e.g., grams / servingGrams).
 */
function scaleNutrients(
  nutrients: NutrientProfile,
  multiplier: number
): NutrientProfile {
  return {
    calories: Math.round(nutrients.calories * multiplier),
    protein: Math.round(nutrients.protein * multiplier * 10) / 10,
    carbs: Math.round(nutrients.carbs * multiplier * 10) / 10,
    fat: Math.round(nutrients.fat * multiplier * 10) / 10,
    ...(nutrients.fiber !== undefined
      ? { fiber: Math.round(nutrients.fiber * multiplier * 10) / 10 }
      : {}),
    ...(nutrients.sugar !== undefined
      ? { sugar: Math.round(nutrients.sugar * multiplier * 10) / 10 }
      : {}),
    ...(nutrients.sodium !== undefined
      ? { sodium: Math.round(nutrients.sodium * multiplier) }
      : {}),
  };
}

/**
 * Generate portion options for a packaged product.
 * Uses pack size if known, otherwise serving size.
 */
export function buildPortionOptions(
  candidate: ProductCandidate
): PortionOption[] {
  const options: PortionOption[] = [];
  const packSize = candidate.packSizeGrams;
  const servingSize = candidate.servingSizeGrams;

  // Calculate base calories per gram
  const caloriesPerGram = candidate.nutrientsPer100g.calories / servingSize;
  // We use nutrients directly since they're already scaled to serving size
  const baseNutrients = candidate.nutrientsPer100g;

  if (packSize && packSize > 0) {
    // ── Pack-based portions ────────────────────────────────────
    const fullPackCal = Math.round(caloriesPerGram * packSize);
    const halfPackCal = Math.round(caloriesPerGram * packSize * 0.5);
    const quarterPackCal = Math.round(caloriesPerGram * packSize * 0.25);

    options.push({
      preset: "full_pack",
      label: `Full pack (${packSize}g)`,
      grams: packSize,
      calories: fullPackCal,
      isDefault: true,
    });

    if (packSize > 50) {
      options.push({
        preset: "half_pack",
        label: `Half pack (${Math.round(packSize / 2)}g)`,
        grams: Math.round(packSize / 2),
        calories: halfPackCal,
        isDefault: false,
      });
    }

    if (packSize > 100) {
      options.push({
        preset: "quarter_pack",
        label: `Quarter pack (${Math.round(packSize / 4)}g)`,
        grams: Math.round(packSize / 4),
        calories: quarterPackCal,
        isDefault: false,
      });
    }

    // Add a single serving option if serving size != pack size
    if (servingSize > 0 && Math.abs(servingSize - packSize) > 5) {
      options.push({
        preset: "one_serving",
        label: `1 serving (${servingSize}g)`,
        grams: servingSize,
        calories: baseNutrients.calories,
        isDefault: false,
      });
    }
  } else {
    // ── Serving-based only ─────────────────────────────────────
    options.push({
      preset: "one_serving",
      label: candidate.servingDescription || `1 serving (${servingSize}g)`,
      grams: servingSize,
      calories: baseNutrients.calories,
      isDefault: true,
    });

    // Double serving
    options.push({
      preset: "full_pack",
      label: `2 servings (${servingSize * 2}g)`,
      grams: servingSize * 2,
      calories: baseNutrients.calories * 2,
      isDefault: false,
    });

    // Half serving
    if (servingSize > 20) {
      options.push({
        preset: "half_pack",
        label: `Half serving (${Math.round(servingSize / 2)}g)`,
        grams: Math.round(servingSize / 2),
        calories: Math.round(baseNutrients.calories / 2),
        isDefault: false,
      });
    }
  }

  // Always add custom
  const defaultOption = options.find((o) => o.isDefault) ?? options[0];
  options.push({
    preset: "custom",
    label: "Custom amount",
    grams: defaultOption?.grams ?? servingSize,
    calories: defaultOption?.calories ?? baseNutrients.calories,
    isDefault: false,
  });

  return options;
}

/**
 * Calculate nutrients for a specific portion amount.
 */
export function calculatePortionNutrients(
  candidate: ProductCandidate,
  portionGrams: number
): NutrientProfile {
  const multiplier = portionGrams / candidate.servingSizeGrams;
  return scaleNutrients(candidate.nutrientsPer100g, multiplier);
}
