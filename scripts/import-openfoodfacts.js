#!/usr/bin/env node
/**
 * Open Food Facts → Supabase Import Script
 *
 * Downloads and imports Open Food Facts CSV data into the
 * `nutrition_dataset` table for instant local lookups.
 *
 * OFF provides a daily CSV dump (~7GB compressed) at:
 *   https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
 *
 * Usage:
 *   # Import from a pre-downloaded CSV file:
 *   node scripts/import-openfoodfacts.js /path/to/en.openfoodfacts.org.products.csv
 *
 *   # Filter to specific countries (comma-separated):
 *   node scripts/import-openfoodfacts.js /path/to/products.csv --countries=gb,pl,es,fr,de
 *
 *   # Dry-run (preview without inserting):
 *   node scripts/import-openfoodfacts.js /path/to/products.csv --dry-run
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 *
 * The OFF CSV uses tab-separated values and has ~3M rows.
 * This script streams everything line-by-line to avoid OOM.
 */

const fs = require("fs");
const readline = require("readline");

// ─── Config ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;
const DATASET_NAME = "openfoodfacts";
const DATASET_VERSION = new Date().toISOString().slice(0, 7); // e.g. "2026-03"

// OFF CSV columns we need (tab-separated)
const REQUIRED_COLUMNS = [
  "code",
  "product_name",
  "brands",
  "categories_en",
  "countries_tags",
  "serving_size",
  "serving_quantity",
  // Nutrient columns (per 100g)
  "energy-kcal_100g",
  "proteins_100g",
  "carbohydrates_100g",
  "fat_100g",
  "fiber_100g",
  "sugars_100g",
  "sodium_100g",
  "saturated-fat_100g",
];

// Countries to prioritise for import — ISO alpha-2 codes
// By default, import everything; use --countries flag to filter
const EU_UK_COUNTRIES = new Set([
  "en:united-kingdom",
  "en:france",
  "en:germany",
  "en:spain",
  "en:italy",
  "en:netherlands",
  "en:belgium",
  "en:poland",
  "en:portugal",
  "en:ireland",
  "en:austria",
  "en:switzerland",
  "en:sweden",
  "en:denmark",
  "en:finland",
  "en:norway",
  "en:czech-republic",
  "en:romania",
  "en:hungary",
  "en:greece",
  "en:croatia",
  "en:slovakia",
  "en:bulgaria",
  "en:slovenia",
  "en:luxembourg",
  // US/Canada for full coverage
  "en:united-states",
  "en:canada",
  "en:australia",
  "en:mexico",
  "en:brazil",
]);

// Short-code → OFF country tag mapping for --countries flag
const COUNTRY_CODE_MAP = {
  gb: "en:united-kingdom",
  uk: "en:united-kingdom",
  fr: "en:france",
  de: "en:germany",
  es: "en:spain",
  it: "en:italy",
  nl: "en:netherlands",
  be: "en:belgium",
  pl: "en:poland",
  pt: "en:portugal",
  ie: "en:ireland",
  at: "en:austria",
  ch: "en:switzerland",
  se: "en:sweden",
  dk: "en:denmark",
  fi: "en:finland",
  no: "en:norway",
  cz: "en:czech-republic",
  ro: "en:romania",
  hu: "en:hungary",
  gr: "en:greece",
  hr: "en:croatia",
  sk: "en:slovakia",
  bg: "en:bulgaria",
  si: "en:slovenia",
  lu: "en:luxembourg",
  us: "en:united-states",
  ca: "en:canada",
  au: "en:australia",
  mx: "en:mexico",
  br: "en:brazil",
};

// ─── Argument parsing ───────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { csvPath: null, countries: null, dryRun: false };

  for (const arg of args) {
    if (arg.startsWith("--countries=")) {
      const codes = arg.split("=")[1].split(",").map((c) => c.trim().toLowerCase());
      result.countries = new Set();
      for (const code of codes) {
        const tag = COUNTRY_CODE_MAP[code];
        if (tag) result.countries.add(tag);
        else console.warn(`⚠️  Unknown country code: ${code}`);
      }
    } else if (arg === "--dry-run") {
      result.dryRun = true;
    } else if (!arg.startsWith("--")) {
      result.csvPath = arg;
    }
  }

  return result;
}

// ─── Row Processing ─────────────────────────────────────────────────────────

/**
 * Parse serving size string (e.g. "30g", "1 bar (40g)", "250ml") → grams.
 */
