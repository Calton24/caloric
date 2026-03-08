/**
 * Regex Parser
 *
 * Deterministic food parser that uses pattern matching to extract
 * structured food candidates from raw text input.
 *
 * This is the FALLBACK parser — always available, no model required.
 * Produces the same `ParsedFoodItem[]` shape as the LLM parser so both
 * paths feed into the same matching pipeline.
 *
 * Handles:
 *   - "2 eggs and toast"      → [{eggs, 2, piece}, {toast, 1, piece}]
 *   - "bowl of pasta"         → [{pasta, 1, bowl}]
 *   - "chicken with rice"     → [{chicken, 1, serving}, {rice, 1, serving}]
 *   - "a large coffee"        → [{coffee, 1, cup}]
 */

import type { FoodUnit, ParsedFoodItem } from "./food-candidate.schema";

// ─── Quantity Detection ──────────────────────────────────────────────────────

const WORD_NUMBERS: Record<string, number> = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  half: 0.5,
};

/**
 * Extract quantity from the beginning of a fragment.
 * Returns [quantity, remainingText].
 */
function extractQuantity(text: string): [number, string] {
  // Numeric: "2 eggs", "1.5 cups"
  const numMatch = text.match(/^(\d+(?:\.\d+)?)\s*/);
  if (numMatch) {
    return [parseFloat(numMatch[1]), text.slice(numMatch[0].length)];
  }

  // Word number: "two eggs", "a bagel"
  for (const [word, num] of Object.entries(WORD_NUMBERS)) {
    const re = new RegExp(`^${word}\\s+`, "i");
    if (re.test(text)) {
      return [num, text.replace(re, "")];
    }
  }

  return [1, text];
}

// ─── Unit Detection ──────────────────────────────────────────────────────────

const UNIT_PATTERNS: { pattern: RegExp; unit: FoodUnit }[] = [
  { pattern: /^cups?\s+of\s+/i, unit: "cup" },
  { pattern: /^cups?\s+/i, unit: "cup" },
  { pattern: /^bowls?\s+of\s+/i, unit: "bowl" },
  { pattern: /^bowls?\s+/i, unit: "bowl" },
  { pattern: /^glass(?:es)?\s+of\s+/i, unit: "glass" },
  { pattern: /^glass(?:es)?\s+/i, unit: "glass" },
  { pattern: /^plates?\s+of\s+/i, unit: "plate" },
  { pattern: /^plates?\s+/i, unit: "plate" },
  { pattern: /^slices?\s+of\s+/i, unit: "slice" },
  { pattern: /^slices?\s+/i, unit: "slice" },
  { pattern: /^scoops?\s+of\s+/i, unit: "scoop" },
  { pattern: /^scoops?\s+/i, unit: "scoop" },
  { pattern: /^handfuls?\s+of\s+/i, unit: "handful" },
  { pattern: /^tablespoons?\s+of\s+/i, unit: "tablespoon" },
  { pattern: /^tbsp\s+of\s+/i, unit: "tablespoon" },
  { pattern: /^tbsp\s+/i, unit: "tablespoon" },
  { pattern: /^teaspoons?\s+of\s+/i, unit: "teaspoon" },
  { pattern: /^tsp\s+of\s+/i, unit: "teaspoon" },
  { pattern: /^tsp\s+/i, unit: "teaspoon" },
  { pattern: /^cans?\s+of\s+/i, unit: "can" },
  { pattern: /^bottles?\s+of\s+/i, unit: "bottle" },
  { pattern: /^bars?\s+of\s+/i, unit: "bar" },
  { pattern: /^pieces?\s+of\s+/i, unit: "piece" },
  { pattern: /^servings?\s+of\s+/i, unit: "serving" },
  { pattern: /^(\d+)\s*g\b/i, unit: "g" },
  { pattern: /^(\d+)\s*oz\b/i, unit: "oz" },
  { pattern: /^(\d+)\s*ml\b/i, unit: "ml" },
];

/**
 * Extract unit from the beginning of text.
 * Returns [unit, remainingText].
 */
function extractUnit(text: string): [FoodUnit, string] {
  for (const { pattern, unit } of UNIT_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      return [unit, text.slice(match[0].length)];
    }
  }
  return ["serving", text];
}

