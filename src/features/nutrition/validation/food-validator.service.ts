/**
 * Food Validation Service
 *
 * Post-pipeline validation layer that catches nonsensical results
 * before they reach the user. Validates:
 *
 *   1. Food name looks like real food (not garbage OCR/label artifacts)
 *   2. Macro ratios are physically possible (protein + carbs + fat ≈ calories)
 *   3. Per-serving values are in sane ranges
 *   4. Calorie density (kcal/g) is within food-possible bounds
 *   5. Non-food object detection (furniture, clothes etc.)
 *
 * "Better to show 'could not identify' than '8 R — 2280 kcal turkey'."
 */

// ─── Validation Types ───────────────────────────────────────────────────────

export interface ValidationResult {
  /** Whether the food passed all checks */
  valid: boolean;
  /** Specific issues found (empty if valid) */
  issues: ValidationIssue[];
  /** Adjusted confidence multiplier (0.0–1.0) applied to pipeline confidence */
  confidenceMultiplier: number;
}

export interface ValidationIssue {
  type:
    | "garbage-name"
    | "macro-impossible"
    | "calorie-extreme"
    | "density-impossible"
    | "not-food";
  message: string;
}

// ─── Non-Food Detection ─────────────────────────────────────────────────────

/**
 * Words that are definitely not food — catches ML Kit labels and OCR artifacts
 * that slip through the pipeline as food names.
 */
const NON_FOOD_NAMES = new Set([
  // Objects
  "table",
  "chair",
  "desk",
  "shelf",
  "wall",
  "floor",
  "ceiling",
  "window",
  "door",
  "lamp",
  "light",
  "screen",
  "phone",
  "laptop",
  "computer",
  "keyboard",
  "mouse",
  "monitor",
  "book",
  "pen",
  "paper",
  "bag",
  "box",
  "bottle",
  "container",
  "wrapper",
  // Furniture & surfaces
  "wood",
  "metal",
  "plastic",
  "glass",
  "fabric",
  "ceramic",
  "marble",
  "granite",
  "steel",
  "iron",
  // Body parts
  "hand",
  "finger",
  "arm",
  "face",
  "person",
  "human",
  "skin",
  // Nature
  "tree",
  "grass",
  "sky",
  "cloud",
  "flower",
  "leaf",
  // Other non-food
  "unknown",
  "undefined",
  "null",
  "error",
  "n/a",
  "none",
  "the",
  "a",
  "an",
  "it",
  "this",
  "that",
]);

// ─── Name Validation ────────────────────────────────────────────────────────

/**
 * Characters and patterns that indicate garbage input, not real food names.
 * These catch OCR artifacts, barcode fragments, and random label noise.
 */
const GARBAGE_PATTERNS = [
  /^\d+$/, // Pure numbers: "8", "123"
  /^[^a-zA-Z]*$/, // No letters at all: "8 .", "# @"
  /^[a-zA-Z]$/, // Single letter: "r", "x"
  /^[a-zA-Z]{1,2}\s*\d/, // Letter(s) + number: "8 r", "a2"
  /^\d+\s*[a-zA-Z]{1,2}$/, // Number + letter(s): "8 r", "12g"
  /^[^a-zA-Z]*[a-zA-Z][^a-zA-Z]*$/, // Single letter surrounded by non-letters
  /[^\w\s\-',.&()éèêëàâäùûüïîôöçñ]/i, // Unusual characters (allows accented food names)
  /^(the|a|an|this|that|it|my|your)\s*$/i, // Pure articles/pronouns
  /^\d{8,}$/, // Barcode numbers (8+ digits)
];

/**
 * Minimum word length for a food name to be considered valid.
 * "pie" = 3 chars, "go" = too short and ambiguous.
 */
const MIN_NAME_LENGTH = 3;

/**
 * Check if a food name looks like a real food (not garbage).
 */
function validateFoodName(name: string): ValidationIssue | null {
  const trimmed = name.trim();

  if (trimmed.length < MIN_NAME_LENGTH) {
    return {
      type: "garbage-name",
      message: `Name too short: "${trimmed}" (${trimmed.length} chars)`,
    };
  }

  // Check non-food names
  if (NON_FOOD_NAMES.has(trimmed.toLowerCase())) {
    return {
      type: "not-food",
      message: `"${trimmed}" is not a food item`,
    };
  }

  for (const pattern of GARBAGE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return {
        type: "garbage-name",
        message: `Name looks like garbage: "${trimmed}"`,
      };
    }
  }

  return null;
}

