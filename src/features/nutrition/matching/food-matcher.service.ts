/**
 * Food Matcher Service
 *
 * Orchestrates nutrition database lookups for parsed food candidates.
 * For each ParsedFoodItem, searches USDA and Open Food Facts in parallel,
 * merges + ranks results, and selects the best match.
 *
 * Search strategy:
 *   1. USDA FoodData Central (best for generic foods: chicken, rice, eggs)
 *   2. Open Food Facts (best for packaged/branded: Nutella, Coca-Cola)
 *   3. Local fallback (the old regex DB for when APIs are unreachable)
 *
 * "Databases provide facts. Not the model."
 */

import { cacheMatches, getCachedMatches } from "../food-cache.service";
import {
    buildRecipeMatch,
    lookupRecipeTemplate,
} from "../ontology/recipe-templates";
import type { ParsedFoodItem } from "../parsing/food-candidate.schema";
import { isCandidatePlausible } from "../validation/food-validator.service";
import { matchBrandedFood } from "./branded-foods";
import { rankCandidates } from "./candidate-ranker";
import { searchDataset } from "./dataset-lookup.service";
import { isEdamamConfigured, searchEdamam } from "./edamam.service";
import type { FoodMatch, MatchedFoodItem } from "./matching.types";
import { searchOpenFoodFacts } from "./openfoodfacts.service";
import { getFoodRegionSync } from "./region.service";
import { buildOntologyMatch, routeSource } from "./source-router";
import { searchUsda } from "./usda.service";

// ─── Query Preprocessing ─────────────────────────────────────────────────────

/** Words that add noise to API searches */
const FILLER_WORDS = new Set([
  "a",
  "an",
  "the",
  "some",
  "bit",
  "of",
  "my",
  "had",
  "ate",
  "with",
  "and",
  "just",
  "about",
  "around",
  "like",
  "few",
  "couple",
  "piece",
  "pieces",
  "serving",
  "plate",
  "bowl",
  "cup",
  "glass",
]);

/** UK → US spelling normalization for better USDA matches */
const SPELLING_MAP: Record<string, string> = {
  yoghurt: "yogurt",
  flavoured: "flavored",
  favourite: "favorite",
  colour: "color",
  fibre: "fiber",
  mould: "mold",
  programme: "program",
  grey: "gray",
  aluminium: "aluminum",
  courgette: "zucchini",
  aubergine: "eggplant",
  coriander: "cilantro",
  rocket: "arugula",
  crisps: "chips",
  biscuit: "cookie",
  mince: "ground beef",
  prawns: "shrimp",
  "spring onion": "green onion",
};

// ─── Singularization ─────────────────────────────────────────────────────────

/** Irregular plural → singular mappings */
const IRREGULAR_PLURALS: Record<string, string> = {
  berries: "berry",
  cherries: "cherry",
  strawberries: "strawberry",
  blueberries: "blueberry",
  raspberries: "raspberry",
  blackberries: "blackberry",
  cranberries: "cranberry",
  potatoes: "potato",
  tomatoes: "tomato",
  tortillas: "tortilla",
  cookies: "cookie",
  brownies: "brownie",
  smoothies: "smoothie",
  leaves: "leaf",
  loaves: "loaf",
  halves: "half",
};

/** Words that should NOT be singularized (already singular or mass nouns) */
const NEVER_SINGULARIZE = new Set([
  "hummus",
  "couscous",
  "asparagus",
  "quinoa",
  "granola",
  "pasta",
  "feta",
  "tofu",
  "edamame",
  "tempeh",
  "muesli",
  "acai",
  "tzatziki",
  "chickpeas",
  "oats",
  "grits",
  "brussels",
  "molasses",
  "swiss",
  "ramen",
  "sushi",
  "noodles",
  "lentils",
]);

/**
 * Simple English de-pluralization for food names.
 * "eggs" → "egg", "bananas" → "banana", "berries" → "berry"
 */
export function singularize(word: string): string {
  if (!word || word.length < 3) return word;

  const lower = word.toLowerCase();

  // Check irregular plurals first
  if (IRREGULAR_PLURALS[lower]) return IRREGULAR_PLURALS[lower];

  // Don't singularize mass nouns / already-singular words
  if (NEVER_SINGULARIZE.has(lower)) return word;

  // -ies → -y (but not if preceded by a vowel: "keys" → "key" not "ky")
  if (lower.endsWith("ies") && lower.length > 4) {
    const before = lower[lower.length - 4];
    if (!"aeiou".includes(before)) {
      return lower.slice(0, -3) + "y";
    }
  }

  // -ves → -f ("calves" → "calf")
  if (lower.endsWith("ves")) {
    return lower.slice(0, -3) + "f";
  }

  // -oes → -o ("potatoes" handled by irregulars; this catches others)
  if (lower.endsWith("oes") && lower.length > 4) {
    return lower.slice(0, -2);
  }

  // -ses, -xes, -zes, -ches, -shes → remove -es
  if (/(?:ses|xes|zes|ches|shes)$/.test(lower)) {
    return lower.slice(0, -2);
  }

  // -s (but not -ss like "grass", "swiss")
  if (lower.endsWith("s") && !lower.endsWith("ss")) {
    return lower.slice(0, -1);
  }

  return word;
}

// ─── Per-food Calorie Expectations ───────────────────────────────────────────

/**
 * Expected calorie range per serving for common foods.
 * Used as a sanity check to catch wrong API matches.
 * [min, max] are per-serving (typically per 100g or per standard piece).
 */