function parseServingGrams(servingSize, servingQuantity) {
  if (servingQuantity && !isNaN(parseFloat(servingQuantity))) {
    const qty = parseFloat(servingQuantity);
    if (qty > 0 && qty < 10000) return qty;
  }

  if (servingSize) {
    const gMatch = servingSize.match(/(\d+(?:\.\d+)?)\s*g/i);
    if (gMatch) return parseFloat(gMatch[1]);

    const mlMatch = servingSize.match(/(\d+(?:\.\d+)?)\s*ml/i);
    if (mlMatch) return parseFloat(mlMatch[1]);
  }

  return null;
}

/**
 * Convert an OFF CSV row into a nutrition_dataset row object.
 * Returns null if the product lacks required data (name, calories).
 */
function rowToDatasetEntry(fields, headerIndex) {
  const code = fields[headerIndex["code"]]?.trim();
  const name = fields[headerIndex["product_name"]]?.trim();
  const brands = fields[headerIndex["brands"]]?.trim() || null;
  const category = fields[headerIndex["categories_en"]]?.trim() || null;
  const servingSize = fields[headerIndex["serving_size"]]?.trim() || null;
  const servingQty = fields[headerIndex["serving_quantity"]]?.trim() || null;

  // Must have a barcode and a product name
  if (!code || !name || name.length < 2) return null;
  // Barcode must be valid length (EAN-8+)
  if (code.length < 8 || code.length > 14) return null;

  // Parse nutrients (per 100g)
  const calories = parseFloat(fields[headerIndex["energy-kcal_100g"]]);
  const protein = parseFloat(fields[headerIndex["proteins_100g"]]);
  const carbs = parseFloat(fields[headerIndex["carbohydrates_100g"]]);
  const fat = parseFloat(fields[headerIndex["fat_100g"]]);

  // Must have at least calories
  if (isNaN(calories) || calories <= 0) return null;

  // Sanity check: reject unreasonable values
  if (calories > 1000) return null; // > 1000 kcal per 100g is almost certainly an error
  if (protein > 100 || carbs > 100 || fat > 100) return null;

  const fiber = parseFloat(fields[headerIndex["fiber_100g"]]);
  const sugar = parseFloat(fields[headerIndex["sugars_100g"]]);
  const sodium = parseFloat(fields[headerIndex["sodium_100g"]]);
  const saturatedFat = parseFloat(fields[headerIndex["saturated-fat_100g"]]);

  const servingGrams = parseServingGrams(servingSize, servingQty);

  // First category from comma-separated list
  const primaryCategory = category ? category.split(",")[0].trim() : null;

  return {
    dataset: DATASET_NAME,
    dataset_version: DATASET_VERSION,
    source_id: code,
    name: name,
    name_normalized: name.toLowerCase().trim(),
    brand: brands ? brands.split(",")[0].trim() : null,
    barcode: code,
    category: primaryCategory,
    food_group: null,
    calories_per_100g: Math.round(calories * 10) / 10,
    protein_per_100g: isNaN(protein) ? 0 : Math.round(protein * 10) / 10,
    carbs_per_100g: isNaN(carbs) ? 0 : Math.round(carbs * 10) / 10,
    fat_per_100g: isNaN(fat) ? 0 : Math.round(fat * 10) / 10,
    fiber_per_100g: isNaN(fiber) ? null : Math.round(fiber * 10) / 10,
    sugar_per_100g: isNaN(sugar) ? null : Math.round(sugar * 10) / 10,
    sodium_per_100g: isNaN(sodium) ? null : Math.round(sodium * 1000), // g → mg
    saturated_fat_per_100g: isNaN(saturatedFat) ? null : Math.round(saturatedFat * 10) / 10,
    serving_size_g: servingGrams,
    serving_desc: servingSize,
    household_serving: null,
    data_quality: "standard",
  };
}

/**
 * Check if a product's countries_tags include any of our target countries.
 */