// ─── Macro Validation ───────────────────────────────────────────────────────

/**
 * Check if the macros are physically possible.
 *
 * Macro energy equation:
 *   kcal ≈ protein×4 + carbs×4 + fat×9
 *
 * We allow a generous tolerance because:
 *   - Fiber (counted in carbs) has ~2 kcal/g not 4
 *   - Alcohol has 7 kcal/g
 *   - Rounding errors in databases
 *   - Sugar alcohols are ~2.5 kcal/g
 */
function validateMacros(
  calories: number,
  protein: number,
  carbs: number,
  fat: number
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Negative values are always wrong
  if (protein < 0 || carbs < 0 || fat < 0 || calories < 0) {
    issues.push({
      type: "macro-impossible",
      message: "Negative macro values detected",
    });
    return issues;
  }

  // Zero calories with macros present
  if (calories === 0 && (protein > 1 || carbs > 1 || fat > 1)) {
    issues.push({
      type: "macro-impossible",
      message: "0 calories but macros are non-zero",
    });
  }

  // Calculate expected calories from macros
  if (calories > 0) {
    const expectedCal = protein * 4 + carbs * 4 + fat * 9;
    const ratio = expectedCal / calories;

    // Allow generous tolerance (0.4x to 2.5x) for database quirks
    if (ratio > 2.5) {
      issues.push({
        type: "macro-impossible",
        message: `Macro-calculated kcal (${Math.round(expectedCal)}) is ${ratio.toFixed(1)}x the stated kcal (${calories})`,
      });
    } else if (expectedCal > 10 && ratio < 0.4) {
      issues.push({
        type: "macro-impossible",
        message: `Macro-calculated kcal (${Math.round(expectedCal)}) is only ${(ratio * 100).toFixed(0)}% of stated kcal (${calories})`,
      });
    }
  }

  // Individual macro sanity: no single macro should exceed total grams of the serving
  // (A 100g food can't have 200g of protein)
  const totalMacroGrams = protein + carbs + fat;
  if (totalMacroGrams > 0 && calories > 0) {
    // Rough serving estimate: kcal / 1.5 ≈ typical grams for mixed food
    const estimatedGrams = calories / 1.5;
    if (totalMacroGrams > estimatedGrams * 3) {
      issues.push({
        type: "macro-impossible",
        message: `Total macros (${Math.round(totalMacroGrams)}g) far exceed plausible serving size`,
      });
    }
  }

  return issues;
}

// ─── Calorie Sanity ─────────────────────────────────────────────────────────

/**
 * Check if per-serving calories are in a sane range.
 * No single food item should be 0 or > 3000 kcal per serving
 * (even a full pizza is ~2000 kcal total).
 */
function validateCalorieRange(calories: number): ValidationIssue | null {
  if (calories > 3000) {
    return {
      type: "calorie-extreme",
      message: `${calories} kcal per serving is unreasonably high`,
    };
  }
  return null;
}

// ─── Calorie Density Validation ─────────────────────────────────────────────

/**
 * Validate calorie density (kcal per gram) is within food-possible bounds.
 * Pure fat (oil) ≈ 9 kcal/g is the densest possible food.
 * Water/vegetables can be < 0.1 kcal/g.
 * Anything > 10 kcal/g is physically impossible.
 */