const CALORIE_EXPECTATIONS: Record<string, { min: number; max: number }> = {
  // Proteins
  egg: { min: 55, max: 200 },
  chicken: { min: 120, max: 350 },
  steak: { min: 180, max: 450 },
  beef: { min: 180, max: 450 },
  salmon: { min: 120, max: 350 },
  tuna: { min: 80, max: 250 },
  shrimp: { min: 60, max: 200 },
  tofu: { min: 70, max: 200 },
  bacon: { min: 80, max: 300 },
  sausage: { min: 150, max: 400 },
  turkey: { min: 100, max: 300 },
  pork: { min: 150, max: 400 },
  lamb: { min: 200, max: 450 },
  // Carbs
  rice: { min: 100, max: 280 },
  pasta: { min: 130, max: 280 },
  bread: { min: 60, max: 200 },
  bagel: { min: 200, max: 350 },
  oatmeal: { min: 100, max: 250 },
  cereal: { min: 100, max: 300 },
  toast: { min: 60, max: 180 },
  // Fruits
  banana: { min: 80, max: 140 },
  apple: { min: 60, max: 130 },
  orange: { min: 45, max: 100 },
  strawberry: { min: 25, max: 80 },
  blueberry: { min: 30, max: 100 },
  grape: { min: 50, max: 120 },
  mango: { min: 80, max: 200 },
  watermelon: { min: 30, max: 100 },
  pineapple: { min: 50, max: 130 },
  peach: { min: 40, max: 100 },
  pear: { min: 50, max: 120 },
  avocado: { min: 200, max: 400 },
  // Vegetables
  broccoli: { min: 20, max: 80 },
  spinach: { min: 10, max: 50 },
  salad: { min: 15, max: 250 },
  carrot: { min: 20, max: 60 },
  cucumber: { min: 8, max: 30 },
  tomato: { min: 15, max: 40 },
  corn: { min: 60, max: 180 },
  potato: { min: 100, max: 300 },
  // Dairy
  milk: { min: 30, max: 200 },
  yogurt: { min: 60, max: 250 },
  cheese: { min: 80, max: 420 },
  "cottage cheese": { min: 80, max: 200 },
  butter: { min: 70, max: 120 },
  // Beverages
  coffee: { min: 0, max: 30 },
  latte: { min: 60, max: 250 },
  tea: { min: 0, max: 15 },
  juice: { min: 40, max: 180 },
  smoothie: { min: 100, max: 400 },
  water: { min: 0, max: 5 },
  soda: { min: 0, max: 200 },
  beer: { min: 80, max: 250 },
  wine: { min: 80, max: 200 },
  // Snacks/desserts
  cookie: { min: 80, max: 250 },
  brownie: { min: 150, max: 400 },
  cake: { min: 200, max: 500 },
  "ice cream": { min: 150, max: 350 },
  chocolate: { min: 150, max: 550 },
  popcorn: { min: 50, max: 200 },
  chips: { min: 100, max: 300 },
  nuts: { min: 150, max: 600 },
  // Meals
  pizza: { min: 180, max: 450 },
  burger: { min: 250, max: 700 },
  sandwich: { min: 200, max: 600 },
  taco: { min: 150, max: 350 },
  burrito: { min: 300, max: 700 },
  sushi: { min: 100, max: 350 },
  ramen: { min: 300, max: 600 },
  soup: { min: 60, max: 300 },
};

/**
 * Check if a candidate's calories are plausible for the given food name.
 * Returns true if within expected range, or if no expectation exists.
 */
export function isCaloriePlausibleForFood(
  foodQuery: string,
  candidateCalories: number
): boolean {
  const singular = singularize(foodQuery.toLowerCase().trim());
  const expectation =
    CALORIE_EXPECTATIONS[singular] ??
    CALORIE_EXPECTATIONS[foodQuery.toLowerCase().trim()];
  if (!expectation) return true; // no data to compare against
  // Allow 50% margin below min and 2x above max for serving size variation
  return (
    candidateCalories >= expectation.min * 0.5 &&
    candidateCalories <= expectation.max * 2.0
  );
}

/**
 * Clean up a food query for API searches.
 * Strips filler words, removes quantities, and singularizes single-word queries.
 * UK→US spelling normalization is only applied when `usSpelling` is true
 * (used for USDA searches only — OFF and dataset use British English).
 */
function normalizeQuery(
  query: string,
  options: { usSpelling?: boolean } = {}
): string {
  let q = query.toLowerCase().trim();

  // Strip leading quantities/numbers: "2 eggs" → "eggs", "100g chicken" → "chicken"
  q = q.replace(
    /^\d+(\.\d+)?\s*(g|kg|oz|ml|l|lb|lbs|cups?|tbsp|tsp|pieces?|slices?)?\s*/i,
    ""
  );

  // Apply UK→US spelling normalization only for USDA (not OFF/dataset)
  if (options.usSpelling) {
    for (const [uk, us] of Object.entries(SPELLING_MAP)) {
      q = q.replace(new RegExp(`\\b${uk}\\b`, "gi"), us);
    }
  }

  // Strip filler words (but keep at least 1 word)
  const words = q.split(/\s+/).filter((w) => w.length > 0);
  const meaningful = words.filter((w) => !FILLER_WORDS.has(w));
  if (meaningful.length > 0) {
    q = meaningful.join(" ");
  }

  // Singularize single-word queries for better API matching
  // "eggs" → "egg", "bananas" → "banana"
  const finalWords = q.trim().split(/\s+/);
  if (finalWords.length === 1) {
    q = singularize(finalWords[0]);
  }

  return q.trim() || query.trim();
}

// ─── Local Fallback DB ───────────────────────────────────────────────────────

/** Lightweight local fallback when APIs are unreachable */
const LOCAL_FOODS: Record<
  string,
  { cal: number; protein: number; carbs: number; fat: number; serving: string }
