#!/usr/bin/env node
// Reports per-locale count of values identical to English (likely untranslated fallbacks).
// Usage: node scripts/_fallback-audit.js [--verbose]

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "src", "locales");
const CANONICAL = "en";
const verbose = process.argv.includes("--verbose");

// Discover languages
const langs = fs
  .readdirSync(LOCALES_DIR)
  .filter((d) => d !== CANONICAL && fs.statSync(path.join(LOCALES_DIR, d)).isDirectory());

// Discover namespace files from canonical
const nsFiles = fs
  .readdirSync(path.join(LOCALES_DIR, CANONICAL))
  .filter((f) => f.endsWith(".json"));

function collectLeaves(obj, prefix) {
  const leaves = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "object" && v !== null && !Array.isArray(v)) {
      leaves.push(...collectLeaves(v, key));
    } else if (typeof v === "string") {
      leaves.push({ key, value: v });
    }
  }
  return leaves;
}

function getVal(obj, keyPath) {
  return keyPath.split(".").reduce((o, p) => o?.[p], obj);
}

// Short strings that are legitimately identical across languages
function isLegitimatelyIdentical(value) {
  // Very short strings (units, abbreviations)
  if (value.length <= 3) return true;
  // Numbers only
  if (/^\d+$/.test(value.trim())) return true;
  // Pure interpolation tokens
  if (/^(\{\{\w+\}\}\s*)+$/.test(value.trim())) return true;
  // Brand names
  if (/^(Caloric|CalCut|Apple Health)$/i.test(value.trim())) return true;
  // URLs
  if (/^https?:\/\//.test(value.trim())) return true;
  // Emoji-only
  if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F\u200D\s]+$/u.test(value.trim())) return true;
  return false;
}

console.log("╔══════════════════════════════════════════════════╗");
console.log("║     TRANSLATION COMPLETENESS AUDIT              ║");
console.log("╚══════════════════════════════════════════════════╝\n");

const summary = {};
const details = {};

for (const lang of langs.sort()) {
  summary[lang] = { total: 0, identical: 0, legitimatelyIdentical: 0, likelyUntranslated: 0 };
  details[lang] = [];

  for (const nsFile of nsFiles) {
    const enPath = path.join(LOCALES_DIR, CANONICAL, nsFile);
    const targetPath = path.join(LOCALES_DIR, lang, nsFile);

    if (!fs.existsSync(enPath) || !fs.existsSync(targetPath)) continue;

    const enData = JSON.parse(fs.readFileSync(enPath, "utf8"));
    const targetData = JSON.parse(fs.readFileSync(targetPath, "utf8"));
    const enLeaves = collectLeaves(enData, "");

    for (const { key, value: enVal } of enLeaves) {
      const targetVal = getVal(targetData, key);
      if (typeof targetVal !== "string") continue;

      summary[lang].total++;

      if (targetVal === enVal) {
        summary[lang].identical++;
        if (isLegitimatelyIdentical(enVal)) {
          summary[lang].legitimatelyIdentical++;
        } else {
          summary[lang].likelyUntranslated++;
          details[lang].push({ ns: nsFile.replace(".json", ""), key, value: enVal.slice(0, 60) });
        }
      }
    }
  }
}

// Summary table
console.log("Language  | Total | Identical | Legit | Untranslated | % Translated");
console.log("----------|-------|-----------|-------|--------------|-------------");
for (const lang of langs.sort()) {
  const s = summary[lang];
  const translated = s.total - s.likelyUntranslated;
  const pct = s.total > 0 ? ((translated / s.total) * 100).toFixed(1) : "N/A";
  console.log(
    `${lang.padEnd(9)} | ${String(s.total).padStart(5)} | ${String(s.identical).padStart(9)} | ${String(s.legitimatelyIdentical).padStart(5)} | ${String(s.likelyUntranslated).padStart(12)} | ${pct}%`
  );
}

// Verbose per-locale details
if (verbose) {
  console.log("\n\n── LIKELY UNTRANSLATED STRINGS ──────────────────\n");
  for (const lang of langs.sort()) {
    if (details[lang].length === 0) continue;
    console.log(`\n[${lang}] ${details[lang].length} likely untranslated:`);
    for (const { ns, key, value } of details[lang].slice(0, 20)) {
      console.log(`  ${ns}/${key}: "${value}"`);
    }
    if (details[lang].length > 20) {
      console.log(`  ... and ${details[lang].length - 20} more`);
    }
  }
}

console.log("\n(Run with --verbose to see individual untranslated keys)");