function validateCalorieDensity(
  calories: number,
  servingGrams: number
): ValidationIssue | null {
  if (servingGrams <= 0 || calories <= 0) return null;

  const density = calories / servingGrams;

  // Pure fat (oil) is ~9 kcal/g — nothing can exceed that significantly
  if (density > 10) {
    return {
      type: "density-impossible",
      message: `Calorie density ${density.toFixed(1)} kcal/g is physically impossible (max ~9 kcal/g for pure fat)`,
    };
  }

  return null;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Validate a food result from the pipeline.
 *
 * @param name      The matched food name
 * @param calories  Calories per serving
 * @param protein   Grams protein per serving
 * @param carbs     Grams carbs per serving
 * @param fat       Grams fat per serving
 * @param servingGrams  Optional: grams per serving (for density check)
 * @returns         Validation result with issues and confidence multiplier
 */
export function validateFoodResult(
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  servingGrams?: number
): ValidationResult {
  const issues: ValidationIssue[] = [];

  // 1. Name validation
  const nameIssue = validateFoodName(name);
  if (nameIssue) issues.push(nameIssue);

  // 2. Macro validation
  const macroIssues = validateMacros(calories, protein, carbs, fat);
  issues.push(...macroIssues);

  // 3. Calorie range validation
  const calorieIssue = validateCalorieRange(calories);
  if (calorieIssue) issues.push(calorieIssue);

  // 4. Calorie density validation (if serving size available)
  if (servingGrams && servingGrams > 0) {
    const densityIssue = validateCalorieDensity(calories, servingGrams);
    if (densityIssue) issues.push(densityIssue);
  }

  // Calculate confidence multiplier based on issues
  let confidenceMultiplier = 1.0;
  for (const issue of issues) {
    switch (issue.type) {
      case "garbage-name":
        confidenceMultiplier *= 0.1; // huge penalty — likely wrong food
        break;
      case "not-food":
        confidenceMultiplier *= 0.05; // even worse — definitely not food
        break;
      case "macro-impossible":
        confidenceMultiplier *= 0.4; // suspicious but might be rounding
        break;
      case "calorie-extreme":
        confidenceMultiplier *= 0.3; // likely wrong serving size
        break;
      case "density-impossible":
        confidenceMultiplier *= 0.2; // physically impossible
        break;
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    confidenceMultiplier: Math.max(0.05, confidenceMultiplier),
  };
}

// ─── Candidate Pre-Ranking Validation ───────────────────────────────────────

/**
 * Quick validation for API candidates BEFORE ranking.
 * Lighter-weight than full validation — just catches obvious bad data
 * so it doesn't pollute the ranker.
 *
 * Returns true if the candidate is plausible enough to rank.
 */
export function isCandidatePlausible(
  name: string,
  calories: number,
  protein: number,
  carbs: number,
  fat: number,
  servingSizeGrams?: number
): boolean {
  // Reject garbage names
  if (name.trim().length < 2) return false;
  if (NON_FOOD_NAMES.has(name.toLowerCase().trim())) return false;

  // Reject negative values
  if (calories < 0 || protein < 0 || carbs < 0 || fat < 0) return false;

  // Reject extreme calories (> 5000 kcal per serving is clearly wrong data)
  if (calories > 5000) return false;

  // Reject physically impossible macro ratios
  if (calories > 0) {
    const expectedCal = protein * 4 + carbs * 4 + fat * 9;
    const ratio = expectedCal / calories;
    // Very generous for pre-ranking: reject only extreme mismatches
    if (ratio > 4.0 || (expectedCal > 20 && ratio < 0.15)) return false;
  }

  // Reject impossible calorie density if serving size is known
  if (servingSizeGrams && servingSizeGrams > 0 && calories > 0) {
    const density = calories / servingSizeGrams;
    if (density > 12) return false; // physically impossible
  }

  return true;
}
