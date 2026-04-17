#!/usr/bin/env node
/**
 * validate-locales.js — CI-ready locale validation
 *
 * Checks all locale files against English (canonical source of truth):
 *   1. Missing keys — keys in en but not in target locale
 *   2. Extra keys — keys in target but not in en
 *   3. Interpolation parity — {{param}} tokens must match across locales
 *   4. Empty values — translated strings that are empty
 *   5. Placeholder leakage — untranslated English strings in non-en locales
 *
 * Usage:
 *   node scripts/validate-locales.js          # All checks, exit 1 on error
 *   node scripts/validate-locales.js --fix    # Auto-add missing keys from en
 *   node scripts/validate-locales.js --report # Print summary report
 *
 * Exit codes:
 *   0 — all locales valid
 *   1 — validation errors found
 */

const fs = require("fs");
const path = require("path");

// ── Config ──────────────────────────────────────────────────────────

const LOCALES_DIR = path.join(__dirname, "..", "src", "locales");

const CANONICAL_LANG = "en";

const TARGET_LANGS = ["de", "es", "fr", "nl", "pl", "pt", "pt-BR"];

const NAMESPACE_FILES = [
  "common.json",
  "auth.json",
  "onboarding.json",
  "home.json",
  "settings.json",
  "tracking.json",
  "progress.json",
  "permissions.json",
  "goals.json",
  "guide.json",
];

// ── Helpers ──────────────────────────────────────────────────────────

/** Recursively collect all key paths from a nested object */
function collectKeys(obj, prefix = "") {
  const keys = [];
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      keys.push(...collectKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

/** Get value at a dot-separated key path */
function getNestedValue(obj, keyPath) {
  return keyPath.split(".").reduce((acc, part) => acc?.[part], obj);
}

/** Extract {{param}} tokens from a string */
function extractTokens(str) {
  if (typeof str !== "string") return [];
  const matches = str.match(/\{\{(\w+)\}\}/g) || [];
  return matches.sort();
}

/** Extract <tag>...</tag> rich text component names */
function extractRichTextTags(str) {
  if (typeof str !== "string") return [];
  const matches = str.match(/<(\w+)>/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[<>]/g, "")))].sort();
}

/** Load a JSON file, return null if missing */
function loadJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// ── Validation ──────────────────────────────────────────────────────

class LocaleValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.stats = { checked: 0, errors: 0, warnings: 0 };
  }

  error(lang, file, message) {
    this.errors.push({ lang, file, message });
    this.stats.errors++;
  }

  warn(lang, file, message) {
    this.warnings.push({ lang, file, message });
    this.stats.warnings++;
  }

  validate() {
    for (const nsFile of NAMESPACE_FILES) {
      const enPath = path.join(LOCALES_DIR, CANONICAL_LANG, nsFile);
      const enData = loadJSON(enPath);

      if (!enData) {
        this.error(CANONICAL_LANG, nsFile, `Canonical file missing: ${enPath}`);
        continue;
      }

      const enKeys = collectKeys(enData);
      this.stats.checked += enKeys.length;

      for (const lang of TARGET_LANGS) {
        const targetPath = path.join(LOCALES_DIR, lang, nsFile);
        const targetData = loadJSON(targetPath);

        if (!targetData) {
          this.error(lang, nsFile, `File missing: ${targetPath}`);
          continue;
        }

        const targetKeys = collectKeys(targetData);
        const enKeySet = new Set(enKeys);
        const targetKeySet = new Set(targetKeys);

        // 1. Missing keys
        for (const key of enKeys) {
          if (!targetKeySet.has(key)) {
            this.error(lang, nsFile, `Missing key: "${key}"`);
          }
        }

        // 2. Extra keys (not in English)
        for (const key of targetKeys) {
          if (!enKeySet.has(key)) {
            this.warn(lang, nsFile, `Extra key (not in en): "${key}"`);
          }
        }

        // 3. Interpolation token parity
        for (const key of enKeys) {
          if (!targetKeySet.has(key)) continue;

          const enValue = getNestedValue(enData, key);
          const targetValue = getNestedValue(targetData, key);

          const enTokens = extractTokens(enValue);
          const targetTokens = extractTokens(targetValue);

          if (JSON.stringify(enTokens) !== JSON.stringify(targetTokens)) {
            this.error(
              lang,
              nsFile,
              `Interpolation mismatch on "${key}": en has ${JSON.stringify(enTokens)}, ${lang} has ${JSON.stringify(targetTokens)}`
            );
          }
        }

        // 4. Empty values
        for (const key of targetKeys) {
          const val = getNestedValue(targetData, key);
          if (typeof val === "string" && val.trim() === "") {
            this.error(lang, nsFile, `Empty value: "${key}"`);
          }
        }

        // 5. Placeholder leakage — untranslated English strings in non-en locales
        // Only flag strings that are 3+ "real" words (skip abbreviations, units, brand names)
        for (const key of enKeys) {
          if (!targetKeySet.has(key)) continue;
          const enVal = getNestedValue(enData, key);
          const targetVal = getNestedValue(targetData, key);
          if (typeof enVal !== "string" || typeof targetVal !== "string") continue;
          // Skip short strings (abbreviations, units like "kg", "cal")
          const wordCount = enVal.split(/\s+/).filter((w) => w.length > 1).length;
          if (wordCount < 3) continue;
          // Skip strings that are mostly interpolation tokens
          const stripped = enVal.replace(/\{\{\w+\}\}/g, "").trim();
          if (stripped.length < 10) continue;
          // If the target value is identical to English, it's probably untranslated
          if (targetVal === enVal) {
            this.warn(lang, nsFile, `Possibly untranslated (identical to en): "${key}"`);
          }
        }

        // 6. Rich text tag parity — <bold>, <link> etc. must match across locales
        for (const key of enKeys) {
          if (!targetKeySet.has(key)) continue;
          const enVal = getNestedValue(enData, key);
          const targetVal = getNestedValue(targetData, key);
          const enTags = extractRichTextTags(enVal);
          const targetTags = extractRichTextTags(targetVal);
          if (enTags.length > 0 && JSON.stringify(enTags) !== JSON.stringify(targetTags)) {
            this.error(
              lang,
              nsFile,
              `Rich text tag mismatch on "${key}": en has <${enTags.join(", ")}>, ${lang} has <${targetTags.join(", ")}>`
            );
          }
        }

        // 7. Polish plural form completeness
        // Polish requires _one, _few, _many, _other forms for plural keys
        if (lang === "pl") {
          for (const key of enKeys) {
            if (!key.endsWith("_other") && !key.endsWith("_plural")) continue;
            const base = key.replace(/_(other|plural)$/, "");
            const requiredSuffixes = ["_one", "_few", "_many", "_other"];
            for (const suffix of requiredSuffixes) {
              const pluralKey = base + suffix;
              if (!targetKeySet.has(pluralKey)) {
                this.warn(
                  lang,
                  nsFile,
                  `Polish plural form missing: "${pluralKey}" (Polish requires _one, _few, _many, _other)`
                );
              }
            }
          }
        }
      }
    }
  }

  /** Auto-fix: copy missing keys from en to target locales */
  fix() {
    let fixed = 0;

    for (const nsFile of NAMESPACE_FILES) {
      const enPath = path.join(LOCALES_DIR, CANONICAL_LANG, nsFile);
      const enData = loadJSON(enPath);
      if (!enData) continue;

      const enKeys = collectKeys(enData);

      for (const lang of TARGET_LANGS) {
        const targetPath = path.join(LOCALES_DIR, lang, nsFile);
        let targetData = loadJSON(targetPath);

        if (!targetData) {
          // Create the file with English content
          fs.writeFileSync(targetPath, JSON.stringify(enData, null, 2) + "\n", "utf-8");
          console.log(`  Created ${lang}/${nsFile} from English`);
          fixed++;
          continue;
        }

        const targetKeys = new Set(collectKeys(targetData));
        let changed = false;

        for (const keyPath of enKeys) {
          if (!targetKeys.has(keyPath)) {
            // Add missing key with English value (placeholder)
            setNestedValue(targetData, keyPath, getNestedValue(enData, keyPath));
            changed = true;
            fixed++;
            console.log(`  Added ${lang}/${nsFile} → "${keyPath}" (English fallback)`);
          }
        }

        if (changed) {
          fs.writeFileSync(targetPath, JSON.stringify(targetData, null, 2) + "\n", "utf-8");
        }
      }
    }

    console.log(`\nFixed ${fixed} missing keys (using English as fallback).`);
  }

  report() {
    console.log("\n╔══════════════════════════════════════════════════╗");
    console.log("║         LOCALE VALIDATION REPORT                ║");
    console.log("╚══════════════════════════════════════════════════╝\n");

    console.log(`Languages: ${TARGET_LANGS.length} targets + ${CANONICAL_LANG} (canonical)`);
    console.log(`Namespace files: ${NAMESPACE_FILES.length}`);
    console.log(`Keys checked: ${this.stats.checked}`);
    console.log(`Errors: ${this.stats.errors}`);
    console.log(`Warnings: ${this.stats.warnings}\n`);

    if (this.errors.length > 0) {
      console.log("── ERRORS ──────────────────────────────────────\n");
      for (const { lang, file, message } of this.errors) {
        console.log(`  ✗ [${lang}/${file}] ${message}`);
      }
      console.log();
    }

    if (this.warnings.length > 0) {
      console.log("── WARNINGS ────────────────────────────────────\n");
      for (const { lang, file, message } of this.warnings) {
        console.log(`  ⚠ [${lang}/${file}] ${message}`);
      }
      console.log();
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log("  ✓ All locales are valid.\n");
    }
  }
}

