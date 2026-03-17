/**
 * Food Candidate Retrieval Service
 *
 * The key architectural trick: instead of asking a vision model
 * "What food is this?" (open-ended, high hallucination risk),
 * we first RETRIEVE plausible candidates from our 1.85M-food dataset,
 * then ask the model to RANK a closed candidate set.
 *
 * Inputs (multi-signal):
 *   - coarseCategory: L1 taxonomy classification (drink, dessert, etc.)
 *   - subCategory:    L2 classification (milkshake, burger, etc.)
 *   - ocrTokens:      words visible on the product
 *   - barcode:        GTIN/UPC if detected
 *   - brandHint:      brand text from OCR
 *   - recentFoods:    user's recent logged foods for personalization
 *
 * Output:
 *   - A ranked shortlist of 5–20 candidate foods from the local dataset
 *
 * The vision model then picks from this shortlist — dramatically
 * reducing hallucinations and improving accuracy.
 *
 * "Retrieval constrains. Models rank. Users confirm."
 */

import type {
    FoodCategoryL1,
    FoodCategoryL2,
} from "../../image-analysis/taxonomy/food-taxonomy";
import type { FoodMatch } from "./matching.types";

// ─── Supabase Client ────────────────────────────────────────────────────────

let supabaseClient: ReturnType<typeof getSupabaseClientSafe>;

function getSupabaseClientSafe() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSupabaseClient } = require("../../../lib/supabase/client");
    return getSupabaseClient();
  } catch {
    return null;
  }
}

