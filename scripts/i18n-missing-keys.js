#!/usr/bin/env node
/**
 * Extract missing keys for priority namespaces
 */

const fs = require("fs");
const path = require("path");

const LOCALES_DIR = path.join(__dirname, "../src/locales");
const REFERENCE_LOCALE = "en";
const SUPPORTED_LOCALES = ["de", "es", "fr", "nl", "pl", "pt", "pt-BR"];
const TARGET_NS = ["home", "onboarding", "settings"];

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

function loadNamespace(locale, ns) {
  const filePath = path.join(LOCALES_DIR, locale, ns + ".json");
  if (!fs.existsSync(filePath)) return {};
  return flattenObject(JSON.parse(fs.readFileSync(filePath, "utf-8")));
}

for (const ns of TARGET_NS) {
  const enKeys = loadNamespace(REFERENCE_LOCALE, ns);
  const enKeyList = Object.keys(enKeys);
  
  const missingByLocale = {};
  for (const locale of SUPPORTED_LOCALES) {
    missingByLocale[locale] = [];
    const localeKeys = loadNamespace(locale, ns);
    for (const key of enKeyList) {
      if (!(key in localeKeys)) {
        missingByLocale[locale].push(key);
      }
    }
  }
  
  // Find keys missing from all locales
  const missingFromAll = [];
  for (const key of enKeyList) {
    let missingFromAllLocales = true;
    for (const locale of SUPPORTED_LOCALES) {
      if (!missingByLocale[locale].includes(key)) {
        missingFromAllLocales = false;
        break;
      }
    }
    if (missingFromAllLocales) {
      missingFromAll.push(key);
    }
  }
  
  console.log("");
  console.log("=".repeat(80));
  console.log("📁 " + ns.toUpperCase() + " — MISSING KEYS (" + missingFromAll.length + " keys missing from all locales)");
  console.log("=".repeat(80));
  console.log("");
  
  for (const key of missingFromAll) {
    const enValue = enKeys[key];
    const preview = enValue.length > 70 ? enValue.slice(0, 70) + "..." : enValue;
    console.log("  " + key);
    console.log("    EN: \"" + preview + "\"");
    console.log("");
  }
}
