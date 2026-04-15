#!/usr/bin/env node
/**
 * USDA FoodData Central → Supabase Import Script
 *
 * Reads the USDA FoodData Central CSV download and imports
 * Foundation Foods, SR Legacy, and Survey (FNDDS) foods into
 * the `nutrition_dataset` table.
 *
 * Usage:
 *   node scripts/import-usda.js "/path/to/FoodData_Central_csv_2025-04-24"
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 *           (or set them in .env)
 *
 * Streams all files line-by-line to avoid OOM on the 2.4M-row food.csv.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ─── Config ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

// Nutrient IDs we care about (from nutrient.csv)
const NUTRIENT_MAP = {
  1008: "calories",       // Energy (kcal) — primary
  2047: "calories_atw_general",  // Energy (Atwater General Factors) kcal — fallback
  2048: "calories_atw_specific", // Energy (Atwater Specific Factors) kcal — fallback
  1003: "protein",        // Protein (g)
  1005: "carbs",          // Carbohydrate, by difference (g)
  1004: "fat",            // Total lipid / fat (g)
  1079: "fiber",          // Fiber, total dietary (g)
  1063: "sugar",          // Sugars, Total (g)
  1093: "sodium",         // Sodium, Na (mg)
  1258: "saturated_fat",  // Fatty acids, total saturated (g)
  1253: "cholesterol",    // Cholesterol (mg)
  1092: "potassium",      // Potassium, K (mg)
};

// data_type values we import (skip branded — too large, separate import)
const DATASET_MAP = {
  foundation_food: "usda_foundation",
  sr_legacy_food: "usda_sr_legacy",
  survey_fndds_food: "usda_survey",
};

// ─── CSV Parser (minimal, handles quoted fields) ────────────────────────────

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Stream a CSV file line-by-line, calling `onRow(fields, headers)` for each data row.
 */
function streamCSV(filePath, onRow) {
  return new Promise((resolve, reject) => {
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath, { encoding: "utf-8" }),
      crlfDelay: Infinity,
    });

    let headers = null;
    let count = 0;

    rl.on("line", (line) => {
      if (!line.trim()) return;
      const fields = parseCSVLine(line);
      if (!headers) {
        headers = fields;
        return;
      }
      count++;
      onRow(fields, headers);
    });

    rl.on("close", () => resolve(count));
    rl.on("error", reject);
  });
}

/**
 * Load a small CSV entirely into memory (for food_category.csv etc.)
 */
function loadSmallCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim().length > 0);
  const headers = parseCSVLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    const row = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = fields[j] ?? "";
    }
    rows.push(row);
  }
  return rows;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const csvDir = process.argv[2];
  if (!csvDir) {
    console.error("Usage: node scripts/import-usda.js <path-to-csv-dir>");
    console.error('  e.g. node scripts/import-usda.js "/Users/you/Downloads/FoodData_Central_csv_2025-04-24"');
    process.exit(1);
  }

  if (!fs.existsSync(path.join(csvDir, "food.csv"))) {
    console.error(`Error: food.csv not found in ${csvDir}`);
    process.exit(1);
  }

  // Check for Supabase config
  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const dryRun = !supabaseUrl || !supabaseKey;
  if (dryRun) {
    console.log("⚠️  No SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY found.");
    console.log("   Running in DRY RUN mode — will parse CSVs and show stats but NOT insert.\n");
  }

  let supabase = null;
  if (!dryRun) {
    const { createClient } = require("@supabase/supabase-js");
    supabase = createClient(supabaseUrl, supabaseKey);
  }

  // ── Step 1: Stream food.csv — only keep target data types ─────────────
  console.log("📂 Streaming food.csv (filtering to target types)...");

  const foodById = new Map(); // fdc_id → { data_type, description, food_category_id }
  let totalFoodRows = 0;

  await streamCSV(path.join(csvDir, "food.csv"), (fields, headers) => {
    totalFoodRows++;
    const fdcId = fields[headers.indexOf("fdc_id")];
    const dataType = fields[headers.indexOf("data_type")];
    if (!(dataType in DATASET_MAP)) return;

    foodById.set(fdcId, {
      fdc_id: fdcId,
      data_type: dataType,
      description: fields[headers.indexOf("description")],
      food_category_id: fields[headers.indexOf("food_category_id")],
    });
  });

  console.log(`   Total rows scanned: ${totalFoodRows.toLocaleString()}`);
  console.log(`   Target foods kept: ${foodById.size.toLocaleString()}`);

  // ── Step 2: Load food_category.csv (small file) ───────────────────────
  console.log("📂 Loading food_category.csv...");
  const categories = loadSmallCSV(path.join(csvDir, "food_category.csv"));
  const categoryById = new Map();
  for (const c of categories) {
    categoryById.set(c.id, c.description);
  }
  console.log(`   Categories: ${categories.length}`);

  // ── Step 3: Stream food_nutrient.csv — pivot to macros per food ───────
  console.log("📂 Streaming food_nutrient.csv (this may take a moment)...");

  const nutrientsByFdc = new Map(); // fdc_id → { calories, protein, carbs, fat, ... }
  let nutrientRowsProcessed = 0;
  let nutrientRowsKept = 0;

  await streamCSV(path.join(csvDir, "food_nutrient.csv"), (fields, headers) => {
    nutrientRowsProcessed++;

    const fdcId = fields[headers.indexOf("fdc_id")];
    if (!foodById.has(fdcId)) return;

    const nutrientId = parseInt(fields[headers.indexOf("nutrient_id")], 10);
    const macroKey = NUTRIENT_MAP[nutrientId];
    if (!macroKey) return;

    const amount = parseFloat(fields[headers.indexOf("amount")]);
    if (isNaN(amount)) return;

    nutrientRowsKept++;

    if (!nutrientsByFdc.has(fdcId)) {
      nutrientsByFdc.set(fdcId, {});
    }
    nutrientsByFdc.get(fdcId)[macroKey] = amount;
  });

  console.log(`   Nutrient rows scanned: ${nutrientRowsProcessed.toLocaleString()}`);
  console.log(`   Nutrient rows kept: ${nutrientRowsKept.toLocaleString()}`);
  console.log(`   Foods with nutrients: ${nutrientsByFdc.size.toLocaleString()}`);

  // ── Step 4: Stream food_portion.csv ───────────────────────────────────
  console.log("📂 Streaming food_portion.csv...");

  const portionsByFdc = new Map(); // fdc_id → [{ desc, grams }]

  await streamCSV(path.join(csvDir, "food_portion.csv"), (fields, headers) => {
    const fdcId = fields[headers.indexOf("fdc_id")];
    if (!foodById.has(fdcId)) return;

    const grams = parseFloat(fields[headers.indexOf("gram_weight")]);
    if (isNaN(grams) || grams <= 0) return;

    if (!portionsByFdc.has(fdcId)) {
      portionsByFdc.set(fdcId, []);
    }

    const desc =
      [
        fields[headers.indexOf("portion_description")],
        fields[headers.indexOf("modifier")],
      ]
        .filter(Boolean)
        .join(" ")
        .trim() || "serving";
    portionsByFdc.get(fdcId).push({ desc, grams });
  });

  console.log(`   Foods with portions: ${portionsByFdc.size.toLocaleString()}`);

  // ── Step 5: Build import rows ─────────────────────────────────────────
  console.log("\n🔨 Building import rows...");

  const rows = [];
  let skippedNoCal = 0;

  for (const [fdcId, food] of foodById) {
    const nutrients = nutrientsByFdc.get(fdcId);
    if (!nutrients) {
      skippedNoCal++;
      continue;
    }
    // Resolve calories: prefer 1008, fallback to Atwater General (2047), then Specific (2048)
    if (nutrients.calories == null) {
      nutrients.calories = nutrients.calories_atw_general ?? nutrients.calories_atw_specific ?? null;
    }
    if (nutrients.calories == null) {
      skippedNoCal++;
      continue;
    }

    const category = categoryById.get(food.food_category_id) || null;
    const portionList = portionsByFdc.get(fdcId) || [];

    // Pick the best serving: prefer the first one
    const bestPortion = portionList[0];

    const name = food.description.trim();
    const nameNormalized = name.toLowerCase().replace(/\s+/g, " ").trim();

    rows.push({
      dataset: DATASET_MAP[food.data_type],
      dataset_version: "2025-04-24",
      source_id: fdcId,
      name,
      name_normalized: nameNormalized,
      brand: null,
      barcode: null,
      category,
      food_group: category, // USDA uses category as food group
      calories_per_100g: nutrients.calories || 0,
      protein_per_100g: nutrients.protein || 0,
      carbs_per_100g: nutrients.carbs || 0,
      fat_per_100g: nutrients.fat || 0,
      fiber_per_100g: nutrients.fiber ?? null,
      sugar_per_100g: nutrients.sugar ?? null,
      sodium_per_100g: nutrients.sodium ?? null,
      saturated_fat_per_100g: nutrients.saturated_fat ?? null,
      cholesterol_per_100g: nutrients.cholesterol ?? null,
      potassium_per_100g: nutrients.potassium ?? null,
      micronutrients: null,
      serving_size_g: bestPortion?.grams ?? null,
      serving_desc: bestPortion?.desc ?? null,
      household_serving: bestPortion?.desc ?? null,
      portions: portionList.length > 0 ? JSON.stringify(portionList) : null,
      data_quality: food.data_type === "foundation_food" ? "gold" : "standard",
    });
  }

  console.log(`   Import rows built: ${rows.length.toLocaleString()}`);
  console.log(`   Skipped (no calories): ${skippedNoCal}`);

  // Stats breakdown
  const byDataset = {};
  for (const r of rows) {
    byDataset[r.dataset] = (byDataset[r.dataset] || 0) + 1;
  }
  console.log("\n📊 Breakdown:");
  for (const [ds, count] of Object.entries(byDataset)) {
    console.log(`   ${ds}: ${count.toLocaleString()}`);
  }

  // Show sample
  console.log("\n📋 Sample rows:");
  for (const r of rows.slice(0, 5)) {
    console.log(
      `   ${r.name.substring(0, 55).padEnd(55)} | ${String(r.calories_per_100g).padStart(6)} cal | ${String(r.protein_per_100g).padStart(5)}g P | ${String(r.carbs_per_100g).padStart(5)}g C | ${String(r.fat_per_100g).padStart(5)}g F | ${r.serving_desc || "no serving"}`
    );
  }

  if (dryRun) {
    console.log("\n✅ Dry run complete. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to import.");
    return;
  }

  // ── Step 6: Batch insert into Supabase ────────────────────────────────
  console.log(`\n🚀 Inserting ${rows.length.toLocaleString()} rows into Supabase (batch size: ${BATCH_SIZE})...`);

  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from("nutrition_dataset")
      .upsert(batch, { onConflict: "dataset,source_id" });

    if (error) {
      console.error(`   ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`);
      errors++;
    } else {
      inserted += batch.length;
    }

    // Progress every 10 batches
    if ((Math.floor(i / BATCH_SIZE) + 1) % 10 === 0) {
      console.log(`   Progress: ${inserted.toLocaleString()} / ${rows.length.toLocaleString()}`);
    }
  }

  console.log(`\n✅ Import complete!`);
  console.log(`   Inserted: ${inserted.toLocaleString()}`);
  if (errors > 0) console.log(`   Failed batches: ${errors}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