/** Set a value at a dot-separated key path, creating intermediate objects */
function setNestedValue(obj, keyPath, value) {
  const parts = keyPath.split(".");
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== "object") {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }
  current[parts[parts.length - 1]] = value;
}

// ── Main ────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const doFix = args.includes("--fix");
const doReport = args.includes("--report") || args.length === 0;
const doCompleteness = args.includes("--completeness");

const validator = new LocaleValidator();
validator.validate();

if (doFix) {
  validator.fix();
  // Re-validate after fix
  const recheck = new LocaleValidator();
  recheck.validate();
  recheck.report();
  process.exit(recheck.stats.errors > 0 ? 1 : 0);
} else {
  if (doReport) validator.report();
  if (doCompleteness) printCompletenessReport();
  process.exit(validator.stats.errors > 0 ? 1 : 0);
}

/** Print translation completeness summary (fallback-to-English detection) */
function printCompletenessReport() {
  console.log("\n── TRANSLATION COMPLETENESS ─────────────────────\n");
  console.log("Language  | Total | Untranslated | % Translated");
  console.log("----------|-------|--------------|-------------");

  for (const lang of TARGET_LANGS.sort()) {
    let total = 0;
    let untranslated = 0;

    for (const nsFile of NAMESPACE_FILES) {
      const enPath = path.join(LOCALES_DIR, CANONICAL_LANG, nsFile);
      const targetPath = path.join(LOCALES_DIR, lang, nsFile);
      const enData = loadJSON(enPath);
      const targetData = loadJSON(targetPath);
      if (!enData || !targetData) continue;

      const enLeaves = collectKeys(enData);
      for (const key of enLeaves) {
        const enVal = getNestedValue(enData, key);
        const targetVal = getNestedValue(targetData, key);
        if (typeof enVal !== "string" || typeof targetVal !== "string") continue;
        total++;
        // Skip short strings that are often identical across languages
        if (enVal.length <= 3) continue;
        if (/^(\{\{\w+\}\}\s*)+$/.test(enVal.trim())) continue;
        if (targetVal === enVal) untranslated++;
      }
    }

    const pct = total > 0 ? (((total - untranslated) / total) * 100).toFixed(1) : "N/A";
    console.log(
      `${lang.padEnd(9)} | ${String(total).padStart(5)} | ${String(untranslated).padStart(12)} | ${pct}%`
    );
  }
  console.log();
}
