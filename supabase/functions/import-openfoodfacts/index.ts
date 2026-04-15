/// <reference lib="deno.ns" />
/**
 * Supabase Edge Function: Import Open Food Facts
 *
 * Pulls food products directly from the Open Food Facts API into the
 * `nutrition_dataset` table — no local CSV download required.
 *
 * Runs entirely server-side: OFF API → this function → Supabase DB.
 *
 * Usage (via curl or Supabase dashboard):
 *
 *   # Import UK products (default: pages 1-50)
 *   curl -X POST https://<project>.supabase.co/functions/v1/import-openfoodfacts \
 *     -H "Authorization: Bearer <service_role_key>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"country": "united-kingdom"}'
 *
 *   # Import Polish products, pages 51-100
 *   curl -X POST https://<project>.supabase.co/functions/v1/import-openfoodfacts \
 *     -H "Authorization: Bearer <service_role_key>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"country": "poland", "startPage": 51, "endPage": 100}'
 *
 *   # Dry run (preview without inserting)
 *   curl -X POST ... -d '{"country": "spain", "dryRun": true}'
 *
 * The function pages through the OFF search API (100 products/page),
 * validates nutrition data, and upserts into `nutrition_dataset`.
 *
 * Security:
 *   - Requires service_role key (admin only — not user-facing)
 *   - No user data is involved
 */

import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

const OFF_BASE_URL = "https://world.openfoodfacts.org";
const OFF_USER_AGENT = "Caloric/1.0 (calorie-tracking-app; supabase-import)";
const PAGE_SIZE = 100; // OFF max per request
const BATCH_SIZE = 200; // DB upsert batch size
const DEFAULT_START_PAGE = 1;
const DEFAULT_END_PAGE = 50; // 50 pages × 100 = 5000 products per invocation
const DATASET_NAME = "openfoodfacts";
const REQUEST_DELAY_MS = 500; // Be polite to OFF servers (~2 req/sec)

// OFF country names for the search API
const COUNTRY_NAMES: Record<string, string> = {
  gb: "united-kingdom",
  uk: "united-kingdom",
  "united-kingdom": "united-kingdom",
  ie: "ireland",
  ireland: "ireland",
  fr: "france",
  france: "france",
  de: "germany",
  germany: "germany",
  es: "spain",
  spain: "spain",
  it: "italy",
  italy: "italy",
  nl: "netherlands",
  netherlands: "netherlands",
  be: "belgium",
  belgium: "belgium",
  pl: "poland",
  poland: "poland",
  pt: "portugal",
  portugal: "portugal",
  at: "austria",
  austria: "austria",
  ch: "switzerland",
  switzerland: "switzerland",
  se: "sweden",
  sweden: "sweden",
  dk: "denmark",
  denmark: "denmark",
  fi: "finland",
  finland: "finland",
  no: "norway",
  norway: "norway",
  cz: "czech-republic",
  "czech-republic": "czech-republic",
  hu: "hungary",
  hungary: "hungary",
  ro: "romania",
  romania: "romania",
  gr: "greece",
  greece: "greece",
  hr: "croatia",
  croatia: "croatia",
  sk: "slovakia",
  slovakia: "slovakia",
  bg: "bulgaria",
  bulgaria: "bulgaria",
  si: "slovenia",
  slovenia: "slovenia",
  us: "united-states",
  "united-states": "united-states",
  ca: "canada",
  canada: "canada",
  au: "australia",
  australia: "australia",
  mx: "mexico",
  mexico: "mexico",
  br: "brazil",
  brazil: "brazil",
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface ImportRequest {
  country: string;
  startPage?: number;
  endPage?: number;
  dryRun?: boolean;
}

interface OffProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  categories_en?: string;
  countries_tags?: string[];
  nutriments?: {
    "energy-kcal_100g"?: number;
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    fiber_100g?: number;
    sugars_100g?: number;
    sodium_100g?: number;
    "saturated-fat_100g"?: number;
  };
  serving_size?: string;
  serving_quantity?: number;
}

