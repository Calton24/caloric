/**
 * Open Food Facts Service
 *
 * Client for the Open Food Facts API — community-maintained database
 * of packaged/branded food products with nutrition data and barcodes.
 *
 * API docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 * Base URL: https://world.openfoodfacts.org
 *
 * No API key required. Data is available under ODbL.
 * Rate limit: be reasonable (~1 req/sec). User-Agent required.
 */

import type { FoodMatch, NutrientProfile } from "./matching.types";

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = "https://world.openfoodfacts.org";
const UK_URL = "https://uk.openfoodfacts.org";
const USER_AGENT = "Caloric/1.0 (calorie-tracking-app)";

// Country-specific OFF subdomains for better regional results
const REGION_URLS: Record<string, string> = {
  gb: UK_URL,
  uk: UK_URL,
  ie: "https://ie.openfoodfacts.org",
  fr: "https://fr.openfoodfacts.org",
  de: "https://de.openfoodfacts.org",
  es: "https://es.openfoodfacts.org",
  it: "https://it.openfoodfacts.org",
  nl: "https://nl.openfoodfacts.org",
  us: BASE_URL,
};

// ─── OFF API Response Types ──────────────────────────────────────────────────

interface OffNutriments {
  "energy-kcal_100g"?: number;
  proteins_100g?: number;
  carbohydrates_100g?: number;
  fat_100g?: number;
  fiber_100g?: number;
  sugars_100g?: number;
  sodium_100g?: number;
}

interface OffProduct {
  code: string;
  product_name?: string;
  brands?: string;
  nutriments?: OffNutriments;
  serving_size?: string;
  serving_quantity?: number;
  nutriscore_grade?: string;
  image_url?: string;
}

interface OffSearchResponse {
  count: number;
  products: OffProduct[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildNutrientProfile(n: OffNutriments): NutrientProfile {
  return {
    calories: Math.round(n["energy-kcal_100g"] ?? 0),
    protein: Math.round((n.proteins_100g ?? 0) * 10) / 10,
    carbs: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
    fat: Math.round((n.fat_100g ?? 0) * 10) / 10,
    fiber: Math.round((n.fiber_100g ?? 0) * 10) / 10,
    sugar: Math.round((n.sugars_100g ?? 0) * 10) / 10,
    sodium: Math.round((n.sodium_100g ?? 0) * 1000), // convert g → mg
  };
}

/**
 * Parse the serving_size string (e.g., "30g", "1 bar (40g)") into grams.
 * Falls back to 100g if unparseable.
 */
function parseServingSize(product: OffProduct): number {
  if (product.serving_quantity && product.serving_quantity > 0) {
    return product.serving_quantity;
  }

  if (product.serving_size) {
    const match = product.serving_size.match(/(\d+(?:\.\d+)?)\s*g/i);
    if (match) return parseFloat(match[1]);

    const mlMatch = product.serving_size.match(/(\d+(?:\.\d+)?)\s*ml/i);
    if (mlMatch) return parseFloat(mlMatch[1]);
  }

  return 100; // default to per-100g
}

function scoreMatch(product: OffProduct, query: string): number {
  const name = (product.product_name ?? "").toLowerCase();
  const q = query.toLowerCase();

  let score = 0;

  if (name === q) {
    score += 0.4;
  } else if (name.includes(q)) {
    score += 0.25;
  } else if (q.split(" ").some((word) => name.includes(word))) {
    score += 0.15;
  }

  // Has nutrition data
  if (product.nutriments?.["energy-kcal_100g"]) score += 0.2;

  // Has a product name
  if (product.product_name) score += 0.1;

  // Has a brand
  if (product.brands) score += 0.05;

  // Has serving info
  if (product.serving_size) score += 0.05;

  return Math.min(score, 1.0);
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Search Open Food Facts for products matching a query.
 *
 * Searches both the world database and a regional endpoint in parallel
 * for better coverage of UK/EU products.
 *
 * @param query      Product name to search for
 * @param maxResults Maximum results to return (default: 5)
 * @param region     Optional country code for regional search (e.g., "gb", "de")
 * @returns          Ranked FoodMatch array
 */
export async function searchOpenFoodFacts(
  query: string,
  maxResults = 5,
  region?: string
): Promise<FoodMatch[]> {
  // Build search URLs — world + optional regional endpoint
  const urls: string[] = [BASE_URL];
  const regionUrl = region ? REGION_URLS[region.toLowerCase()] : undefined;
  if (regionUrl && regionUrl !== BASE_URL) {
    urls.push(regionUrl);
  }

  // Search all endpoints in parallel
  const allResults = await Promise.all(
    urls.map((baseUrl) => searchOffEndpoint(baseUrl, query, maxResults))
  );

  // Merge and deduplicate by barcode
  const seen = new Set<string>();
  const merged: FoodMatch[] = [];
  for (const results of allResults) {
    for (const match of results) {
      if (!seen.has(match.sourceId)) {
        seen.add(match.sourceId);
        merged.push(match);
      }
    }
  }

  return merged
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxResults);
}

/**
 * Search a single OFF endpoint.
 */
async function searchOffEndpoint(
  baseUrl: string,
  query: string,
  maxResults: number
): Promise<FoodMatch[]> {
  const url = new URL(`${baseUrl}/cgi/search.pl`);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("json", "true");
  url.searchParams.set("page_size", String(Math.min(maxResults * 2, 25)));
  url.searchParams.set("sort_by", "unique_scans_n"); // sort by popularity
  url.searchParams.set(
    "fields",
    "code,product_name,brands,nutriments,serving_size,serving_quantity,categories_tags,countries_tags,popularity_key"
  );

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
    });

