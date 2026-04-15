/**
 * Intra-Meal Deduplication
 *
 * Merges duplicate food items within a single meal before matching.
 * Catches accidental repeats from voice input ("toast and eggs and toast")
 * and shortened re-mentions ("protein shake … shake").
 *
 * Runs AFTER parsing, BEFORE matching — operates on ParsedFoodItem[].
 */

import type { ParsedFoodItem } from "./food-candidate.schema";

// ─── Normalization ───────────────────────────────────────────────────────────

/** Strip articles, trim, lowercase, collapse whitespace, basic de-plural */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(a|an|the|some|my)\b/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/s$/, ""); // naive de-plural: "eggs" → "egg"
}

// ─── Merge Logic ─────────────────────────────────────────────────────────────

/** Check if `short` is a meaningful substring of `long` (≥ 3 chars) */
function isSubstringMatch(short: string, long: string): boolean {
  if (short.length < 3) return false;
  return long.includes(short);
}

/**
 * Merge two items: sum quantities, keep the more descriptive entry.
 */
function mergeItems(
  keep: ParsedFoodItem,
  merge: ParsedFoodItem
): ParsedFoodItem {
  return {
    name: keep.name.length >= merge.name.length ? keep.name : merge.name,
    quantity: keep.quantity + merge.quantity,
    unit: keep.unit,
    preparation: keep.preparation ?? merge.preparation,
    confidence: Math.max(keep.confidence, merge.confidence),
    rawFragment: `${keep.rawFragment} + ${merge.rawFragment}`,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Deduplicate parsed food items within a single meal.
 *
 * Rules:
 * 1. Exact normalized name + same unit → merge (sum quantities)
 * 2. One name contains the other (≥ 3 chars) + same unit → merge (keep longer)
 * 3. Different names or different units → keep separate
 *
 * @example
 * deduplicateItems([
 *   { name: "toast", quantity: 1, unit: "piece", ... },
 *   { name: "eggs",  quantity: 2, unit: "piece", ... },
 *   { name: "toast", quantity: 1, unit: "piece", ... },
 * ])
 * // → [{ name: "toast", quantity: 2, unit: "piece" }, { name: "eggs", quantity: 2, unit: "piece" }]
 */
export function deduplicateItems(items: ParsedFoodItem[]): ParsedFoodItem[] {
  if (items.length <= 1) return items;

  // Track which items have been merged into another
  const merged = new Set<number>();
  const result: ParsedFoodItem[] = [];

  for (let i = 0; i < items.length; i++) {
    if (merged.has(i)) continue;

    let current = items[i];
    const normI = normalize(current.name);

    for (let j = i + 1; j < items.length; j++) {
      if (merged.has(j)) continue;

      const other = items[j];
      // Only merge items with the same unit
      if (current.unit !== other.unit) continue;

      const normJ = normalize(other.name);

      const isExact = normI === normJ;
      const isSubstring =
        isSubstringMatch(normI, normJ) || isSubstringMatch(normJ, normI);

      if (isExact || isSubstring) {
        current = mergeItems(current, other);
        merged.add(j);
      }
    }

    result.push(current);
  }

  return result;
}
