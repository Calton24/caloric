#!/usr/bin/env node
/**
 * Dumps all keys that are identical to English across ALL locales
 * for specified namespaces.
 * 
 * Usage: node scripts/i18n-untranslated-dump.js [namespace1] [namespace2] ...
 * Default: home onboarding settings
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '../src/locales');
const args = process.argv.slice(2);
const namespaces = args.length > 0 ? args : ['home', 'onboarding', 'settings'];
const locales = ['de', 'es', 'fr', 'nl', 'pl', 'pt', 'pt-BR'];

function flattenObject(obj, prefix = '') {
  const result = {};
  for (const k of Object.keys(obj)) {
    const pre = prefix ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(result, flattenObject(obj[k], pre + k));
    } else {
      result[pre + k] = obj[k];
    }
  }
  return result;
}

for (const ns of namespaces) {
  const enPath = path.join(localesDir, 'en', ns + '.json');
  if (!fs.existsSync(enPath)) {
    console.log(`Namespace ${ns} not found`);
    continue;
  }
  
  const enData = flattenObject(JSON.parse(fs.readFileSync(enPath, 'utf8')));
  
  // Collect keys that are identical in ALL locales
  const identicalInAll = [];
  
  for (const key of Object.keys(enData)) {
    let identicalCount = 0;
    
    for (const locale of locales) {
      const localePath = path.join(localesDir, locale, ns + '.json');
      if (!fs.existsSync(localePath)) continue;
      
      const localeData = flattenObject(JSON.parse(fs.readFileSync(localePath, 'utf8')));
      if (localeData[key] === enData[key]) {
        identicalCount++;
      }
    }
    
    if (identicalCount === locales.length) {
      identicalInAll.push({ key, value: enData[key] });
    }
  }
  
  console.log('================================================================================');
  console.log(`📁 ${ns.toUpperCase()} — UNTRANSLATED KEYS (identical to English in ALL 7 locales)`);
  console.log('================================================================================');
  console.log(`Total: ${identicalInAll.length} keys\n`);
  
  for (const { key, value } of identicalInAll) {
    const strVal = String(value);
    const truncated = strVal.substring(0, 70).replace(/\n/g, '\\n');
    const suffix = strVal.length > 70 ? '...' : '';
    console.log(`  ${key}: "${truncated}${suffix}"`);
  }
  console.log('');
}