> = {
  egg: { cal: 140, protein: 12, carbs: 1, fat: 10, serving: "2 eggs (100g)" },
  chicken: {
    cal: 230,
    protein: 31,
    carbs: 0,
    fat: 10,
    serving: "1 breast (150g)",
  },
  steak: {
    cal: 300,
    protein: 26,
    carbs: 0,
    fat: 20,
    serving: "1 steak (170g)",
  },
  beef: {
    cal: 300,
    protein: 26,
    carbs: 0,
    fat: 20,
    serving: "1 serving (170g)",
  },
  salmon: {
    cal: 250,
    protein: 25,
    carbs: 0,
    fat: 14,
    serving: "1 fillet (150g)",
  },
  fish: {
    cal: 150,
    protein: 30,
    carbs: 0,
    fat: 3,
    serving: "1 fillet (150g)",
  },
  turkey: {
    cal: 190,
    protein: 29,
    carbs: 0,
    fat: 7,
    serving: "1 serving (140g)",
  },
  shrimp: {
    cal: 120,
    protein: 24,
    carbs: 0,
    fat: 2,
    serving: "1 serving (120g)",
  },
  tofu: { cal: 130, protein: 14, carbs: 3, fat: 8, serving: "1 block (120g)" },
  bacon: {
    cal: 180,
    protein: 12,
    carbs: 0,
    fat: 14,
    serving: "3 slices (35g)",
  },
  sausage: {
    cal: 250,
    protein: 14,
    carbs: 2,
    fat: 20,
    serving: "1 link (75g)",
  },
  rice: {
    cal: 210,
    protein: 4,
    carbs: 45,
    fat: 1,
    serving: "1 cup cooked (160g)",
  },
  pasta: {
    cal: 220,
    protein: 8,
    carbs: 43,
    fat: 1,
    serving: "1 cup cooked (140g)",
  },
  spaghetti: {
    cal: 220,
    protein: 8,
    carbs: 43,
    fat: 1,
    serving: "1 cup cooked (140g)",
  },
  noodle: {
    cal: 220,
    protein: 8,
    carbs: 43,
    fat: 1,
    serving: "1 cup cooked (140g)",
  },
  toast: { cal: 120, protein: 4, carbs: 22, fat: 2, serving: "2 slices (60g)" },
  bread: { cal: 120, protein: 4, carbs: 22, fat: 2, serving: "2 slices (60g)" },
  wrap: { cal: 200, protein: 5, carbs: 30, fat: 6, serving: "1 wrap (60g)" },
  tortilla: {
    cal: 200,
    protein: 5,
    carbs: 30,
    fat: 6,
    serving: "1 tortilla (60g)",
  },
  "chicken wrap": {
    cal: 480,
    protein: 32,
    carbs: 40,
    fat: 18,
    serving: "1 wrap (280g)",
  },
  "beef wrap": {
    cal: 520,
    protein: 30,
    carbs: 42,
    fat: 24,
    serving: "1 wrap (300g)",
  },
  "falafel wrap": {
    cal: 450,
    protein: 14,
    carbs: 52,
    fat: 20,
    serving: "1 wrap (280g)",
  },
  "turkey wrap": {
    cal: 420,
    protein: 28,
    carbs: 38,
    fat: 16,
    serving: "1 wrap (260g)",
  },
  "veggie wrap": {
    cal: 380,
    protein: 12,
    carbs: 48,
    fat: 16,
    serving: "1 wrap (260g)",
  },
  croissant: {
    cal: 230,
    protein: 5,
    carbs: 26,
    fat: 12,
    serving: "1 croissant (60g)",
  },
  waffle: {
    cal: 290,
    protein: 7,
    carbs: 38,
    fat: 12,
    serving: "1 waffle (75g)",
  },
  pancake: {
    cal: 250,
    protein: 6,
    carbs: 34,
    fat: 10,
    serving: "2 pancakes (120g)",
  },
  oatmeal: {
    cal: 160,
    protein: 6,
    carbs: 27,
    fat: 3,
    serving: "1 cup cooked (240g)",
  },
  porridge: {
    cal: 160,
    protein: 6,
    carbs: 27,
    fat: 3,
    serving: "1 cup cooked (240g)",
  },
  bagel: {
    cal: 270,
    protein: 10,
    carbs: 50,
    fat: 2,
    serving: "1 bagel (100g)",
  },
  cereal: { cal: 180, protein: 4, carbs: 38, fat: 2, serving: "1 cup (40g)" },
  banana: {
    cal: 105,
    protein: 1,
    carbs: 27,
    fat: 0,
    serving: "1 medium (120g)",
  },
  apple: { cal: 95, protein: 0, carbs: 25, fat: 0, serving: "1 medium (180g)" },
  salad: { cal: 120, protein: 3, carbs: 10, fat: 7, serving: "1 bowl (200g)" },
  "chicken salad": {
    cal: 350,
    protein: 30,
    carbs: 12,
    fat: 20,
    serving: "1 bowl (250g)",
  },
  "olive oil dressing": {
    cal: 120,
    protein: 0,
    carbs: 1,
    fat: 14,
    serving: "2 tbsp (30ml)",
  },
  "olive oil": {
    cal: 120,
    protein: 0,
    carbs: 0,
    fat: 14,
    serving: "1 tbsp (15ml)",
  },
  avocado: {
    cal: 240,
    protein: 3,
    carbs: 12,
    fat: 22,
    serving: "1 whole (150g)",
  },
  orange: {
    cal: 60,
    protein: 1,
    carbs: 15,
    fat: 0,
    serving: "1 medium (130g)",
  },
  yogurt: { cal: 130, protein: 10, carbs: 15, fat: 4, serving: "1 cup (200g)" },
  cheese: { cal: 110, protein: 7, carbs: 1, fat: 9, serving: "1 slice (28g)" },
  "feta cheese": {
    cal: 75,
    protein: 4,
    carbs: 1,
    fat: 6,
    serving: "1 oz (28g)",
  },
  feta: {
    cal: 75,
    protein: 4,
    carbs: 1,
    fat: 6,
    serving: "1 oz (28g)",
  },
  "mozzarella cheese": {
    cal: 85,
    protein: 6,
    carbs: 1,
    fat: 6,
    serving: "1 oz (28g)",
  },
  mozzarella: {
    cal: 85,
    protein: 6,
    carbs: 1,
    fat: 6,
    serving: "1 oz (28g)",
  },
  "parmesan cheese": {
    cal: 110,
    protein: 10,
    carbs: 1,
    fat: 7,
    serving: "1 oz (28g)",
  },
  parmesan: {
    cal: 110,
    protein: 10,
    carbs: 1,
    fat: 7,
    serving: "1 oz (28g)",
  },
  "cream cheese": {
    cal: 100,
    protein: 2,
    carbs: 1,
    fat: 10,
    serving: "1 oz (28g)",
  },
  "swiss cheese": {
    cal: 108,
    protein: 8,
    carbs: 1,
    fat: 8,
    serving: "1 slice (28g)",
  },
  "cheddar cheese": {
    cal: 113,
    protein: 7,
    carbs: 0,
    fat: 9,
    serving: "1 slice (28g)",
  },
  cheddar: {
    cal: 113,
    protein: 7,
    carbs: 0,
    fat: 9,
    serving: "1 slice (28g)",
  },
  brie: {
    cal: 95,
    protein: 6,
    carbs: 0,
    fat: 8,
    serving: "1 oz (28g)",
  },
  gouda: {
    cal: 101,
    protein: 7,
    carbs: 1,
    fat: 8,
    serving: "1 oz (28g)",
  },
  "goat cheese": {
    cal: 75,
    protein: 5,
    carbs: 0,
    fat: 6,
    serving: "1 oz (28g)",
  },
  "blue cheese": {
    cal: 100,
    protein: 6,
    carbs: 1,
    fat: 8,
    serving: "1 oz (28g)",
  },
  "string cheese": {
    cal: 80,
    protein: 7,
    carbs: 1,
    fat: 5,
    serving: "1 stick (28g)",
  },
  milk: { cal: 120, protein: 8, carbs: 12, fat: 5, serving: "1 cup (240ml)" },
  pizza: {
    cal: 300,
    protein: 12,
    carbs: 36,
    fat: 12,
    serving: "1 slice (110g)",
  },
  burger: {
    cal: 450,
    protein: 25,
    carbs: 40,
    fat: 22,
    serving: "1 burger (200g)",
  },
  hamburger: {
    cal: 450,
    protein: 25,
    carbs: 40,
    fat: 22,
    serving: "1 burger (200g)",
  },
  sandwich: {
    cal: 350,
    protein: 18,
    carbs: 35,
    fat: 14,
    serving: "1 sandwich (200g)",
  },
  taco: { cal: 210, protein: 10, carbs: 20, fat: 10, serving: "1 taco (100g)" },
  burrito: {
    cal: 450,
    protein: 20,
    carbs: 50,
    fat: 18,
    serving: "1 burrito (250g)",
  },
  soup: { cal: 180, protein: 8, carbs: 20, fat: 6, serving: "1 bowl (300ml)" },
  sushi: {
    cal: 200,
    protein: 9,
    carbs: 28,
    fat: 5,
    serving: "6 pieces (150g)",
  },
  ramen: {
    cal: 420,
    protein: 16,
    carbs: 55,
    fat: 15,
    serving: "1 bowl (500ml)",
  },
  cookie: {
    cal: 160,
    protein: 2,
    carbs: 22,
    fat: 8,
    serving: "2 cookies (50g)",
  },
  donut: { cal: 270, protein: 4, carbs: 33, fat: 14, serving: "1 donut (60g)" },
  "ice cream": {
    cal: 270,
    protein: 5,
    carbs: 32,
    fat: 14,
    serving: "1 cup (130g)",
  },
  chocolate: {
    cal: 210,
    protein: 3,
    carbs: 24,
    fat: 12,
    serving: "1 bar (40g)",
  },
  "protein bar": {
    cal: 210,
    protein: 20,
    carbs: 22,
    fat: 7,
    serving: "1 bar (60g)",
  },
  chips: { cal: 150, protein: 2, carbs: 15, fat: 10, serving: "1 oz (28g)" },
  fries: {
    cal: 320,
    protein: 4,
    carbs: 40,
    fat: 16,
    serving: "1 medium (120g)",
  },
  "french fries": {
    cal: 320,
    protein: 4,
    carbs: 40,
    fat: 16,
    serving: "1 medium (120g)",
  },
  coffee: { cal: 5, protein: 0, carbs: 0, fat: 0, serving: "1 cup (240ml)" },
  latte: { cal: 150, protein: 8, carbs: 15, fat: 6, serving: "1 cup (240ml)" },
  cappuccino: {
    cal: 80,
    protein: 5,
    carbs: 8,
    fat: 3,
    serving: "1 cup (240ml)",
  },
  juice: { cal: 110, protein: 1, carbs: 26, fat: 0, serving: "1 cup (240ml)" },
  "capri sun": {
    cal: 60,
    protein: 0,
    carbs: 16,
    fat: 0,
    serving: "1 pouch (200ml)",
  },
  "energy drink": {
    cal: 110,
    protein: 0,
    carbs: 28,
    fat: 0,
    serving: "1 can (250ml)",
  },
  smoothie: {
    cal: 220,
    protein: 5,
    carbs: 40,
    fat: 4,
    serving: "1 cup (300ml)",
  },
  beer: { cal: 150, protein: 1, carbs: 13, fat: 0, serving: "1 can (355ml)" },
  wine: { cal: 125, protein: 0, carbs: 4, fat: 0, serving: "1 glass (150ml)" },
  "peanut butter": {
    cal: 190,
    protein: 7,
    carbs: 7,
    fat: 16,
    serving: "2 tbsp (32g)",
  },
  almonds: { cal: 170, protein: 6, carbs: 6, fat: 15, serving: "1 oz (28g)" },
  nuts: { cal: 170, protein: 6, carbs: 6, fat: 15, serving: "1 oz (28g)" },
  hummus: { cal: 120, protein: 5, carbs: 10, fat: 8, serving: "1/3 cup (70g)" },
  "protein shake": {
    cal: 200,
    protein: 30,
    carbs: 10,
    fat: 4,
    serving: "1 shake (350ml)",
  },
  // ─── Expanded foods for image recognition ─────────
  curry: {
    cal: 350,
    protein: 18,
    carbs: 20,
    fat: 22,
    serving: "1 bowl (300g)",
  },
  "fried rice": {
    cal: 240,
    protein: 6,
    carbs: 36,
    fat: 8,
    serving: "1 plate (250g)",
  },
  stir_fry: {
    cal: 280,
    protein: 18,
    carbs: 22,
    fat: 14,
    serving: "1 plate (250g)",
  },
  "stir fry": {
    cal: 280,
    protein: 18,
    carbs: 22,
    fat: 14,
    serving: "1 plate (250g)",
  },
  dumplings: {
    cal: 220,
    protein: 10,
    carbs: 24,
    fat: 10,
    serving: "6 pieces (120g)",
  },
  gyoza: {
    cal: 220,
    protein: 10,
    carbs: 24,
    fat: 10,
    serving: "6 pieces (120g)",
  },
  "spring roll": {
    cal: 120,
    protein: 3,
    carbs: 15,
    fat: 5,
    serving: "2 rolls (80g)",
  },
  teriyaki: {
    cal: 350,
    protein: 28,
    carbs: 30,
    fat: 12,
    serving: "1 serving (250g)",
  },
  tempura: {
    cal: 280,
    protein: 12,
    carbs: 28,
    fat: 14,
    serving: "1 serving (150g)",
  },
  kebab: {
    cal: 550,
    protein: 30,
    carbs: 42,
    fat: 28,
    serving: "1 wrap (300g)",
  },
  falafel: {
    cal: 200,
    protein: 8,
    carbs: 20,
    fat: 10,
    serving: "4 pieces (100g)",
  },
  "grilled cheese": {
    cal: 370,
    protein: 14,
    carbs: 30,
    fat: 22,
    serving: "1 sandwich (150g)",
  },
  nachos: {
    cal: 400,
    protein: 12,
    carbs: 40,
    fat: 22,
    serving: "1 plate (200g)",
  },
  quesadilla: {
    cal: 380,
    protein: 18,
    carbs: 32,
    fat: 20,
    serving: "1 quesadilla (200g)",
  },
  "chicken wings": {
    cal: 420,
    protein: 32,
    carbs: 6,
    fat: 30,
    serving: "6 wings (180g)",
  },
  wings: {
    cal: 420,
    protein: 32,
    carbs: 6,
    fat: 30,
    serving: "6 wings (180g)",
  },
  "chicken nuggets": {
    cal: 300,
    protein: 15,
    carbs: 20,
    fat: 18,
    serving: "6 pieces (100g)",
  },
  nuggets: {
    cal: 300,
    protein: 15,
    carbs: 20,
    fat: 18,
    serving: "6 pieces (100g)",
  },
  "mac and cheese": {
    cal: 350,
    protein: 14,
    carbs: 38,
    fat: 16,
    serving: "1 cup (200g)",
  },
  stew: { cal: 220, protein: 16, carbs: 18, fat: 10, serving: "1 bowl (300g)" },
  "hot dog": {
    cal: 290,
    protein: 10,
    carbs: 24,
    fat: 18,
    serving: "1 hot dog (100g)",
  },
  hotdog: {
    cal: 290,
    protein: 10,
    carbs: 24,
    fat: 18,
    serving: "1 hot dog (100g)",
  },
  cake: { cal: 280, protein: 4, carbs: 42, fat: 12, serving: "1 slice (80g)" },
  pie: { cal: 300, protein: 4, carbs: 36, fat: 16, serving: "1 slice (120g)" },
  brownie: {
    cal: 250,
    protein: 3,
    carbs: 32,
    fat: 13,
    serving: "1 brownie (60g)",
  },
  muffin: {
    cal: 280,
    protein: 5,
    carbs: 38,
    fat: 12,
    serving: "1 muffin (75g)",
  },
  cupcake: {
    cal: 260,
    protein: 3,
    carbs: 36,
    fat: 12,
    serving: "1 cupcake (70g)",
  },
  "cinnamon roll": {
    cal: 350,
    protein: 5,
    carbs: 48,
    fat: 16,
    serving: "1 roll (100g)",
  },
  pastry: {
    cal: 280,
    protein: 5,
    carbs: 32,
    fat: 15,
    serving: "1 pastry (70g)",
  },
  cheesecake: {
    cal: 320,
    protein: 6,
    carbs: 28,
    fat: 20,
    serving: "1 slice (100g)",
  },
  tiramisu: {
    cal: 280,
    protein: 5,
    carbs: 30,
    fat: 16,
    serving: "1 slice (100g)",
  },
  "panna cotta": {
    cal: 220,
    protein: 3,
    carbs: 22,
    fat: 14,
    serving: "1 serving (120g)",
  },
  pudding: { cal: 180, protein: 4, carbs: 28, fat: 6, serving: "1 cup (150g)" },
  custard: { cal: 160, protein: 4, carbs: 22, fat: 6, serving: "1 cup (150g)" },
  sorbet: {
    cal: 110,
    protein: 0,
    carbs: 28,
    fat: 0,
    serving: "1/2 cup (100g)",
  },
  gelato: { cal: 200, protein: 4, carbs: 28, fat: 8, serving: "1 cup (100g)" },
  "frozen yogurt": {
    cal: 160,
    protein: 4,
    carbs: 28,
    fat: 4,
    serving: "1/2 cup (100g)",
  },
  popcorn: { cal: 150, protein: 3, carbs: 16, fat: 8, serving: "1 cup (30g)" },
  pretzel: {
    cal: 190,
    protein: 5,
    carbs: 38,
    fat: 2,
    serving: "1 soft pretzel (60g)",
  },
  "trail mix": {
    cal: 180,
    protein: 5,
    carbs: 16,
    fat: 12,
    serving: "1/4 cup (40g)",
  },
  granola: {
    cal: 200,
    protein: 5,
    carbs: 28,
    fat: 8,
    serving: "1/2 cup (60g)",
  },
  "acai bowl": {
    cal: 300,
    protein: 5,
    carbs: 48,
    fat: 10,
    serving: "1 bowl (300g)",
  },
  "poke bowl": {
    cal: 450,
    protein: 28,
    carbs: 48,
    fat: 16,
    serving: "1 bowl (400g)",
  },
  "caesar salad": {
    cal: 220,
    protein: 8,
    carbs: 10,
    fat: 16,
    serving: "1 bowl (200g)",
  },
  guacamole: {
    cal: 100,
    protein: 1,
    carbs: 5,
    fat: 9,
    serving: "1/4 cup (60g)",
  },
  pesto: { cal: 120, protein: 3, carbs: 2, fat: 11, serving: "2 tbsp (30g)" },
  "garlic bread": {
    cal: 200,
    protein: 4,
    carbs: 24,
    fat: 10,
    serving: "2 slices (60g)",
  },
  risotto: {
    cal: 330,
    protein: 8,
    carbs: 42,
    fat: 14,
    serving: "1 plate (250g)",
  },
  paella: {
    cal: 300,
    protein: 16,
    carbs: 36,
    fat: 10,
    serving: "1 plate (300g)",
  },
  empanada: {
    cal: 280,
    protein: 12,
    carbs: 26,
    fat: 14,
    serving: "1 empanada (120g)",
  },
  churro: {
    cal: 120,
    protein: 1,
    carbs: 18,
    fat: 5,
    serving: "1 churro (40g)",
  },
  bruschetta: {
    cal: 160,
    protein: 4,
    carbs: 20,
    fat: 7,
    serving: "2 pieces (100g)",
  },
  focaccia: {
    cal: 270,
    protein: 7,
    carbs: 35,
    fat: 12,
    serving: "1 slice (90g)",
  },
  "mashed potatoes": {
    cal: 180,
    protein: 3,
    carbs: 26,
    fat: 8,
    serving: "1 cup (200g)",
  },
  coleslaw: {
    cal: 130,
    protein: 1,
    carbs: 12,
    fat: 9,
    serving: "1/2 cup (100g)",
  },
  "pulled pork": {
    cal: 280,
    protein: 24,
    carbs: 10,
    fat: 16,
    serving: "1 serving (150g)",
  },
  "corn dog": {
    cal: 270,
    protein: 8,
    carbs: 24,
    fat: 16,
    serving: "1 corn dog (80g)",
  },
  shakshuka: {
    cal: 250,
    protein: 14,
    carbs: 16,
    fat: 14,
    serving: "1 serving (250g)",
  },
  "avocado toast": {
    cal: 280,
    protein: 7,
    carbs: 26,
    fat: 18,
    serving: "1 slice (180g)",
  },
  crumpet: {
    cal: 130,
    protein: 4,
    carbs: 22,
    fat: 3,
    serving: "1 crumpet (55g)",
  },
  crepe: { cal: 180, protein: 5, carbs: 28, fat: 6, serving: "1 crepe (80g)" },
  baklava: {
    cal: 330,
    protein: 5,
    carbs: 35,
    fat: 20,
    serving: "2 pieces (80g)",
  },
  // ─── Zero/near-zero calorie items ─────────────────
  water: { cal: 0, protein: 0, carbs: 0, fat: 0, serving: "1 cup (240ml)" },
  "sparkling water": {
    cal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: "1 cup (240ml)",
  },
  tea: { cal: 2, protein: 0, carbs: 0, fat: 0, serving: "1 cup (240ml)" },
  "black coffee": {
    cal: 5,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: "1 cup (240ml)",
  },
  gum: { cal: 5, protein: 0, carbs: 2, fat: 0, serving: "1 piece (3g)" },
  "chewing gum": {
    cal: 5,
    protein: 0,
    carbs: 2,
    fat: 0,
    serving: "1 piece (3g)",
  },
  // ─── Common voice-logged foods ────────────────────
  omelette: {
    cal: 250,
    protein: 16,
    carbs: 2,
    fat: 20,
    serving: "1 omelette (150g)",
  },
  omelet: {
    cal: 250,
    protein: 16,
    carbs: 2,
    fat: 20,
    serving: "1 omelette (150g)",
  },
  lasagna: {
    cal: 350,
    protein: 18,
    carbs: 30,
    fat: 18,
    serving: "1 piece (250g)",
  },
  "chicken breast": {
    cal: 165,
    protein: 31,
    carbs: 0,
    fat: 3.6,
    serving: "1 breast (120g)",
  },
  "chicken thigh": {
    cal: 230,
    protein: 24,
    carbs: 0,
    fat: 14,
    serving: "1 thigh (130g)",
  },
  lamb: {
    cal: 280,
    protein: 26,
    carbs: 0,
    fat: 18,
    serving: "1 serving (150g)",
  },
  pork: {
    cal: 240,
    protein: 26,
    carbs: 0,
    fat: 14,
    serving: "1 chop (140g)",
  },
  tuna: {
    cal: 130,
    protein: 28,
    carbs: 0,
    fat: 1,
    serving: "1 can (120g)",
  },
  ham: {
    cal: 150,
    protein: 22,
    carbs: 2,
    fat: 6,
    serving: "3 slices (85g)",
  },
  "scrambled eggs": {
    cal: 200,
    protein: 14,
    carbs: 2,
    fat: 15,
    serving: "2 eggs (130g)",
  },
  "boiled egg": {
    cal: 78,
    protein: 6,
    carbs: 1,
    fat: 5,
    serving: "1 egg (50g)",
  },
  "fried egg": {
    cal: 90,
    protein: 6,
    carbs: 0,
    fat: 7,
    serving: "1 egg (55g)",
  },
  "protein oats": {
    cal: 300,
    protein: 20,
    carbs: 35,
    fat: 8,
    serving: "1 bowl (250g)",
  },
  "overnight oats": {
    cal: 280,
    protein: 10,
    carbs: 40,
    fat: 8,
    serving: "1 jar (250g)",
  },
  "greek yogurt": {
    cal: 130,
    protein: 17,
    carbs: 6,
    fat: 4,
    serving: "1 cup (170g)",
  },
  "cottage cheese": {
    cal: 110,
    protein: 14,
    carbs: 4,
    fat: 4,
    serving: "1/2 cup (110g)",
  },
  "peanut butter toast": {
    cal: 250,
    protein: 9,
    carbs: 24,
    fat: 14,
    serving: "1 slice (70g)",
  },
  broccoli: {
    cal: 55,
    protein: 3.7,
    carbs: 11,
    fat: 0.6,
    serving: "1 cup (150g)",
  },
  spinach: {
    cal: 23,
    protein: 3,
    carbs: 3.6,
    fat: 0.4,
    serving: "1 cup (100g)",
  },
  sweetcorn: {
    cal: 96,
    protein: 3.4,
    carbs: 21,
    fat: 1.5,
    serving: "1 ear (100g)",
  },
  corn: {
    cal: 96,
    protein: 3.4,
    carbs: 21,
    fat: 1.5,
    serving: "1 ear (100g)",
  },
  "baked potato": {
    cal: 160,
    protein: 4,
    carbs: 36,
    fat: 0.2,
    serving: "1 medium (170g)",
  },
  "jacket potato": {
    cal: 160,
    protein: 4,
    carbs: 36,
    fat: 0.2,
    serving: "1 medium (170g)",
  },
  "mashed potato": {
    cal: 180,
    protein: 3,
    carbs: 26,
    fat: 8,
    serving: "1 cup (200g)",
  },
  "sweet potato": {
    cal: 115,
    protein: 2,
    carbs: 27,
    fat: 0,
    serving: "1 medium (130g)",
  },
  beans: {
    cal: 130,
    protein: 8,
    carbs: 22,
    fat: 0.5,
    serving: "1/2 cup (130g)",
  },
  "baked beans": {
    cal: 150,
    protein: 7,
    carbs: 27,
    fat: 0.5,
    serving: "1/2 can (200g)",
  },
  lentils: {
    cal: 170,
    protein: 12,
    carbs: 28,
    fat: 0.5,
    serving: "3/4 cup (150g)",
  },
  chickpeas: {
    cal: 269,
    protein: 14.5,
    carbs: 45,
    fat: 4.2,
    serving: "1 cup (164g)",
  },
  "black beans": {
    cal: 227,
    protein: 15,
    carbs: 41,
    fat: 0.9,
    serving: "1 cup (172g)",
  },
  "kidney beans": {
    cal: 225,
    protein: 15,
    carbs: 40,
    fat: 0.9,
    serving: "1 cup (177g)",
  },
  "fried chicken": {
    cal: 320,
    protein: 28,
    carbs: 12,
    fat: 18,
    serving: "1 piece (140g)",
  },
  "fish and chips": {
    cal: 600,
    protein: 25,
    carbs: 55,
    fat: 30,
    serving: "1 serving (350g)",
  },
  "fish fingers": {
    cal: 220,
    protein: 12,
    carbs: 18,
    fat: 12,
    serving: "4 fingers (100g)",
  },
  "beans on toast": {
    cal: 270,
    protein: 12,
    carbs: 45,
    fat: 3,
    serving: "1 serving (300g)",
  },
  "eggs on toast": {
    cal: 260,
    protein: 16,
    carbs: 22,
    fat: 12,
    serving: "1 serving (180g)",
  },
  "chicken tikka": {
    cal: 300,
    protein: 28,
    carbs: 8,
    fat: 18,
    serving: "1 serving (200g)",
  },
  naan: {
    cal: 260,
    protein: 9,
    carbs: 45,
    fat: 5,
    serving: "1 naan (90g)",
  },
  "garlic naan": {
    cal: 300,
    protein: 9,
    carbs: 48,
    fat: 8,
    serving: "1 naan (100g)",
  },
  "protein powder": {
    cal: 120,
    protein: 25,
    carbs: 3,
    fat: 1,
    serving: "1 scoop (30g)",
  },
  creatine: {
    cal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: "1 scoop (5g)",
  },
  // ─── Non-food items (0 calories) ──────────────────
  cigarette: {
    cal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: "not food (0 cal)",
  },
  cigarettes: {
    cal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: "not food (0 cal)",
  },
  tobacco: {
    cal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: "not food (0 cal)",
  },
  vape: {
    cal: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    serving: "not food (0 cal)",
  },
};

