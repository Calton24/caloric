/**
 * Source Router
 *
 * Decides whether to prefer USDA or Open Food Facts for a given food item,
 * and how to rank candidates from both sources.
 *
 * Rules:
 *   - Branded/packaged items → OFF first, USDA second
 *   - Generic/raw foods → USDA first, OFF second
 *   - Non-food / zero-cal ontology hits → skip API, use ontology directly
 *   - Beverages without modifiers → use ontology defaults
 */

import type { FoodCategory, OntologyEntry } from "../ontology/food-ontology";
import {
    detectBrandedIntent,
    detectModifiers,
    lookupOntology,
} from "../ontology/food-ontology";
import type { ParsedFoodItem } from "../parsing/food-candidate.schema";
import type { FoodMatch } from "./matching.types";

// ─── Types ───────────────────────────────────────────────────────────────────

export type SourcePreference = "usda-first" | "off-first" | "ontology-only";

export interface RoutingDecision {
  /** Which source to prefer */
  preference: SourcePreference;
  /** Ontology entry if found */
  ontologyEntry: OntologyEntry | null;
  /** Detected modifiers from input */
  detectedModifiers: string[];
  /** Whether the input looks branded */
  isBranded: boolean;
  /** The category from ontology (if found) */
  category: FoodCategory | null;
  /** If true, skip API calls and use ontology defaults directly */
  useOntologyDefaults: boolean;
  /** Assumption label for UI (e.g., "Assuming black coffee") */
  assumptionLabel: string | undefined;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Determine the routing strategy for a parsed food item.
 */
export function routeSource(item: ParsedFoodItem): RoutingDecision {
  const entry = lookupOntology(item.name);
  const rawText = item.rawFragment || item.name;
  const isBranded = detectBrandedIntent(rawText);

  // No ontology entry — use general routing
  if (!entry) {
    return {
      preference: isBranded ? "off-first" : "usda-first",
      ontologyEntry: null,
      detectedModifiers: [],
      isBranded,
      category: null,
      useOntologyDefaults: false,
      assumptionLabel: undefined,
    };
  }

  const detectedModifiers = detectModifiers(rawText, entry);

  // Non-food: always use ontology, skip API
  if (entry.category === "non-food") {
    return {
      preference: "ontology-only",
      ontologyEntry: entry,
      detectedModifiers,
      isBranded: false,
      category: entry.category,
      useOntologyDefaults: true,
      assumptionLabel: undefined,
    };
  }

  // Beverage without modifiers: use ontology defaults (black coffee = 2 kcal)
  if (
    entry.category === "beverage" &&
    detectedModifiers.length === 0 &&
    !isBranded
  ) {
    return {
      preference: "ontology-only",
      ontologyEntry: entry,
      detectedModifiers,
      isBranded: false,
      category: entry.category,
      useOntologyDefaults: true,
      assumptionLabel: entry.clarifyIfModifiersMissing
        ? `Assuming ${entry.defaultAssumption}`
        : undefined,
    };
  }

  // Beverage WITH modifiers: search APIs but using the full modified name
  if (entry.category === "beverage" && detectedModifiers.length > 0) {
    return {
      preference:
        isBranded || entry.preferOffIfBranded ? "off-first" : "usda-first",
      ontologyEntry: entry,
      detectedModifiers,
      isBranded,
      category: entry.category,
      useOntologyDefaults: false,
      assumptionLabel: undefined,
    };
  }

  // Branded intent: prefer OFF
  if (isBranded || entry.preferOffIfBranded) {
    return {
      preference: "off-first",
      ontologyEntry: entry,
      detectedModifiers,
      isBranded: true,
      category: entry.category,
      useOntologyDefaults: false,
      assumptionLabel: undefined,
    };
  }

  // Default: use USDA first for generic foods
  return {
    preference: "usda-first",
    ontologyEntry: entry,
    detectedModifiers,
    isBranded: false,
    category: entry.category,
    useOntologyDefaults: false,
    assumptionLabel:
      entry.clarifyIfModifiersMissing && detectedModifiers.length === 0
        ? `Assuming ${entry.defaultAssumption}`
        : undefined,
  };
}

/**
 * Build a FoodMatch from ontology defaults (no API call needed).
 */
export function buildOntologyMatch(
  entry: OntologyEntry,
  foodName: string
): FoodMatch {
  return {
    source: "local-fallback",
    sourceId: `ontology_${foodName.toLowerCase().replace(/\s+/g, "_")}`,
    name: entry.defaultAssumption,
    nutrients: {
      calories: entry.defaultCalories,
      protein: entry.defaultProtein,
      carbs: entry.defaultCarbs,
      fat: entry.defaultFat,
    },
    servingSize: 240, // beverages default to 240ml
    servingUnit: "ml",
    servingDescription: entry.servingDescription,
    matchScore: 0.85, // high confidence — ontology is authoritative for these
  };
}