function getClient() {
  if (!supabaseClient) {
    supabaseClient = getSupabaseClientSafe();
  }
  return supabaseClient;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RetrievalSignals {
  /** L1 taxonomy category from image triage */
  coarseCategory: FoodCategoryL1;
  /** L2 sub-category (e.g., milkshake, burger) */
  subCategory?: FoodCategoryL2;
  /** Food name guess from taxonomy / ML Kit */
  foodGuess?: string;
  /** OCR tokens found on the product */
  ocrTokens?: string[];
  /** Brand text from OCR extraction */
  brandHint?: string;
  /** Barcode string if detected */
  barcode?: string;
  /** User's recently logged food names for personalization */
  recentFoods?: string[];
}

export interface CandidateShortlist {
  /** Ranked candidates from the dataset */
  candidates: FoodMatch[];
  /** Which signals contributed to the retrieval */
  signals: string[];
  /** How the shortlist was built */
  strategy:
    | "barcode"
    | "brand_product"
    | "category_search"
    | "multi_signal"
    | "fallback";
}

// ─── Category → Search Terms Mapping ────────────────────────────────────────

/** Maps L2 sub-categories to search terms for dataset queries */
const L2_SEARCH_TERMS: Partial<Record<FoodCategoryL2, string[]>> = {
  // Drinks
  coffee: ["coffee", "latte", "cappuccino", "espresso", "mocha", "americano"],
  tea: ["tea", "matcha", "chai", "green tea", "herbal tea"],
  smoothie: ["smoothie", "acai", "protein smoothie", "fruit smoothie"],
  milkshake: ["milkshake", "shake", "malt", "frappe"],
  juice: ["juice", "orange juice", "apple juice", "cranberry"],
  soda: ["soda", "cola", "sprite", "fanta", "dr pepper", "mountain dew"],
  alcohol: ["beer", "wine", "vodka", "whiskey", "rum", "cocktail"],
  water: ["water", "sparkling water", "mineral water"],
  generic_drink: ["drink", "beverage"],

  // Desserts
  ice_cream: ["ice cream", "gelato", "frozen yogurt", "sundae"],
  cake: ["cake", "cheesecake", "cupcake", "brownie", "torte"],
  pastry: ["pastry", "croissant", "danish", "muffin", "scone", "donut"],
  cookie: ["cookie", "biscuit", "shortbread", "macaroon"],
  chocolate: ["chocolate", "truffle", "fudge", "cocoa"],
  pudding: ["pudding", "custard", "mousse", "tiramisu", "panna cotta"],
  frozen_treat: ["popsicle", "sorbet", "frozen bar", "ice pop"],
  generic_dessert: ["dessert", "sweet", "treat"],

  // Plated meals
  sandwich: ["sandwich", "sub", "hoagie", "BLT", "club sandwich"],
  burger: ["burger", "hamburger", "cheeseburger", "veggie burger"],
  pizza: ["pizza", "pepperoni", "margherita", "deep dish"],
  pasta: ["pasta", "spaghetti", "penne", "lasagna", "mac and cheese"],
  rice_dish: ["rice", "fried rice", "risotto", "biryani", "pilaf"],
  salad: ["salad", "caesar salad", "greek salad", "garden salad"],
  soup: ["soup", "chowder", "stew", "bisque", "broth"],
  sushi: ["sushi", "sashimi", "roll", "nigiri", "maki"],
  wrap_taco: ["wrap", "taco", "burrito", "quesadilla", "fajita"],
  stir_fry: ["stir fry", "wok", "teriyaki", "kung pao"],
  curry: ["curry", "tikka masala", "vindaloo", "korma", "thai curry"],
  breakfast: ["breakfast", "oatmeal", "cereal", "pancake", "waffle", "eggs"],
  generic_meal: ["meal", "plate", "dinner", "lunch"],

  // Snacks
  chips: ["chips", "potato chips", "tortilla chips", "pringles", "doritos"],
  nuts: ["nuts", "almonds", "peanuts", "cashews", "mixed nuts", "trail mix"],
  popcorn: ["popcorn", "kettle corn"],
  bar: ["protein bar", "granola bar", "energy bar", "snack bar", "cliff bar"],
  crackers: ["crackers", "pretzel", "rice cake", "cheese crackers"],
  generic_snack: ["snack", "crisps"],

  // Packaged
  cereal: ["cereal", "granola", "corn flakes", "cheerios", "oats"],
  canned: ["canned", "soup can", "beans", "tuna can", "corn"],
  boxed: ["boxed", "mac and cheese", "instant", "kit"],
  bottled: ["bottled", "sauce", "ketchup", "mustard", "dressing"],
  wrapped: ["wrapped", "candy", "bar", "gum"],
  generic_packaged: ["packaged", "product"],

  // Fruit/veg
  fruit: ["fruit", "apple", "banana", "orange", "berries", "grapes"],
  vegetable: ["vegetable", "carrot", "broccoli", "spinach", "tomato"],
  mixed: ["salad", "fruit salad", "mixed vegetables"],
};

// ─── Core Retrieval ─────────────────────────────────────────────────────────

/**
 * Retrieve a shortlist of candidate foods from the local dataset
 * using multi-signal retrieval.
 *
 * This is the core "trick" — constraining the model's candidate set
 * before it guesses, dramatically reducing hallucinations.
 */
export async function retrieveCandidates(
  signals: RetrievalSignals,
  maxCandidates = 15
): Promise<CandidateShortlist> {
  const client = getClient();
  if (!client) {
    return { candidates: [], signals: [], strategy: "fallback" };
  }

  const contributingSignals: string[] = [];

  // ── Priority 1: Barcode — instant exact match ─────────────
  if (signals.barcode) {
    const barcodeResults = await queryByBarcode(client, signals.barcode);
    if (barcodeResults.length > 0) {
      contributingSignals.push(`barcode:${signals.barcode}`);
      return {
        candidates: barcodeResults,
        signals: contributingSignals,
        strategy: "barcode",
      };
    }
  }

  // ── Priority 2: Brand + product name from OCR ─────────────
  if (signals.brandHint) {
    contributingSignals.push(`brand:${signals.brandHint}`);
    const brandResults = await queryByBrandProduct(
      client,
      signals.brandHint,
      signals.ocrTokens ?? [],
      maxCandidates
    );
    if (brandResults.length >= 3) {
      return {
        candidates: brandResults,
        signals: contributingSignals,
        strategy: "brand_product",
      };
    }
    // If brand search returns few results, fall through to augment with category
  }

  // ── Priority 3: Multi-signal search (category + OCR + guess) ──
  const searchTerms = buildSearchTerms(signals);
  contributingSignals.push(`category:${signals.coarseCategory}`);
  if (signals.subCategory)
    contributingSignals.push(`subcategory:${signals.subCategory}`);
  if (signals.foodGuess) contributingSignals.push(`guess:${signals.foodGuess}`);
  if (signals.ocrTokens?.length)
    contributingSignals.push(`ocr:${signals.ocrTokens.join(",")}`);

  const results = await queryMultiSignal(client, searchTerms, maxCandidates);

  // Boost recent foods if they appear in results
  if (signals.recentFoods?.length) {
    boostRecentFoods(results, signals.recentFoods);
    contributingSignals.push("recent_foods_boost");
  }

  // Sort by score descending
  results.sort((a, b) => b.matchScore - a.matchScore);

  return {
    candidates: results.slice(0, maxCandidates),
    signals: contributingSignals,
    strategy: results.length > 0 ? "multi_signal" : "fallback",
  };
}

// ─── Query Builders ─────────────────────────────────────────────────────────

const DATASET_COLS =
  "source_id, name, brand, category, dataset, data_quality, " +
  "calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, " +
  "fiber_per_100g, sugar_per_100g, sodium_per_100g, " +
  "serving_size_g, serving_desc, household_serving";

async function queryByBarcode(
  client: ReturnType<typeof getClient>,
  barcode: string
): Promise<FoodMatch[]> {
  const { data } = await client
    .from("nutrition_dataset")
    .select(DATASET_COLS)
    .eq("barcode", barcode.trim())
    .limit(1);

  if (!data?.length) return [];
  return data.map((row: DatasetRow) => {
    const match = rowToFoodMatch(row, row.name);
    match.matchScore = 0.99;
    return match;
  });
}

async function queryByBrandProduct(
  client: ReturnType<typeof getClient>,
  brand: string,
  ocrTokens: string[],
  limit: number
): Promise<FoodMatch[]> {
  // Search by brand name with optional product keywords
  const productWords = ocrTokens
    .filter((t) => t.length >= 3 && t.toLowerCase() !== brand.toLowerCase())
    .slice(0, 4);

  let query = client
    .from("nutrition_dataset")
    .select(DATASET_COLS)
    .ilike("brand", `%${brand}%`);

  // If we have product words, add them as name filters
  if (productWords.length > 0) {
    const nameFilter = productWords.map((w) => `name.ilike.%${w}%`).join(",");
    query = query.or(nameFilter);
  }

  const { data } = await query.limit(limit);
  if (!data?.length) return [];

  return data.map((row: DatasetRow) => {
    const match = rowToFoodMatch(row, `${brand} ${productWords.join(" ")}`);
    match.matchScore = Math.min(match.matchScore + 0.05, 1.0); // brand match boost
    return match;
  });
}

/**
 * Build search terms from all available signals.
 * Combines category-derived terms with OCR tokens and food guess.
 */
function buildSearchTerms(signals: RetrievalSignals): string[] {
  const terms: string[] = [];

  // Add food guess (highest signal)
  if (signals.foodGuess) {
    terms.push(signals.foodGuess);
  }

  // Add L2 category search terms
  if (signals.subCategory) {
    const l2Terms = L2_SEARCH_TERMS[signals.subCategory];
    if (l2Terms) {
      terms.push(...l2Terms.slice(0, 3)); // top 3 terms per L2
    }
  }

  // Add OCR tokens (filtered for noise)
  if (signals.ocrTokens?.length) {
    const cleanOcr = signals.ocrTokens
      .filter((t) => t.length >= 3)
      .filter((t) => !NOISE_WORDS.has(t.toLowerCase()))
      .slice(0, 5);
    terms.push(...cleanOcr);
  }

  // Deduplicate
  const seen = new Set<string>();
  return terms.filter((t) => {
    const key = t.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const NOISE_WORDS = new Set([
  "the",
  "and",
  "with",
  "for",
  "from",
  "new",
  "free",
  "best",
  "net",
  "wt",
  "oz",
  "grams",
  "serving",
  "size",
  "per",
  "ingredients",
  "contains",
  "see",
  "nutrition",
  "facts",
]);

async function queryMultiSignal(
  client: ReturnType<typeof getClient>,
  searchTerms: string[],
  limit: number
): Promise<FoodMatch[]> {
  if (searchTerms.length === 0) return [];

  // Strategy: run parallel searches for top terms, merge + dedup
  const queries = searchTerms.slice(0, 4).map(async (term) => {
    const words = term
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 2)
      .slice(0, 4);

    if (words.length === 0) return [];

    const tsquery = words.map((w) => `${w}:*`).join(" & ");

    const { data } = await client
      .from("nutrition_dataset")
      .select(DATASET_COLS)
      .textSearch("name", tsquery, { type: "websearch" })
      .limit(Math.ceil(limit / 2));

    if (!data?.length) return [];
    return data.map((row: DatasetRow) => rowToFoodMatch(row, term));
  });

  const resultSets = await Promise.all(queries);
  const allResults = resultSets.flat();

  // Dedup by source_id, keep highest score
  const byId = new Map<string, FoodMatch>();
  for (const r of allResults) {
    const existing = byId.get(r.sourceId);
    if (!existing || r.matchScore > existing.matchScore) {
      byId.set(r.sourceId, r);
    }
  }

  return Array.from(byId.values());
}

// ─── Personalization ────────────────────────────────────────────────────────

/**
 * Boost candidates that match the user's recent food history.
 * Small score bump for foods the user has logged before.
 */
function boostRecentFoods(
  candidates: FoodMatch[],
  recentFoods: string[]
): void {
  const recentSet = new Set(recentFoods.map((f) => f.toLowerCase()));

  for (const c of candidates) {
    const nameLower = c.name.toLowerCase();
    for (const recent of recentSet) {
      if (nameLower.includes(recent) || recent.includes(nameLower)) {
        c.matchScore = Math.min(c.matchScore + 0.05, 1.0);
        break;
      }
    }
  }
}

// ─── Row → FoodMatch ────────────────────────────────────────────────────────

interface DatasetRow {
  source_id: string;
  name: string;
  brand: string | null;
  category: string | null;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  fiber_per_100g: number | null;
  sugar_per_100g: number | null;
  sodium_per_100g: number | null;
  serving_size_g: number | null;
  serving_desc: string | null;
  household_serving: string | null;
  data_quality: string | null;
  dataset: string;
}

function rowToFoodMatch(row: DatasetRow, query: string): FoodMatch {
  const servingG = row.serving_size_g ?? 100;
  const scale = servingG / 100;

  const nutrients = {
    calories: Math.round(row.calories_per_100g * scale),
    protein: Math.round(row.protein_per_100g * scale * 10) / 10,
    carbs: Math.round(row.carbs_per_100g * scale * 10) / 10,
    fat: Math.round(row.fat_per_100g * scale * 10) / 10,
    ...(row.fiber_per_100g != null && {
      fiber: Math.round(row.fiber_per_100g * scale * 10) / 10,
    }),
    ...(row.sugar_per_100g != null && {
      sugar: Math.round(row.sugar_per_100g * scale * 10) / 10,
    }),
    ...(row.sodium_per_100g != null && {
      sodium: Math.round(row.sodium_per_100g * scale * 10) / 10,
    }),
  };

  const nameLower = row.name.toLowerCase();
  const queryLower = query.toLowerCase();
  let score = 0.75;

  if (nameLower === queryLower) {
    score = 0.98;
  } else if (nameLower.startsWith(queryLower)) {
    score = 0.92;
  } else if (nameLower.includes(queryLower)) {
    score = 0.85;
  }

  if (row.data_quality === "gold") {
    score = Math.min(score + 0.03, 1.0);
  }

  return {
    source: "dataset",
    sourceId: row.source_id,
    name: row.name,
    brand: row.brand ?? undefined,
    nutrients,
    servingSize: servingG,
    servingUnit: "g",
    servingDescription:
      row.serving_desc ?? row.household_serving ?? `${servingG}g`,
    matchScore: score,
  };
}