interface OffSearchResponse {
  count: number;
  page: number;
  page_count: number;
  page_size: number;
  products: OffProduct[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseServingGrams(product: OffProduct): number | null {
  if (
    product.serving_quantity &&
    product.serving_quantity > 0 &&
    product.serving_quantity < 10000
  ) {
    return product.serving_quantity;
  }
  if (product.serving_size) {
    const gMatch = product.serving_size.match(/(\d+(?:\.\d+)?)\s*g/i);
    if (gMatch) return parseFloat(gMatch[1]);
    const mlMatch = product.serving_size.match(/(\d+(?:\.\d+)?)\s*ml/i);
    if (mlMatch) return parseFloat(mlMatch[1]);
  }
  return null;
}

function productToRow(product: OffProduct, countryTag: string) {
  const code = product.code?.trim();
  const name = product.product_name?.trim();
  if (!code || !name || name.length < 2) return null;
  if (code.length < 8 || code.length > 14) return null;

  const n = product.nutriments;
  if (!n) return null;

  const calories = n["energy-kcal_100g"];
  if (!calories || calories <= 0 || calories > 1000) return null;

  const protein = n.proteins_100g ?? 0;
  const carbs = n.carbohydrates_100g ?? 0;
  const fat = n.fat_100g ?? 0;
  if (protein > 100 || carbs > 100 || fat > 100) return null;

  const countryTags = product.countries_tags?.length
    ? product.countries_tags.map((t: string) => t.toLowerCase())
    : [`en:${countryTag}`];

  const brands = product.brands?.trim() || null;

  return {
    dataset: DATASET_NAME,
    dataset_version: new Date().toISOString().slice(0, 7),
    source_id: code,
    name,
    name_normalized: name.toLowerCase().trim(),
    brand: brands ? brands.split(",")[0].trim() : null,
    barcode: code,
    category: product.categories_en?.split(",")[0]?.trim() || null,
    food_group: null,
    calories_per_100g: Math.round(calories * 10) / 10,
    protein_per_100g: Math.round(protein * 10) / 10,
    carbs_per_100g: Math.round(carbs * 10) / 10,
    fat_per_100g: Math.round(fat * 10) / 10,
    fiber_per_100g:
      n.fiber_100g != null ? Math.round(n.fiber_100g * 10) / 10 : null,
    sugar_per_100g:
      n.sugars_100g != null ? Math.round(n.sugars_100g * 10) / 10 : null,
    sodium_per_100g:
      n.sodium_100g != null ? Math.round(n.sodium_100g * 1000) : null,
    saturated_fat_per_100g:
      n["saturated-fat_100g"] != null
        ? Math.round(n["saturated-fat_100g"] * 10) / 10
        : null,
    serving_size_g: parseServingGrams(product),
    serving_desc: product.serving_size || null,
    household_serving: null,
    data_quality: "standard",
    country_tags: countryTags,
  };
}

async function fetchPage(
  country: string,
  page: number
): Promise<OffSearchResponse> {
  const url = new URL(`${OFF_BASE_URL}/api/v2/search`);
  url.searchParams.set("countries_tags", `en:${country}`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("page_size", String(PAGE_SIZE));
  url.searchParams.set("sort_by", "unique_scans_n");
  url.searchParams.set(
    "fields",
    [
      "code",
      "product_name",
      "brands",
      "categories_en",
      "countries_tags",
      "nutriments",
      "serving_size",
      "serving_quantity",
    ].join(",")
  );

  const resp = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": OFF_USER_AGENT,
    },
  });

  if (!resp.ok) {
    throw new Error(`OFF API error: ${resp.status} ${resp.statusText}`);
  }

  return resp.json();
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Only allow POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Authenticate — the caller passes an authorization token.
  // We use it to create the Supabase client. If it's the service_role key,
  // the client will have full access. If not, upserts will fail via RLS.
  const authHeader = req.headers.get("Authorization");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;

