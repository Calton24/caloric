/**
 * Packaged Product Matcher
 *
 * Matches extracted product evidence against Open Food Facts.
 * Uses brand + product name + flavour for high-quality matches.
 * Falls back to visual category if OCR signals are weak.
 *
 * Returns ranked ProductCandidate[] ready for the confirmation UI.
 */

import { lookupBarcode as lookupBarcodeDataset } from "../../nutrition/matching/dataset-lookup.service";
import type { FoodMatch } from "../../nutrition/matching/matching.types";
import {
    lookupBarcode as lookupBarcodeOFF,
    searchOpenFoodFacts,
} from "../../nutrition/matching/openfoodfacts.service";
import { buildSearchQuery } from "../extraction/packaged-product-extractor";
import type { EvidenceBundle, MatchRoute, ProductCandidate } from "../types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function foodMatchToCandidate(
  match: FoodMatch,
  matchReasons: string[]
): ProductCandidate {
  return {
    name: match.name,
    brand: match.brand ?? null,
    nutrientsPer100g: {
      // OFF returns per-serving, we need to back-calculate per-100g
      // The service already scales, so we use the raw values and note serving size
      calories: match.nutrients.calories,
      protein: match.nutrients.protein,
      carbs: match.nutrients.carbs,
      fat: match.nutrients.fat,
    },
    packSizeGrams: null,
    servingSizeGrams: match.servingSize,
    servingDescription: match.servingDescription,
    source: match.source === "openfoodfacts" ? "openfoodfacts" : "usda",
    sourceId: match.sourceId,
    matchScore: match.matchScore,
    matchReasons,
  };
}

/**
 * Re-score candidates using evidence signals.
 * Boosts matches where brand, flavour, or weight align with OCR evidence.
 */
function rescoreWithEvidence(
  candidates: ProductCandidate[],
  evidence: EvidenceBundle
): ProductCandidate[] {
  return candidates
    .map((c) => {
      let bonus = 0;
      const reasons = [...c.matchReasons];

      const cName = (c.name + " " + (c.brand ?? "")).toLowerCase();

      // Brand match bonus
      if (evidence.ocr.brand) {
        const brandLower = evidence.ocr.brand.toLowerCase();
        if (cName.includes(brandLower)) {
          bonus += 0.15;
          reasons.push(`Brand match: ${evidence.ocr.brand}`);
        }
      }

      // Flavour match bonus
      if (evidence.ocr.flavour) {
        const flavourLower = evidence.ocr.flavour.toLowerCase();
        if (cName.includes(flavourLower)) {
          bonus += 0.1;
          reasons.push(`Flavour match: ${evidence.ocr.flavour}`);
        }
      }

      // Weight/pack size alignment
      if (evidence.ocr.weightGrams && c.servingSizeGrams) {
        const ratio = evidence.ocr.weightGrams / c.servingSizeGrams;
        // If the detected weight matches serving size (within 20%), boost
        if (ratio >= 0.8 && ratio <= 1.2) {
          bonus += 0.1;
          reasons.push(`Weight matches: ${evidence.ocr.weightText}`);
        }
        c.packSizeGrams = evidence.ocr.weightGrams;
      }

      // Category alignment
      if (evidence.visual.category) {
        const catLower = evidence.visual.category.toLowerCase();
        if (cName.includes(catLower)) {
          bonus += 0.05;
        }
      }

      return {
        ...c,
        matchScore: Math.min(c.matchScore + bonus, 1.0),
        matchReasons: reasons,
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Match the evidence bundle to product candidates.
 *
 * @param evidence  The extracted evidence bundle
 * @param route     The matching route chosen by the source router
 * @returns         Ranked list of product candidates
 */
export async function matchPackagedProduct(
  evidence: EvidenceBundle,
  route: MatchRoute
): Promise<ProductCandidate[]> {
  try {
    switch (route) {
      // ── Barcode lookup ───────────────────────────────────────
      case "barcode_lookup": {
        if (!evidence.barcode) return [];
        // Try local dataset first (1.84M branded), fall back to OFF
        const barcodeMatch =
          (await lookupBarcodeDataset(evidence.barcode)) ??
          (await lookupBarcodeOFF(evidence.barcode));
        if (!barcodeMatch) return [];

        const candidate = foodMatchToCandidate(barcodeMatch, [
          `Barcode: ${evidence.barcode}`,
        ]);

        if (evidence.ocr.weightGrams) {
          candidate.packSizeGrams = evidence.ocr.weightGrams;
        }

        return [candidate];
      }

      // ── Nutrition label direct ───────────────────────────────
      case "nutrition_label_direct": {
        if (!evidence.ocr.nutritionLabel) return [];

        const label = evidence.ocr.nutritionLabel;
        const name =
          evidence.ocr.productName ??
          evidence.userDescription ??
          "Scanned product";

        return [
          {
            name,
            brand: evidence.ocr.brand,
            nutrientsPer100g: {
              calories: label.calories ?? 0,
              protein: label.protein ?? 0,
              carbs: label.carbs ?? 0,
              fat: label.fat ?? 0,
            },
            packSizeGrams: evidence.ocr.weightGrams,
            servingSizeGrams: evidence.ocr.weightGrams ?? 100,
            servingDescription: evidence.ocr.weightText ?? "per serving",
            source: "ocr_label",
            sourceId: "label-scan",
            matchScore: 0.85,
            matchReasons: ["Nutrition label OCR"],
          },
        ];
      }

      // ── Packaged product search ──────────────────────────────
      case "packaged_product_search": {
        const query = buildSearchQuery(evidence.ocr);
        if (!query.trim()) return [];

        const offResults = await searchOpenFoodFacts(query, 5, "gb");

        const candidates = offResults.map((m) =>
          foodMatchToCandidate(m, [`OFF search: "${query}"`])
        );

        return rescoreWithEvidence(candidates, evidence);
      }

      // ── Generic / description only fallback ──────────────────
      case "description_only":
      case "generic_meal_pipeline": {
        // For non-packaged foods, try OFF search with the raw description
        const searchText =
          evidence.userDescription ??
          evidence.ocr.productName ??
          evidence.visual.category;

        if (!searchText?.trim()) return [];

        const results = await searchOpenFoodFacts(searchText, 3, "gb");
        return results.map((m) =>
          foodMatchToCandidate(m, [`Text search: "${searchText}"`])
        );
      }

      default:
        return [];
    }
  } catch (err) {
    console.warn("Packaged product matching failed:", err);
    return [];
  }
}
