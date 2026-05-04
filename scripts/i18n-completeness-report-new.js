#!/usr/bin/env node
/**
 * i18n Completeness Report
 *
 * Compares all locale files against the English reference and reports:
 * - Keys present in English but missing in other locales
 * - Overall completeness percentage per locale
 * - Highlights untranslated keys (values identical to English)
 *
 * Usage: node scripts/i18n-completeness-report.js
 */

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "../src/locales");
const REFERENCE_LOCALE = "en";
const SUPPORTED_LOCALES = ["de", "es", "fr", "nl", "pl", "pt", "pt-BR"];

/** Flatten nested object into dot-notation keys */
function flattenObject(obj, prefix = "") {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else if (typeof value === "string") {
      result[fullKey] = value;
    }
  }
  return result;
}

/** Load all JSON files from a locale directory */
function loadLocaleData(locale) {
  const localeDir = path.join(LOCALES_DIR, locale);
  if (!fs.existsSync(localeDir)) {
    return {};
  }
  const data = {};
  const files = fs.readdirSync(localeDir).filter((f) => f.endsWith(".json"));
  for (const file of files) {
    const namespace = file.replace(".json", "");
    const content = fs.readFileSync(path.join(localeDir, file), "utf-8");
    data[namespace] = JSON.parse(content);
  }
  return data;
}

/** Get all flattened keys with values from a locale */
function getAllKeys(localeData) {
  const result = {};
  for (const [namespace, data] of Object.entries(localeData)) {
    const flattened = flattenObject(data);
    for (const [key, value] of Object.entries(flattened)) {
      result[`${namespace}.${key}`] = value;
    }
  }
  return result;
}

/** Compare a locale against English reference */
function compareLocale(enKeys, localeKeys, locale) {
  const missing = [];
  const untranslated = [];
  let translated = 0;

  for (const [key, enValue] of Object.entries(enKeys)) {
    if (!(key in localeKeys)) {
      missing.push(key);
    } else if (localeKeys[key] === enValue && locale !== "en") {
      // Value is identical to English — might be untranslated
      // Skip keys that are likely intentionally the same (e.g., brand names, abbreviations)
      if (!enValue.match(/^[A-Z0-9._-]+$/) && enValue.length > 3) {
        untranslated.push(key);
      } else {
        translated++;
      }
    } else {
      translated++;
    }
  }

  return {
    missing,
    untranslated,
    translated,
    total: Object.keys(enKeys).length,
  };
}

function main() {
  console.log("\n📊 i18n Completeness Report\n");
  console.log("=".repeat(70));

  // Load English reference
  const enData = loadLocaleData(REFERENCE_LOCALE);
  const enKeys = getAllKeys(enData);
  const totalKeys = Object.keys(enKeys).length;

  console.log(`\n📚 Reference: English (${totalKeys} keys)\n`);

  // Analyze each locale
  const results = [];

  for (const locale of SUPPORTED_LOCALES) {
    const localeData = loadLocaleData(locale);
    const localeKeys = getAllKeys(localeData);
    const comparison = compareLocale(enKeys, localeKeys, locale);

    const completeness = (comparison.translated / comparison.total) * 100;

    results.push({
      locale,
      completeness,
      missing: comparison.missing.length,
      untranslated: comparison.untranslated.length,
    });

    console.log(`\n🌍 ${locale.toUpperCase()}`);
    console.log(`   Completeness: ${completeness.toFixed(1)}%`);
    console.log(`   Missing keys: ${comparison.missing.length}`);
    console.log(`   Potentially untranslated: ${comparison.untranslated.length}`);

    // Show first 5 missing keys if any
    if (comparison.missing.length > 0) {
      console.log(`   Sample missing:`);
      comparison.missing.slice(0, 5).forEach((k) => {
        console.log(`     - ${k}`);
      });
      if (comparison.missing.length > 5) {
        console.log(`     ... and ${comparison.missing.length - 5} more`);
      }
    }

    // Show first 5 untranslated keys if any
    if (comparison.untranslated.length > 0) {
      console.log(`   Sample untranslated (same as English):`);
      comparison.untranslated.slice(0, 5).forEach((k) => {
        console.log(`     - ${k}: "${enKeys[k].slice(0, 50)}..."`);
      });
    }
  }

  // Summary table
  console.log("\n" + "=".repeat(70));
  console.log("\n📈 SUMMARY\n");
  console.log(
    "Locale".padEnd(10) +
      "Completeness".padStart(15) +
      "Missing".padStart(12) +
      "Untranslated".padStart(14)
  );
  console.log("-".repeat(51));

  // Sort by completeness
  results.sort((a, b) => b.completeness - a.completeness);

  for (const r of results) {
    const bar =
      "█".repeat(Math.round(r.completeness / 5)) +
      "░".repeat(20 - Math.round(r.completeness / 5));
    console.log(
      r.locale.toUpperCase().padEnd(10) +
        `${r.completeness.toFixed(1)}%`.padStart(12) +
        String(r.missing).padStart(12) +
        String(r.untranslated).padStart(14)
    );
    console.log(" ".repeat(10) + bar);
  }

  // Overall health
  const avgCompleteness =
    results.reduce((sum, r) => sum + r.completeness, 0) / results.length;
  const totalMissing = results.reduce((sum, r) => sum + r.missing, 0);
  const totalUntranslated = results.reduce((sum, r) => sum + r.untranslated, 0);

  console.log("\n" + "=".repeat(70));
  console.log(`\n🎯 Average completeness: ${avgCompleteness.toFixed(1)}%`);
  console.log(`🔴 Total missing keys across all locales: ${totalMissing}`);
  console.log(`🟡 Total potentially untranslated: ${totalUntranslated}`);

  // Return exit code based on completeness
  if (avgCompleteness < 90) {
    console.log("\n⚠️  Warning: Average completeness is below 90%");
    process.exit(1);
  } else if (avgCompleteness < 100) {
    console.log("\n✅ Good: Above 90% completeness, but not perfect");
    process.exit(0);
  } else {
    console.log("\n🌟 Perfect: All locales are 100% complete!");
    process.exit(0);
  }
}

main();
