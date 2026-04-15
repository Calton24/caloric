#!/usr/bin/env node
/**
 * USDA Branded Foods → Supabase Import Script
 *
 * Imports ~1.97M branded foods from USDA FoodData Central CSV dump.
 * Streams everything to avoid OOM. Processes in chunks.
 *
 * Usage:
 *   node scripts/import-usda-branded.js "/path/to/FoodData_Central_csv_2025-04-24"
 *
 * Requires: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");

// ─── Config ─────────────────────────────────────────────────────────────────

const BATCH_SIZE = 500;

// Nutrient IDs we care about
const NUTRIENT_MAP = {
  1008: "calories",
  2047: "calories_atw_general",
  2048: "calories_atw_specific",
  1003: "protein",
  1005: "carbs",
  1004: "fat",
  1079: "fiber",
  1063: "sugar",
  1093: "sodium",
  1258: "saturated_fat",
  1253: "cholesterol",
  1092: "potassium",
};

// ─── CSV Parser ─────────────────────────────────────────────────────────────

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
      if (!headers) { headers = fields; return; }
      count++;
      onRow(fields, headers);
    });
    rl.on("close", () => resolve(count));
    rl.on("error", reject);
  });
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const csvDir = process.argv[2];
  if (!csvDir) {
    console.error("Usage: node scripts/import-usda-branded.js <path-to-csv-dir>");
    process.exit(1);
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    process.exit(1);
  }

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ── Step 1: Stream food.csv — collect branded food IDs + descriptions ──
  // Single combined map to minimize memory (foodById holds everything)
  console.log("📂 Step 1: Streaming food.csv (branded_food only)...");

  const foodById = new Map(); // fdc_id → { desc, catId }
  let totalScanned = 0;

  await streamCSV(path.join(csvDir, "food.csv"), (fields, headers) => {
    totalScanned++;
    const dataType = fields[headers.indexOf("data_type")];
    if (dataType !== "branded_food") return;

    const fdcId = fields[headers.indexOf("fdc_id")];
    foodById.set(fdcId, {
      desc: fields[headers.indexOf("description")],
      catId: fields[headers.indexOf("food_category_id")],
    });
  });

  console.log(`   Scanned: ${totalScanned.toLocaleString()}`);
  console.log(`   Branded foods: ${foodById.size.toLocaleString()}`);

  // ── Step 2: Stream branded_food.csv — merge brand info into foodById ──
  console.log("📂 Step 2: Streaming branded_food.csv...");

  let brandedRows = 0;

  await streamCSV(path.join(csvDir, "branded_food.csv"), (fields, headers) => {
    brandedRows++;
    const fdcId = fields[headers.indexOf("fdc_id")];
    const entry = foodById.get(fdcId);
    if (!entry) return;

    const brandOwner = fields[headers.indexOf("brand_owner")]?.trim() || null;
    const brandName = fields[headers.indexOf("brand_name")]?.trim() || null;
    const barcode = fields[headers.indexOf("gtin_upc")]?.trim() || null;
    const servingSize = parseFloat(fields[headers.indexOf("serving_size")]);
    const servingSizeUnit = fields[headers.indexOf("serving_size_unit")]?.trim() || "";
    const householdServing = fields[headers.indexOf("household_serving_fulltext")]?.trim() || null;
    const category = fields[headers.indexOf("branded_food_category")]?.trim() || null;

    let servingGrams = null;
    if (!isNaN(servingSize) && servingSize > 0) {
      if (servingSizeUnit === "g" || servingSizeUnit === "GRM") {
        servingGrams = servingSize;
      } else if (servingSizeUnit === "ml" || servingSizeUnit === "MLT") {
        servingGrams = servingSize;
      } else if (servingSizeUnit === "oz" || servingSizeUnit === "ONZ") {
        servingGrams = servingSize * 28.3495;
      }
    }

    // Merge into existing entry
    entry.brand = brandName || brandOwner;
    entry.barcode = barcode && barcode.length >= 8 ? barcode : null;
    entry.servingGrams = servingGrams;
    entry.householdServing = householdServing;
    entry.category = category;
  });

  console.log(`   Branded rows scanned: ${brandedRows.toLocaleString()}`);

  // ── Step 3: Stream food_nutrient.csv — store nutrients compactly ──────
  // Use a compact Float64Array per food instead of objects to save memory.
  // Index: 0=cal, 1=cal_atw_gen, 2=cal_atw_spec, 3=protein, 4=carbs,
  //        5=fat, 6=fiber, 7=sugar, 8=sodium, 9=sat_fat, 10=cholesterol, 11=potassium
  console.log("📂 Step 3: Streaming food_nutrient.csv (branded only — this will take a while)...");

  const COMPACT_IDX = { 1008: 0, 2047: 1, 2048: 2, 1003: 3, 1005: 4, 1004: 5, 1079: 6, 1063: 7, 1093: 8, 1258: 9, 1253: 10, 1092: 11 };
  const nutrientsByFdc = new Map(); // fdc_id → Float64Array(12)
  let nutScanned = 0;
  let nutKept = 0;

  await streamCSV(path.join(csvDir, "food_nutrient.csv"), (fields, headers) => {
    nutScanned++;
    const fdcId = fields[headers.indexOf("fdc_id")];
    if (!foodById.has(fdcId)) return;

    const nutrientId = parseInt(fields[headers.indexOf("nutrient_id")], 10);
    const idx = COMPACT_IDX[nutrientId];
    if (idx === undefined) return;

    const amount = parseFloat(fields[headers.indexOf("amount")]);
    if (isNaN(amount)) return;

    nutKept++;
    if (!nutrientsByFdc.has(fdcId)) {
      const arr = new Float64Array(12);
      arr.fill(NaN);
      nutrientsByFdc.set(fdcId, arr);
    }
    nutrientsByFdc.get(fdcId)[idx] = amount;

    if (nutScanned % 5_000_000 === 0) {
      console.log(`   ... scanned ${(nutScanned / 1_000_000).toFixed(0)}M nutrient rows`);
    }
  });

  console.log(`   Nutrient rows scanned: ${nutScanned.toLocaleString()}`);
  console.log(`   Kept: ${nutKept.toLocaleString()}`);
  console.log(`   Foods with nutrients: ${nutrientsByFdc.size.toLocaleString()}`);

  // ── Step 4: Build rows & insert in streaming fashion ──────────────────
  console.log("\n🔨 Step 4: Building and inserting rows...");

  let built = 0;
  let skippedNoCal = 0;
  let skippedNoNutrients = 0;
  let inserted = 0;
  let errors = 0;
  let batch = [];

  async function flushBatch() {
    if (batch.length === 0) return;
    const { error } = await supabase
      .from("nutrition_dataset")
      .upsert(batch, { onConflict: "dataset,source_id" });

    if (error) {
      console.error(`   ❌ Batch error: ${error.message}`);
      errors++;
    } else {
      inserted += batch.length;
    }
    batch = [];

    if (inserted % 50_000 === 0 && inserted > 0) {
      console.log(`   Progress: ${inserted.toLocaleString()} inserted`);
    }
  }

  for (const [fdcId, food] of foodById) {
    const nut = nutrientsByFdc.get(fdcId);
    if (!nut) { skippedNoNutrients++; continue; }

    // Resolve calories: prefer 1008 (idx 0), fallback to 2047 (idx 1), then 2048 (idx 2)
    let calories = nut[0]; // 1008
    if (isNaN(calories)) calories = nut[1]; // 2047
    if (isNaN(calories)) calories = nut[2]; // 2048
    if (isNaN(calories)) { skippedNoCal++; continue; }

    const name = food.desc.trim();
    const nameNormalized = name.toLowerCase().replace(/\s+/g, " ").trim();

    batch.push({
      dataset: "usda_branded",
      dataset_version: "2025-04-24",
      source_id: fdcId,
      name,
      name_normalized: nameNormalized,
      brand: food.brand || null,
      barcode: food.barcode || null,
      category: food.category || null,
      food_group: food.category || null,
      calories_per_100g: calories || 0,
      protein_per_100g: isNaN(nut[3]) ? 0 : nut[3],
      carbs_per_100g: isNaN(nut[4]) ? 0 : nut[4],
      fat_per_100g: isNaN(nut[5]) ? 0 : nut[5],
      fiber_per_100g: isNaN(nut[6]) ? null : nut[6],
      sugar_per_100g: isNaN(nut[7]) ? null : nut[7],
      sodium_per_100g: isNaN(nut[8]) ? null : nut[8],
      saturated_fat_per_100g: isNaN(nut[9]) ? null : nut[9],
      cholesterol_per_100g: isNaN(nut[10]) ? null : nut[10],
      potassium_per_100g: isNaN(nut[11]) ? null : nut[11],
      micronutrients: null,
      serving_size_g: food.servingGrams ?? null,
      serving_desc: food.householdServing ?? null,
      household_serving: food.householdServing ?? null,
      portions: food.servingGrams
        ? JSON.stringify([{ desc: food.householdServing || "serving", grams: food.servingGrams }])
        : null,
      data_quality: "standard",
    });

    built++;

    if (batch.length >= BATCH_SIZE) {
      await flushBatch();
    }
  }

  // Flush remaining
  await flushBatch();

  console.log(`\n✅ Branded import complete!`);
  console.log(`   Built:   ${built.toLocaleString()}`);
  console.log(`   Inserted: ${inserted.toLocaleString()}`);
  console.log(`   Skipped (no nutrients): ${skippedNoNutrients.toLocaleString()}`);
  console.log(`   Skipped (no calories): ${skippedNoCal.toLocaleString()}`);
  if (errors > 0) console.log(`   Failed batches: ${errors}`);

  // Free memory
  foodById.clear();
  nutrientsByFdc.clear();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
