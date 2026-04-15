#!/usr/bin/env node
/**
 * Quick diagnostic: why only 135 Foundation foods imported?
 */
const fs = require("fs");
const readline = require("readline");

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

const csvDir = process.argv[2] || "/Users/calton/Documents/Downloads /FoodData_Central_csv_2025-04-24";

async function main() {
  // Step 1: Collect all Foundation fdc_ids and names
  const foundationIds = new Set();
  const foundationNames = new Map();
  await streamCSV(csvDir + "/food.csv", (fields, headers) => {
    const dataType = fields[headers.indexOf("data_type")];
    if (dataType === "foundation_food") {
      const id = fields[headers.indexOf("fdc_id")];
      foundationIds.add(id);
      foundationNames.set(id, fields[headers.indexOf("description")]);
    }
  });
  console.log("Foundation foods in food.csv:", foundationIds.size);

  // Step 2: Single pass through food_nutrient.csv — check all energy variants
  const has1008 = new Set();
  const has2047 = new Set();
  const has2048 = new Set();

  await streamCSV(csvDir + "/food_nutrient.csv", (fields, headers) => {
    const fdcId = fields[headers.indexOf("fdc_id")];
    if (!foundationIds.has(fdcId)) return;
    
    const nid = parseInt(fields[headers.indexOf("nutrient_id")], 10);
    const amount = parseFloat(fields[headers.indexOf("amount")]);
    if (isNaN(amount)) return;
    
    if (nid === 1008) has1008.add(fdcId);
    if (nid === 2047) has2047.add(fdcId);
    if (nid === 2048) has2048.add(fdcId);
  });

  console.log("\nFoundation foods with nutrient 1008 (Energy, kcal):", has1008.size);
  console.log("Foundation foods with nutrient 2047 (Energy, Atwater General):", has2047.size);
  console.log("Foundation foods with nutrient 2048 (Energy, Atwater Specific):", has2048.size);
  
  const allWithEnergy = new Set([...has1008, ...has2047, ...has2048]);
  console.log("Foundation foods with ANY energy:", allWithEnergy.size);
  console.log("Foundation foods missing ALL energy:", foundationIds.size - allWithEnergy.size);

  // Show missing ones
  const missing1008 = [...foundationIds].filter(id => !has1008.has(id));
  const has2047not1008 = missing1008.filter(id => has2047.has(id) || has2048.has(id));
  console.log("\nMissing 1008 but have 2047/2048:", has2047not1008.length);
  console.log("Sample:", has2047not1008.slice(0, 5).map(id => `${id}: ${foundationNames.get(id)}`));

  const trulyMissing = missing1008.filter(id => !has2047.has(id) && !has2048.has(id));
  console.log("\nTruly missing all energy:", trulyMissing.length);
  console.log("Sample:", trulyMissing.slice(0, 5).map(id => `${id}: ${foundationNames.get(id)}`));

  // Step 3: Check nutrient.csv for energy-related entries
  console.log("\nEnergy-related nutrient IDs in nutrient.csv:");
  await streamCSV(csvDir + "/nutrient.csv", (fields, headers) => {
    const name = fields[headers.indexOf("name")].toLowerCase();
    const id = fields[headers.indexOf("id")];
    if (name.includes("energy") || name.includes("calori") || name.includes("atwater")) {
      console.log("  ID:", id, "Name:", fields[headers.indexOf("name")], "Unit:", fields[headers.indexOf("unit_name")]);
    }
  });
}

main().catch(console.error);
