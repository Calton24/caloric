#!/usr/bin/env node
/**
 * generate-i18n-types.js — Generate TypeScript types from English locale files
 *
 * Reads all English namespace files and generates a type definition
 * that makes `t()` calls type-safe. Keys like `t("auth.signIn")` get autocomplete.
 *
 * Usage:
 *   node scripts/generate-i18n-types.js
 *
 * Output:
 *   src/infrastructure/i18n/types.generated.ts
 */

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "..", "src", "locales", "en");
const OUTPUT = path.join(__dirname, "..", "src", "infrastructure", "i18n", "types.generated.ts");

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
  "coaching.json",
];

/** Recursively collect all dot-separated key paths */
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

/** Extract {{param}} names from a string value */
function extractParams(str) {
  if (typeof str !== "string") return [];
  const matches = str.match(/\{\{(\w+)\}\}/g) || [];
  return [...new Set(matches.map((m) => m.replace(/[{}]/g, "")))];
}

/** Get nested value */
function getNestedValue(obj, keyPath) {
  return keyPath.split(".").reduce((acc, k) => acc?.[k], obj);
}

function main() {
  // Merge all English files
  const merged = {};
  for (const file of NAMESPACE_FILES) {
    const filePath = path.join(LOCALES_DIR, file);
    const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    Object.assign(merged, data);
  }

  const allKeys = collectKeys(merged);

  // Partition: keys with params vs keys without
  const simpleKeys = [];
  const paramKeys = []; // { key, params: string[] }

  for (const key of allKeys) {
    const value = getNestedValue(merged, key);
    const params = extractParams(value);
    if (params.length > 0) {
      paramKeys.push({ key, params });
    } else {
      simpleKeys.push(key);
    }
  }

  // Generate the file
  const lines = [
    "/**",
    " * AUTO-GENERATED — do not edit manually.",
    " * Run: node scripts/generate-i18n-types.js",
    " *",
    ` * Generated from ${NAMESPACE_FILES.length} English locale files.`,
    ` * Total keys: ${allKeys.length} (${simpleKeys.length} simple, ${paramKeys.length} with interpolation)`,
    " */",
    "",
    "/** All valid translation keys (no interpolation params) */",
    "export type SimpleTranslationKey =",
  ];

  for (const key of simpleKeys) {
    lines.push(`  | "${key}"`);
  }
  lines.push("  ;");
  lines.push("");

  // Generate param key types with their required params
  lines.push("/** Translation keys that require interpolation params */");
  lines.push("export type ParamTranslationKey =");
  for (const { key } of paramKeys) {
    lines.push(`  | "${key}"`);
  }
  lines.push("  ;");
  lines.push("");

  // Union type
  lines.push("/** All valid translation keys */");
  lines.push("export type TranslationKey = SimpleTranslationKey | ParamTranslationKey;");
  lines.push("");

  // Params map
  lines.push("/** Maps parameterised keys to their required interpolation params */");
  lines.push("export interface TranslationParams {");
  for (const { key, params } of paramKeys) {
    const paramType = params.map((p) => `${p}: string | number`).join("; ");
    lines.push(`  "${key}": { ${paramType} };`);
  }
  lines.push("}");
  lines.push("");

  fs.writeFileSync(OUTPUT, lines.join("\n") + "\n", "utf-8");
  console.log(`Generated ${OUTPUT}`);
  console.log(`  ${allKeys.length} total keys (${simpleKeys.length} simple, ${paramKeys.length} parameterised)`);
}

main();