  // Extract the token from "Bearer <token>"
  const token = authHeader?.replace("Bearer ", "")?.trim() ?? "";
  if (!token) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Parse request
  let body: ImportRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rawCountry = (body.country || "").toLowerCase().trim().slice(0, 20);
  const countryName = COUNTRY_NAMES[rawCountry];
  if (!countryName) {
    return new Response(
      JSON.stringify({
        error: "Invalid country code",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const startPage = body.startPage ?? DEFAULT_START_PAGE;
  const endPage = body.endPage ?? DEFAULT_END_PAGE;
  const dryRun = body.dryRun ?? false;

  // Create Supabase client using the provided token
  // If it's a service_role key, we get full access. If not, RLS will block writes.
  const supabase = createClient(supabaseUrl, token);

  // ── Process pages with streaming progress ──
  const stats = {
    country: countryName,
    startPage,
    endPage,
    totalProducts: 0,
    validProducts: 0,
    inserted: 0,
    skippedQuality: 0,
    errors: 0,
    pagesProcessed: 0,
    dryRun,
  };

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      function emit(event: Record<string, unknown>) {
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      }

      // Emit start event
      emit({
        type: "start",
        country: countryName,
        startPage,
        endPage,
        dryRun,
        estimatedProducts: (endPage - startPage + 1) * PAGE_SIZE,
        timestamp: new Date().toISOString(),
      });

      let batch: Record<string, unknown>[] = [];

      async function flushBatch() {
        if (batch.length === 0) return;

        if (dryRun) {
          stats.inserted += batch.length;
          batch = [];
          return;
        }

        const { error } = await supabase
          .from("nutrition_dataset")
          .upsert(batch, {
            onConflict: "dataset,source_id",
            ignoreDuplicates: false,
          });

        if (error) {
          stats.errors += batch.length;
          emit({ type: "error", message: `Batch upsert: ${error.message}` });
        } else {
          stats.inserted += batch.length;
        }

        batch = [];
      }

      for (let page = startPage; page <= endPage; page++) {
        try {
          const data = await fetchPage(countryName, page);

          // If no products returned, we've exhausted results
          if (!data.products || data.products.length === 0) {
            emit({ type: "exhausted", page, message: "No more products" });
            break;
          }

          stats.totalProducts += data.products.length;
          stats.pagesProcessed++;

          let pageValid = 0;
          let pageSkipped = 0;
          const pageBrands: string[] = [];

          for (const product of data.products) {
            const row = productToRow(product, countryName);
            if (!row) {
              stats.skippedQuality++;
              pageSkipped++;
              continue;
            }

            stats.validProducts++;
            pageValid++;
            batch.push(row);

            // Collect sample brand names for display
            if (
              row.brand &&
              pageBrands.length < 3 &&
              !pageBrands.includes(row.brand as string)
            ) {
              pageBrands.push(row.brand as string);
            }

            if (batch.length >= BATCH_SIZE) {
              await flushBatch();
            }
          }

          // Emit progress for every page
          emit({
            type: "page",
            page,
            totalPages: endPage - startPage + 1,
            fetched: data.products.length,
            valid: pageValid,
            skipped: pageSkipped,
            sampleBrands: pageBrands,
            cumulative: { ...stats },
          });

          // Be polite — don't hammer the OFF API
          if (page < endPage) {
            await delay(REQUEST_DELAY_MS);
          }
        } catch (err) {
          stats.errors++;
          emit({
            type: "error",
            page,
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }

      // Flush remaining
      await flushBatch();

      // Build continuation hint
      const continueHint =
        stats.pagesProcessed === endPage - startPage + 1
          ? {
              hint: "More products may be available. Run again with the next page range.",
              nextRequest: {
                country: body.country,
                startPage: endPage + 1,
                endPage: endPage + (endPage - startPage + 1),
              },
            }
          : undefined;

      // Emit final summary
      emit({
        type: "done",
        success: true,
        stats,
        continue: continueHint,
        timestamp: new Date().toISOString(),
      });

      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson",
      "Transfer-Encoding": "chunked",
      "X-Content-Type-Options": "nosniff",
    },
  });
});