/** Simple edit distance (Levenshtein) for short strings. */
function editDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  // Flat array instead of 2D matrix for performance
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      curr[j] =
        a[i - 1] === b[j - 1]
          ? prev[j - 1]
          : 1 + Math.min(prev[j - 1], prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function findLocalMatch(name: string): FoodMatch | null {
  const normalized = name.toLowerCase().trim();
  const singular = singularize(normalized);

  // 1. Exact match (try both plural and singular forms)
  let key = Object.keys(LOCAL_FOODS).find(
    (k) => normalized === k || singular === k
  );
  let matchType: "exact" | "substring" | "fuzzy" = "exact";

  // 2. Substring: query contains key ("cheese omelette" → "omelette")
  //    Prefer the LONGEST matching key for specificity:
  //    "chicken wrap" should match "chicken wrap" over "wrap" or "chicken"
  if (!key) {
    let bestLen = 0;
    for (const k of Object.keys(LOCAL_FOODS)) {
      if (
        (normalized.includes(k) || singular.includes(k)) &&
        k.length > bestLen
      ) {
        key = k;
        bestLen = k.length;
      }
    }
    if (key) matchType = "substring";
  }

  // 3. Reverse substring: key contains query ("omelette" → key "omelettes")
  if (!key) {
    let bestLen = Infinity;
    for (const k of Object.keys(LOCAL_FOODS)) {
      if (
        (k.includes(normalized) || k.includes(singular)) &&
        k.length < bestLen
      ) {
        key = k;
        bestLen = k.length;
      }
    }
    if (key) matchType = "substring";
  }

  // 4. Fuzzy match — catches typos like "omlette", "omelete", "omlet"
  if (!key) {
    const maxDist = normalized.length <= 4 ? 1 : 2;
    let bestKey: string | undefined;
    let bestDist = maxDist + 1;
    for (const k of Object.keys(LOCAL_FOODS)) {
      // Only compare similarly-lengthed keys to avoid false positives
      if (Math.abs(k.length - normalized.length) > maxDist) continue;
      const d = editDistance(normalized, k);
      if (d <= maxDist && d < bestDist) {
        bestDist = d;
        bestKey = k;
        if (d === 1) break; // 1-edit is close enough
      }
    }
    key = bestKey;
    matchType = "fuzzy";
  }

  if (!key) return null;

  const data = LOCAL_FOODS[key];
  // Exact and fuzzy-exact matches deserve high confidence — they represent
  // a curated dictionary entry that matches the user's intent precisely.
  // Substring matches are less certain.
  const score =
    matchType === "exact" ? 0.92 : matchType === "fuzzy" ? 0.88 : 0.6;

  // Parse actual serving size from description
  // e.g. "1 breast (150g)" → 150, "1 cup (240ml)" → 240
  const servingMatch = data.serving.match(/\((\d+(?:\.\d+)?)\s*(g|ml)\)/i);
  const servingSize = servingMatch ? parseFloat(servingMatch[1]) : 100;
  const servingUnit = servingMatch ? (servingMatch[2] as "g" | "ml") : "g";

  return {
    source: "local-fallback",
    sourceId: `local_${key}`,
    name: key,
    nutrients: {
      calories: data.cal,
      protein: data.protein,
      carbs: data.carbs,
      fat: data.fat,
    },
    servingSize,
    servingUnit,
    servingDescription: data.serving,
    matchScore: score,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Match a single parsed food item against nutrition databases.
 *
 * Uses the source router to determine the best strategy:
 *   - ontology-only: skip API calls for non-food, plain beverages
 *   - usda-first / off-first: search APIs with smart ranking
 */
export async function matchFoodItem(
  item: ParsedFoodItem
): Promise<MatchedFoodItem> {
  const routing = routeSource(item);

  // Ontology-only: skip API calls entirely (coffee → 2 kcal, water → 0 kcal)
  if (routing.useOntologyDefaults && routing.ontologyEntry) {
    const ontologyMatch = buildOntologyMatch(routing.ontologyEntry, item.name);
    return {
      parsed: item,
      matches: [ontologyMatch],
      selectedMatch: ontologyMatch,
      matchConfidence: Math.round(item.confidence * 0.85 * 100) / 100,
      assumptionLabel: routing.assumptionLabel,
    };
  }

  // Branded food: instant match for known brands (McDonald's, Coca-Cola, etc.)
  const brandedMatch = matchBrandedFood(item.rawFragment || item.name);
  if (brandedMatch) {
    return {
      parsed: item,
      matches: [brandedMatch],
      selectedMatch: brandedMatch,
      matchConfidence: Math.round(item.confidence * 0.92 * 100) / 100,
    };
  }

  const rawQuery = item.preparation
    ? `${item.name} ${item.preparation}`
    : item.name;
  const query = normalizeQuery(rawQuery);
  const queryUsda = normalizeQuery(rawQuery, { usSpelling: true });

  // ── Always look up local match — it will compete in the ranker ─────
  const localMatch = findLocalMatch(item.name);

  // ── SINGLE-WORD SHORT-CIRCUIT ──────────────────────────────────────
  // Architectural guarantee: if the user said ONE word ("egg", "rice",
  // "omelette") and we have an exact or fuzzy local match, return it
  // immediately. Don't query APIs that will return compound results like
  // "egg mcmuffin", "fried rice with shrimp", "cheese omelette".
  // The local dictionary is curated for exactly these generic foods.
  const queryWordCount = query.split(/\s+/).filter(Boolean).length;
  if (queryWordCount === 1 && localMatch && localMatch.matchScore >= 0.85) {
    return {
      parsed: item,
      matches: [localMatch],
      selectedMatch: localMatch,
      matchConfidence:
        Math.round(item.confidence * localMatch.matchScore * 100) / 100,
      assumptionLabel: routing.assumptionLabel,
    };
  }

  // ── Check cache first (in-memory → Supabase) ──────────────────────────
  const cached = await getCachedMatches(query).catch(() => null);
  if (cached && cached.length > 0) {
    // Inject local match into cached results so it competes
    const pool = localMatch ? [...cached, localMatch] : cached;
    const rankedCached = rankCandidates(pool, item, routing);
    const bestCached = rankedCached[0] ?? null;
    return {
      parsed: item,
      matches: rankedCached,
      selectedMatch: bestCached,
      matchConfidence: bestCached
        ? Math.round(item.confidence * bestCached.matchScore * 100) / 100
        : item.confidence * 0.3,
      assumptionLabel: routing.assumptionLabel,
    };
  }

  // ── Check local nutrition dataset BEFORE hitting external APIs ─────
  // This avoids network calls for the 13,000+ USDA foods we've pre-loaded.
  // Pass the user's region so OFF data in Supabase is prioritised.
  const region = getFoodRegionSync();
  const datasetMatches = await searchDataset(query, 5, region).catch(
    () => [] as FoodMatch[]
  );
  if (datasetMatches.length > 0) {
    // Inject local match so it competes against dataset results
    const pool = localMatch ? [...datasetMatches, localMatch] : datasetMatches;
    const rankedDataset = rankCandidates(pool, item, routing);
    const bestDataset = rankedDataset[0] ?? null;

    // If we have a strong match (score >= 0.7), use it directly
    if (bestDataset && bestDataset.matchScore >= 0.7) {
      // Cache dataset results too
      cacheMatches(query, rankedDataset).catch(() => {});
      return {
        parsed: item,
        matches: rankedDataset,
        selectedMatch: bestDataset,
        matchConfidence: bestDataset
          ? Math.round(item.confidence * bestDataset.matchScore * 100) / 100
          : item.confidence * 0.3,
        assumptionLabel: routing.assumptionLabel,
      };
    }
  }

  // Search APIs in parallel — include Edamam for NLP-heavy queries
  // Use US-normalized query for USDA (crisps→chips), original for OFF/dataset
  const apiCalls: Promise<FoodMatch[]>[] = [
    searchUsda(queryUsda, 5).catch(() => [] as FoodMatch[]),
    searchOpenFoodFacts(query, 5, region).catch(() => [] as FoodMatch[]),
  ];

  // Add Edamam when configured — especially valuable for voice/text NLP
  if (isEdamamConfigured()) {
    apiCalls.push(searchEdamam(query, 5).catch(() => [] as FoodMatch[]));
  }

  const apiResults = await Promise.all(apiCalls);
  let allMatches: FoodMatch[] = apiResults.flat();

  // Pre-ranking validation: filter out candidates with impossible nutrition data
  // before they can pollute the ranking. This catches garbage API results
  // (e.g. 0-cal chicken, 5000-cal salad, negative macros) early.
  allMatches = allMatches.filter(
    (m) =>
      isCandidatePlausible(
        m.name,
        m.nutrients.calories,
        m.nutrients.protein,
        m.nutrients.carbs,
        m.nutrients.fat,
        m.servingSize
      ) && isCaloriePlausibleForFood(query, m.nutrients.calories)
  );

  // ── Always inject local match + recipe template so they compete ──────
  // This is the key architectural fix: local/recipe matches enter the
  // candidate pool and are ranked alongside API results. An exact name
  // match (query "omelette" → LOCAL_FOODS["omelette"]) will naturally
  // outscore a branded product like "SPANISH OMELETTES, ORIGINAL".
  if (localMatch) {
    allMatches.push(localMatch);
  }
  const recipeTemplate = lookupRecipeTemplate(item.name);
  if (recipeTemplate) {
    const recipeMatch = buildRecipeMatch(
      recipeTemplate,
      item.name
    ) as unknown as FoodMatch;
    allMatches.push(recipeMatch);
  }

  // Use the weighted candidate ranker instead of naive sort
  const rankedMatches = rankCandidates(allMatches, item, routing);

  let selectedMatch = rankedMatches.length > 0 ? rankedMatches[0] : null;

  // Ontology calorie safety net: if the ontology has a specific calorie
  // expectation and the API's best match deviates wildly, fall back to
  // the local/ontology match instead. This prevents "cornflakes" returning
  // 774 cal (chocolate coated) when the ontology expects ~150 cal.
  if (
    selectedMatch &&
    routing.ontologyEntry &&
    !routing.isBranded &&
    routing.ontologyEntry.defaultCalories > 0
  ) {
    const expected = routing.ontologyEntry.defaultCalories;
    const actual = selectedMatch.nutrients.calories;
    const ratio = actual / expected;
    if (ratio > 2.5 || ratio < 0.25) {
      // API result is wildly off — use ontology/local instead
      const localMatch = findLocalMatch(item.name);
      const ontologyMatch = buildOntologyMatch(
        routing.ontologyEntry,
        item.name
      );
      const fallback = localMatch ?? ontologyMatch;
      selectedMatch = fallback;
      rankedMatches.unshift(fallback);
    }
  }

  // Combined confidence = parser confidence × match relevance
  const matchConfidence = selectedMatch
    ? Math.round(item.confidence * selectedMatch.matchScore * 100) / 100
    : item.confidence * 0.3; // no match = low confidence

  // Cache API results for future lookups (fire-and-forget)
  if (rankedMatches.length > 0) {
    cacheMatches(query, rankedMatches).catch(() => {});
  }

  return {
    parsed: item,
    matches: rankedMatches,
    selectedMatch,
    matchConfidence,
    assumptionLabel: routing.assumptionLabel,
  };
}

/**
 * Match all parsed food items in a batch.
 *
 * Processes items in parallel (capped at 5 concurrent) to avoid
 * overwhelming the APIs.
 */
export async function matchFoodItems(
  items: ParsedFoodItem[]
): Promise<MatchedFoodItem[]> {
  // Process in batches of 5 to respect API rate limits
  const BATCH_SIZE = 5;
  const results: MatchedFoodItem[] = [];

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(matchFoodItem));
    results.push(...batchResults);
  }

  return results;
}

/**
 * Quick local-only match (no network calls).
 * Uses ontology first, then local fallback DB.
 */
export function matchFoodItemLocally(item: ParsedFoodItem): MatchedFoodItem {
  const routing = routeSource(item);

  // Ontology match: use ontology defaults for known foods.
  // Always check LOCAL_FOODS first — a curated exact entry like "chicken wrap"
  // (480 cal) must beat a generic ontology match like "wrap" → "flour wrap" (190 cal).
  // Also handles "beef wrap" vs beef ontology → "ground beef (85% lean), cooked".
  // Exception: when useOntologyDefaults is true (beverages, non-food), trust
  // the ontology's precise defaults (e.g., black coffee = 2 cal).
  if (routing.ontologyEntry) {
    if (!routing.useOntologyDefaults) {
      const localMatch = findLocalMatch(item.name);
      if (localMatch && localMatch.matchScore >= 0.9) {
        return {
          parsed: item,
          matches: [localMatch],
          selectedMatch: localMatch,
          matchConfidence: Math.round(item.confidence * 0.85 * 100) / 100,
          assumptionLabel: routing.assumptionLabel,
        };
      }
    }
    const ontologyMatch = buildOntologyMatch(routing.ontologyEntry, item.name);
    return {
      parsed: item,
      matches: [ontologyMatch],
      selectedMatch: ontologyMatch,
      matchConfidence: Math.round(item.confidence * 0.85 * 100) / 100,
      assumptionLabel: routing.assumptionLabel,
    };
  }

  // Branded food: instant match for known brands
  const brandedLocal = matchBrandedFood(item.rawFragment || item.name);
  if (brandedLocal) {
    return {
      parsed: item,
      matches: [brandedLocal],
      selectedMatch: brandedLocal,
      matchConfidence: Math.round(item.confidence * 0.92 * 100) / 100,
    };
  }

  // Try recipe template (regional dishes like goulash, biryani)
  const recipeTemplate = lookupRecipeTemplate(item.name);
  if (recipeTemplate) {
    const recipeMatch = buildRecipeMatch(
      recipeTemplate,
      item.name
    ) as unknown as FoodMatch;
    return {
      parsed: item,
      matches: [recipeMatch],
      selectedMatch: recipeMatch,
      matchConfidence: Math.round(item.confidence * 0.7 * 100) / 100,
    };
  }

  const localMatch = findLocalMatch(item.name);

  return {
    parsed: item,
    matches: localMatch ? [localMatch] : [],
    selectedMatch: localMatch,
    matchConfidence: localMatch
      ? Math.round(item.confidence * 0.5 * 100) / 100
      : 0.15,
  };
}
