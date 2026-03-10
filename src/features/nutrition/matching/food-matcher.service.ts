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

import {
    buildRecipeMatch,
    lookupRecipeTemplate,
} from "../ontology/recipe-templates";
import type { ParsedFoodItem } from "../parsing/food-candidate.schema";
import { isCandidatePlausible } from "../validation/food-validator.service";
import { rankCandidates } from "./candidate-ranker";
import type { FoodMatch, MatchedFoodItem } from "./matching.types";
import { searchOpenFoodFacts } from "./openfoodfacts.service";
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

/**
 * Clean up a food query for API searches.
 * Strips filler words, normalizes UK/US spellings, removes quantities.
 */
function normalizeQuery(query: string): string {
  let q = query.toLowerCase().trim();

  // Strip leading quantities/numbers: "2 eggs" → "eggs", "100g chicken" → "chicken"
  q = q.replace(
    /^\d+(\.\d+)?\s*(g|kg|oz|ml|l|lb|lbs|cups?|tbsp|tsp|pieces?|slices?)?\s*/i,
    ""
  );

  // Apply UK→US spelling normalization
  for (const [uk, us] of Object.entries(SPELLING_MAP)) {
    q = q.replace(new RegExp(`\\b${uk}\\b`, "gi"), us);
  }

  // Strip filler words (but keep at least 1 word)
  const words = q.split(/\s+/).filter((w) => w.length > 0);
  const meaningful = words.filter((w) => !FILLER_WORDS.has(w));
  if (meaningful.length > 0) {
    q = meaningful.join(" ");
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
    cal: 250,
    protein: 25,
    carbs: 0,
    fat: 14,
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
  coffee: { cal: 100, protein: 4, carbs: 12, fat: 4, serving: "1 cup (240ml)" },
  latte: { cal: 100, protein: 4, carbs: 12, fat: 4, serving: "1 cup (240ml)" },
  cappuccino: {
    cal: 100,
    protein: 4,
    carbs: 12,
    fat: 4,
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

function findLocalMatch(name: string): FoodMatch | null {
  const normalized = name.toLowerCase();

  // Try exact match first, then partial
  const key =
    Object.keys(LOCAL_FOODS).find((k) => normalized === k) ??
    Object.keys(LOCAL_FOODS).find((k) => normalized.includes(k)) ??
    Object.keys(LOCAL_FOODS).find((k) => k.includes(normalized));

  if (!key) return null;

  const data = LOCAL_FOODS[key];
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
    servingSize: 100,
    servingUnit: "g",
    servingDescription: data.serving,
    matchScore: 0.5, // local fallback is lower confidence than DB
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

  const rawQuery = item.preparation
    ? `${item.name} ${item.preparation}`
    : item.name;
  const query = normalizeQuery(rawQuery);

  // Search both APIs equally — best results come from combining databases
  const [usdaResults, offResults] = await Promise.all([
    searchUsda(query, 5).catch(() => [] as FoodMatch[]),
    searchOpenFoodFacts(query, 5, "gb").catch(() => [] as FoodMatch[]),
  ]);
  let allMatches: FoodMatch[] = [...usdaResults, ...offResults];

  // Pre-ranking validation: filter out candidates with impossible nutrition data
  // before they can pollute the ranking. This catches garbage API results
  // (e.g. 0-cal chicken, 5000-cal salad, negative macros) early.
  allMatches = allMatches.filter((m) =>
    isCandidatePlausible(
      m.name,
      m.nutrients.calories,
      m.nutrients.protein,
      m.nutrients.carbs,
      m.nutrients.fat,
      m.servingSize
    )
  );

  // If no API results or all results look poor, try recipe templates
  // Recipe templates cover regional dishes (goulash, biryani etc.) that
  // USDA/OFF consistently fail on
  if (allMatches.length === 0) {
    const recipeTemplate = lookupRecipeTemplate(item.name);
    if (recipeTemplate) {
      const recipeMatch = buildRecipeMatch(
        recipeTemplate,
        item.name
      ) as unknown as FoodMatch;
      allMatches.push(recipeMatch);
    } else {
      const localMatch = findLocalMatch(item.name);
      if (localMatch) {
        allMatches.push(localMatch);
      }
    }
  }

  // Use the weighted candidate ranker instead of naive sort
  const rankedMatches = rankCandidates(allMatches, item, routing);

  let selectedMatch = rankedMatches.length > 0 ? rankedMatches[0] : null;

  // If the best API match is suspiciously bad (very low text similarity to query),
  // check if a recipe template would be better
  if (selectedMatch && selectedMatch.matchScore < 0.45) {
    const recipeTemplate = lookupRecipeTemplate(item.name);
    if (recipeTemplate) {
      const recipeMatch = buildRecipeMatch(
        recipeTemplate,
        item.name
      ) as unknown as FoodMatch;
      selectedMatch = recipeMatch;
      rankedMatches.unshift(recipeMatch);
    }
  }

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

  // Ontology hit: use deterministic defaults
  if (routing.ontologyEntry) {
    const ontologyMatch = buildOntologyMatch(routing.ontologyEntry, item.name);
    return {
      parsed: item,
      matches: [ontologyMatch],
      selectedMatch: ontologyMatch,
      matchConfidence: Math.round(item.confidence * 0.85 * 100) / 100,
      assumptionLabel: routing.assumptionLabel,
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
