#!/usr/bin/env node
/**
 * i18n Namespace Report
 * 
 * Shows completeness broken down by namespace and locale.
 * Usage: node scripts/i18n-namespace-report.js
 */

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "../src/locales");
const REFERENCE_LOCALE = "en";
const SUPPORTED_LOCALES = ["de", "es", "fr", "nl", "pl", "pt", "pt-BR"];

function flattenObject(obj, prefix) {
  prefix = prefix || "";
  const result = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const fullKey = prefix ? prefix + "." + key : key;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, fullKey));
    } else if (typeof value === "string") {
      result[fullKey] = value;
    }
  }
  return result;
}

function loadLocaleDataByNamespace(locale) {
  const localeDir = path.join(LOCALES_DIR, locale);
  if (!fs.existsSync(localeDir)) return {};
  const data = {};
  const files = fs.readdirSync(localeDir).filter(function(f) { return f.endsWith(".json"); });
  for (const file of files) {
    const namespace = file.replace(".json", "");
    if (namespace.includes(".backup")) continue;
    const content = fs.readFileSync(path.join(localeDir, file), "utf-8");
    data[namespace] = flattenObject(JSON.parse(content));
  }
  return data;
}

function compareNamespace(enKeys, localeKeys, locale) {
  const missing = [];
  const untranslated = [];
  let translated = 0;
  for (const key of Object.keys(enKeys)) {
    const enValue = enKeys[key];
    if (!(key in localeKeys)) {
      missing.push(key);
    } else if (localeKeys[key] === enValue && locale !== "en") {
      if (!/^[A-Z0-9._-]+$/.test(enValue) && enValue.length > 3) {
        untranslated.push(key);
      } else {
        translated++;
      }
    } else {
      translated++;
    }
  }
  return { missing: missing, untranslated: untranslated, translated: translated, total: Object.keys(enKeys).length };
}

const enData = loadLocaleDataByNamespace(REFERENCE_LOCALE);
const namespaces = Object.keys(enData).sort();

const namespaceStats = {};
for (const ns of namespaces) {
  namespaceStats[ns] = { enKeys: Object.keys(enData[ns]).length, locales: {} };
  for (const locale of SUPPORTED_LOCALES) {
    const localeData = loadLocaleDataByNamespace(locale);
    const localeNsKeys = localeData[ns] || {};
    const comparison = compareNamespace(enData[ns], localeNsKeys, locale);
    namespaceStats[ns].locales[locale] = {
      completeness: comparison.total > 0 ? (comparison.translated / comparison.total) * 100 : 100,
      missing: comparison.missing.length,
      untranslated: comparison.untranslated.length,
      missingKeys: comparison.missing,
      untranslatedKeys: comparison.untranslated,
    };
  }
}

console.log("\n📊 i18n Completeness Report — BY NAMESPACE\n");
console.log("==========================================================================================");

for (const ns of namespaces) {
  const stats = namespaceStats[ns];
  console.log("\n📁 " + ns.toUpperCase() + " (" + stats.enKeys + " keys)");
  console.log("----------------------------------------------------------------------");
  console.log("Locale".padEnd(8) + "Complete".padStart(10) + "Missing".padStart(10) + "Untranslated".padStart(14) + "  Status");
  
  const sortedLocales = SUPPORTED_LOCALES.slice().sort(function(a, b) {
    return stats.locales[b].completeness - stats.locales[a].completeness;
  });
  
  for (const locale of sortedLocales) {
    const ls = stats.locales[locale];
    const pct = ls.completeness.toFixed(0) + "%";
    let status = "🔴";
    if (ls.completeness === 100) status = "✅";
    else if (ls.completeness >= 90) status = "🟡";
    else if (ls.completeness >= 70) status = "🟠";
    console.log(locale.toUpperCase().padEnd(8) + pct.padStart(10) + String(ls.missing).padStart(10) + String(ls.untranslated).padStart(14) + "  " + status);
  }
  
  const worstLocale = sortedLocales[sortedLocales.length - 1];
  const worst = stats.locales[worstLocale];
  if (worst.missing > 0) {
    console.log("\n   Sample missing (" + worstLocale + "):");
    worst.missingKeys.slice(0, 3).forEach(function(k) { console.log("     - " + k); });
    if (worst.missing > 3) console.log("     ... and " + (worst.missing - 3) + " more");
  }
}

console.log("\n==========================================================================================");
console.log("\n📈 NAMESPACE PRIORITY RANKING (by average completeness)\n");
console.log("Namespace".padEnd(15) + "Keys".padStart(6) + "Avg %".padStart(8) + "Worst".padStart(8) + "  Priority");
console.log("--------------------------------------------------");

const ranked = namespaces.map(function(ns) {
  const stats = namespaceStats[ns];
  const completions = Object.values(stats.locales).map(function(l) { return l.completeness; });
  const avg = completions.reduce(function(a, b) { return a + b; }, 0) / completions.length;
  const worst = Math.min.apply(null, completions);
  return { ns: ns, keys: stats.enKeys, avg: avg, worst: worst };
}).sort(function(a, b) { return a.avg - b.avg; });

for (const r of ranked) {
  let priority = "✅ OK";
  if (r.avg < 50) priority = "🔴 CRITICAL";
  else if (r.avg < 70) priority = "🟠 HIGH";
  else if (r.avg < 90) priority = "🟡 MEDIUM";
  console.log(r.ns.padEnd(15) + String(r.keys).padStart(6) + (r.avg.toFixed(0) + "%").padStart(8) + (r.worst.toFixed(0) + "%").padStart(8) + "  " + priority);
}

console.log("\n==========================================================================================");
console.log("\n🟡 UNTRANSLATED KEYS (identical to English) — TOP NAMESPACES\n");

const untranslatedByNs = namespaces.map(function(ns) {
  const total = Object.values(namespaceStats[ns].locales).reduce(function(sum, l) { return sum + l.untranslated; }, 0);
  return { ns: ns, total: total };
}).filter(function(x) { return x.total > 0; }).sort(function(a, b) { return b.total - a.total; });

for (const item of untranslatedByNs.slice(0, 10)) {
  console.log("  " + item.ns.padEnd(15) + item.total + " keys across all locales");
  const sample = namespaceStats[item.ns].locales[SUPPORTED_LOCALES[0]];
  if (sample.untranslatedKeys.length > 0) {
    sample.untranslatedKeys.slice(0, 2).forEach(function(k) {
      const val = enData[item.ns][k];
      const preview = val ? val.slice(0, 40) : "";
      console.log("       - " + k + ": \"" + preview + "...\"");
    });
  }
}
console.log("");