    if (!response.ok) {
      console.warn(`OFF API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = (await response.json()) as OffSearchResponse;

    if (!data.products || data.products.length === 0) return [];

    const matches: FoodMatch[] = data.products
      .filter((p) => p.product_name && p.nutriments)
      .map((product): FoodMatch => {
        const nutrients = buildNutrientProfile(product.nutriments!);
        const servingSize = parseServingSize(product);
        const servingUnit = "g";

        // OFF nutrients are per 100g — scale to actual serving
        const scale = servingSize / 100;
        const scaledNutrients: NutrientProfile = {
          calories: Math.round(nutrients.calories * scale),
          protein: Math.round(nutrients.protein * scale * 10) / 10,
          carbs: Math.round(nutrients.carbs * scale * 10) / 10,
          fat: Math.round(nutrients.fat * scale * 10) / 10,
          fiber:
            nutrients.fiber !== undefined
              ? Math.round(nutrients.fiber * scale * 10) / 10
              : undefined,
          sugar:
            nutrients.sugar !== undefined
              ? Math.round(nutrients.sugar * scale * 10) / 10
              : undefined,
          sodium:
            nutrients.sodium !== undefined
              ? Math.round(nutrients.sodium * scale)
              : undefined,
        };

        return {
          source: "openfoodfacts",
          sourceId: product.code,
          name: product.product_name!,
          brand: product.brands ?? undefined,
          nutrients: scaledNutrients,
          servingSize,
          servingUnit,
          servingDescription:
            product.serving_size ?? `${servingSize}${servingUnit}`,
          matchScore: scoreMatch(product, query),
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, maxResults);

    return matches;
  } catch (err) {
    console.warn("OFF search failed:", err);
    return [];
  }
}

// Simple in-memory barcode cache to avoid redundant network calls
const barcodeCache = new Map<
  string,
  { result: FoodMatch | null; ts: number }
>();
const BARCODE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Look up a specific product by barcode.
 *
 * @param barcode  EAN/UPC barcode string
 * @returns        FoodMatch or null if not found
 */
export async function lookupBarcode(
  barcode: string
): Promise<FoodMatch | null> {
  // Check cache first
  const cached = barcodeCache.get(barcode);
  if (cached && Date.now() - cached.ts < BARCODE_CACHE_TTL) {
    return cached.result;
  }

  const url = `${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}`;

  // 5-second timeout to avoid hanging on slow networks
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      status: number;
      product: OffProduct;
    };
    if (data.status !== 1 || !data.product?.nutriments) return null;

    const product = data.product;
    const nutrients = buildNutrientProfile(product.nutriments!);
    const servingSize = parseServingSize(product);
    const scale = servingSize / 100;

    const result: FoodMatch = {
      source: "openfoodfacts",
      sourceId: barcode,
      name: product.product_name ?? `Product ${barcode}`,
      brand: product.brands ?? undefined,
      nutrients: {
        calories: Math.round(nutrients.calories * scale),
        protein: Math.round(nutrients.protein * scale * 10) / 10,
        carbs: Math.round(nutrients.carbs * scale * 10) / 10,
        fat: Math.round(nutrients.fat * scale * 10) / 10,
        fiber:
          nutrients.fiber !== undefined
            ? Math.round(nutrients.fiber * scale * 10) / 10
            : undefined,
        sugar:
          nutrients.sugar !== undefined
            ? Math.round(nutrients.sugar * scale * 10) / 10
            : undefined,
        sodium:
          nutrients.sodium !== undefined
            ? Math.round(nutrients.sodium * scale)
            : undefined,
      },
      servingSize,
      servingUnit: "g",
      servingDescription: product.serving_size ?? `${servingSize}g`,
      matchScore: 1.0, // barcode lookup is exact
    };

    barcodeCache.set(barcode, { result, ts: Date.now() });
    return result;
  } catch (err) {
    console.warn("OFF barcode lookup failed:", err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