// ─── Preparation Detection ───────────────────────────────────────────────────

const PREPARATION_PATTERNS = [
  /\b(grilled|fried|baked|roasted|steamed|boiled|raw|fresh|frozen|canned)\b/i,
  /\b(with [\w\s]+)$/i,
  /\b(whole milk|skim milk|almond milk|oat milk)\b/i,
  /\b(scrambled|poached|hard.?boiled|sunny.?side|over easy)\b/i,
  /\b(smoked|dried|pickled|marinated)\b/i,
];

function extractPreparation(text: string): [string | null, string] {
  for (const pattern of PREPARATION_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const prep = match[1].trim();
      const cleaned = text.replace(match[0], "").trim();
      return [prep, cleaned || text];
    }
  }
  return [null, text];
}

// ─── Splitting ───────────────────────────────────────────────────────────────

/** Word numbers that can start a new food item boundary */
const BOUNDARY_NUMBERS =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|\d+)\b/i;

/**
 * Common standalone food words that indicate a separate food item
 * when they appear adjacent to other food words without a separator.
 */
const STANDALONE_FOODS = new Set([
  // Proteins
  "chicken",
  "beef",
  "pork",
  "fish",
  "shrimp",
  "prawns",
  "salmon",
  "tuna",
  "turkey",
  "lamb",
  "bacon",
  "ham",
  "steak",
  "sausage",
  "sausages",
  "eggs",
  "egg",
  "tofu",
  // Grains & bread
  "toast",
  "bread",
  "rice",
  "pasta",
  "noodles",
  "oats",
  "cereal",
  "pancakes",
  "pancake",
  "waffles",
  "waffle",
  "bagel",
  // Vegetables & legumes
  "beans",
  "salad",
  "broccoli",
  "spinach",
  "corn",
  "peas",
  "potato",
  "potatoes",
  "chips",
  "fries",
  // Fruits
  "apple",
  "banana",
  "orange",
  "grapes",
  "strawberries",
  "blueberries",
  // Dairy
  "cheese",
  "yogurt",
  "milk",
  // Common dishes
  "soup",
  "curry",
  "pizza",
  "burger",
  "sandwich",
  "wrap",
]);

/**
 * Known multi-word food compounds that should NOT be split.
 * (Checked as consecutive word pairs in order.)
 */
const COMPOUND_FOODS = new Set([
  "shrimp toast",
  "prawn toast",
  "french toast",
  "scrambled eggs",
  "fried rice",
  "fried chicken",
  "fried fish",
  "baked beans",
  "peanut butter",
  "ice cream",
  "olive oil",
  "coconut milk",
  "almond milk",
  "oat milk",
  "sweet potato",
  "sweet potatoes",
  "sweet corn",
  "cream cheese",
  "cottage cheese",
  "sour cream",
  "baked potato",
  "mashed potato",
  "fish fingers",
  "chicken breast",
  "chicken thigh",
  "chicken wings",
  "turkey breast",
  "pork chop",
  "pork belly",
  "lamb chop",
  "beef steak",
  "beef mince",
  "black beans",
  "kidney beans",
  "butter beans",
  "green beans",
  "baked beans",
  "egg toast",
  "eggs on toast",
  "beans on toast",
  "grilled chicken",
  "roast chicken",
  "chicken curry",
  "caesar salad",
  "chicken caesar salad",
  "chicken caesar",
  "greek salad",
  "cobb salad",
]);