function matchesCountryFilter(countriesTags, filterSet) {
  if (!filterSet) return true; // no filter = import all
  if (!countriesTags) return false;

  // countries_tags is comma-separated: "en:france,en:united-kingdom"
  const tags = countriesTags.split(",").map((t) => t.trim().toLowerCase());
  return tags.some((tag) => filterSet.has(tag));
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const { csvPath, countries, dryRun } = parseArgs();

  if (!csvPath) {
    console.error(`
Usage: node scripts/import-openfoodfacts.js <csv-path> [options]

Options:
  --countries=gb,pl,es,...   Filter to specific countries (default: all)
  --dry-run                  Preview without inserting to database

Example:
  node scripts/import-openfoodfacts.js ./en.openfoodfacts.org.products.csv --countries=gb,pl,es,fr,de

Download the CSV dump:
  curl -L https://static.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz | gunzip > products.csv
`);
    process.exit(1);
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`❌ File not found: ${csvPath}`);
    process.exit(1);
  }

  let supabase = null;

  if (!dryRun) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
      process.exit(1);
    }

    const { createClient } = require("@supabase/supabase-js");
    supabase = createClient(supabaseUrl, supabaseKey);
  }

  console.log(`\n🌍 Open Food Facts → Supabase Import`);
  console.log(`   File: ${csvPath}`);
  console.log(`   Country filter: ${countries ? [...countries].join(", ") : "ALL"}`);
  console.log(`   Mode: ${dryRun ? "DRY RUN" : "LIVE"}\n`);

  // ── Step 1: Delete old OFF data (avoid duplicates on re-import) ──
  if (!dryRun && supabase) {
    console.log("🗑  Clearing existing Open Food Facts data...");
    const { error } = await supabase
      .from("nutrition_dataset")
      .delete()
      .eq("dataset", DATASET_NAME);

    if (error) {
      console.error("❌ Failed to clear old data:", error.message);
      process.exit(1);
    }
    console.log("   Done.\n");
  }

  // ── Step 2: Stream the TSV file ──
  console.log("📂 Streaming OFF CSV...");

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let headers = null;
  let headerIndex = {};
  let scanned = 0;
  let skippedCountry = 0;
  let skippedQuality = 0;
  let queued = 0;
  let inserted = 0;
  let errors = 0;
  let batch = [];

  async function flushBatch() {
    if (batch.length === 0) return;

    if (dryRun) {
      inserted += batch.length;
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
      errors += batch.length;
      // Log first few errors for debugging
      if (errors <= 5) {
        console.error(`   ⚠️  Batch upsert error: ${error.message}`);
      }
    } else {
      inserted += batch.length;
    }

    batch = [];
  }

  for await (const line of rl) {
    if (!line.trim()) continue;

    // OFF CSV uses tabs
    const fields = line.split("\t");

    if (!headers) {
      headers = fields;
      headerIndex = {};
      for (let i = 0; i < headers.length; i++) {
        headerIndex[headers[i]] = i;
      }

      // Validate required columns exist
      const missing = REQUIRED_COLUMNS.filter((c) => !(c in headerIndex));
      if (missing.length > 0) {
        console.error(`❌ Missing columns in CSV: ${missing.join(", ")}`);
        console.error(`   Available: ${headers.slice(0, 30).join(", ")}...`);
        process.exit(1);
      }
      continue;
    }

    scanned++;

    // Country filter
    const countriesTags = fields[headerIndex["countries_tags"]]?.trim() || "";
    if (!matchesCountryFilter(countriesTags, countries)) {
      skippedCountry++;
      continue;
    }

    // Convert to dataset row
    const entry = rowToDatasetEntry(fields, headerIndex);
    if (!entry) {
      skippedQuality++;
      continue;
    }

    // Attach country_tags array for region-aware queries
    if (countriesTags) {
      entry.country_tags = countriesTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);
    }

    batch.push(entry);
    queued++;

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    }

    // Progress logging
    if (scanned % 250_000 === 0) {
      console.log(
        `   ... scanned ${(scanned / 1000).toFixed(0)}K | ` +
        `queued ${queued.toLocaleString()} | ` +
        `inserted ${inserted.toLocaleString()} | ` +
        `skipped country ${skippedCountry.toLocaleString()} | ` +
        `skipped quality ${skippedQuality.toLocaleString()}`
      );
    }
  }

  // Flush remaining
  await flushBatch();

  console.log(`\n✅ Import complete!`);
  console.log(`   Total scanned:    ${scanned.toLocaleString()}`);
  console.log(`   Inserted/updated: ${inserted.toLocaleString()}`);
  console.log(`   Skipped (country): ${skippedCountry.toLocaleString()}`);
  console.log(`   Skipped (quality): ${skippedQuality.toLocaleString()}`);
  console.log(`   Errors:           ${errors.toLocaleString()}`);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