/** Split a compound input into individual food fragments */
function splitIntoFragments(input: string): string[] {
  // 1st pass: split on "and", "&", commas, "with a", "plus"
  let fragments = input
    .split(/\s*(?:,\s*|\s+and\s+|\s*&\s*|\s+plus\s+|\s+with\s+a\s+)/i)
    .map((f) => f.trim())
    .filter((f) => f.length > 0);

  // 2nd pass: split fragments that contain implicit item boundaries.
  // E.g. "three corn two sweet corn" → ["three corn", "two sweet corn"]
  // Detects a number-word appearing mid-fragment after a food word.
  const afterNumbers: string[] = [];
  for (const frag of fragments) {
    const words = frag.split(/\s+/);
    if (words.length <= 2) {
      afterNumbers.push(frag);
      continue;
    }

    let current: string[] = [];
    let hasFood = false;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const isNumber = BOUNDARY_NUMBERS.test(w);

      if (isNumber && hasFood && current.length > 0) {
        afterNumbers.push(current.join(" "));
        current = [w];
        hasFood = false;
      } else {
        current.push(w);
        if (!isNumber) hasFood = true;
      }
    }
    if (current.length > 0) {
      afterNumbers.push(current.join(" "));
    }
  }

  // 3rd pass: split fragments with adjacent standalone food words.
  // E.g. "shrimp toast beans" → ["shrimp toast", "beans"]
  // Respects known compound foods ("shrimp toast" stays together).
  const result: string[] = [];
  for (const frag of afterNumbers) {
    const words = frag.split(/\s+/);
    // Skip short fragments or those without standalone food words
    const foodIndices = words
      .map((w, i) => (STANDALONE_FOODS.has(w.toLowerCase()) ? i : -1))
      .filter((i) => i >= 0);
    if (foodIndices.length <= 1) {
      result.push(frag);
      continue;
    }

    // Walk through and split on food word boundaries,
    // but keep known compounds together.
    let current: string[] = [];
    let lastFoodEnd = -1; // index of last food word added

    for (let i = 0; i < words.length; i++) {
      const w = words[i].toLowerCase();
      const isFood = STANDALONE_FOODS.has(w);

      if (isFood && lastFoodEnd >= 0 && current.length > 0) {
        // Check if this word + previous word form a known compound
        const prev = words[lastFoodEnd].toLowerCase();
        const pair = `${prev} ${w}`;
        if (COMPOUND_FOODS.has(pair)) {
          // Keep together — part of a compound
          current.push(words[i]);
          lastFoodEnd = i;
          continue;
        }
        // Check if any word from current fragment to this word forms
        // a compound (handles "sweet corn", "fried rice", etc.)
        const prevWord = i > 0 ? words[i - 1].toLowerCase() : "";
        const immediatePair = `${prevWord} ${w}`;
        if (prevWord && COMPOUND_FOODS.has(immediatePair)) {
          current.push(words[i]);
          lastFoodEnd = i;
          continue;
        }
        // Not a compound — split here
        result.push(current.join(" "));
        current = [words[i]];
        lastFoodEnd = i;
      } else {
        current.push(words[i]);
        if (isFood) lastFoodEnd = i;
      }
    }
    if (current.length > 0) {
      result.push(current.join(" "));
    }
  }

  return result;
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

/**
 * Parse raw text input into structured food candidates.
 *
 * This does NOT estimate calories — it only extracts structure.
 * The matching + estimation layers handle nutrient data.
 */
export function parseWithRegex(rawInput: string): ParsedFoodItem[] {
  const normalized = rawInput.trim().toLowerCase();

  if (!normalized) return [];

  const fragments = splitIntoFragments(normalized);
  const items: ParsedFoodItem[] = [];

  for (const fragment of fragments) {
    let remaining = fragment.trim();
    if (!remaining) continue;

    // 1. Extract quantity
    const [quantity, afterQty] = extractQuantity(remaining);
    remaining = afterQty;

    // 2. Extract unit
    const [unit, afterUnit] = extractUnit(remaining);
    remaining = afterUnit;

    // 3. Extract preparation
    const [preparation, afterPrep] = extractPreparation(remaining);
    remaining = afterPrep;

    // 4. Clean up the food name
    const name = remaining
      .replace(/\b(of|some|the|my|i had|i ate|i drank)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!name) continue;

    // 5. Confidence — regex is deterministic but not always right
    //    High for simple items, lower for compound/ambiguous ones
    const hasExplicitQuantity = quantity !== 1 || /^\d/.test(fragment);
    const hasExplicitUnit = unit !== "serving";
    let confidence = 0.6;
    if (hasExplicitQuantity) confidence += 0.15;
    if (hasExplicitUnit) confidence += 0.1;
    if (name.split(" ").length <= 2) confidence += 0.05;
    confidence = Math.min(confidence, 0.95);

    items.push({
      name,
      quantity,
      unit,
      preparation,
      confidence: Math.round(confidence * 100) / 100,
      rawFragment: fragment,
    });
  }

  return items;
}
