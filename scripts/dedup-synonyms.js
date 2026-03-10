#!/usr/bin/env node
/**
 * Dedup SYNONYMS entries in food-ontology.ts
 * Keeps first occurrence of each key, removes later duplicates.
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'features', 'nutrition', 'ontology', 'food-ontology.ts');
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the SYNONYMS object boundaries
let synStart = -1;
let synEnd = -1;
let braceDepth = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (synStart === -1 && /^const SYNONYMS.*=\s*\{/.test(line.trim())) {
    synStart = i;
    braceDepth = 1;
    continue;
  }
  if (synStart !== -1 && synEnd === -1) {
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      if (ch === '}') braceDepth--;
    }
    if (braceDepth === 0) {
      synEnd = i;
      break;
    }
  }
}

if (synStart === -1 || synEnd === -1) {
  console.error('Could not find SYNONYMS object boundaries');
  process.exit(1);
}

console.log(`SYNONYMS object: lines ${synStart + 1} to ${synEnd + 1}`);

// Parse synonym entries - each is a single line like:  "key": "value",  or  key: "value",
const seenKeys = new Set();
const linesToRemove = new Set();

for (let i = synStart + 1; i < synEnd; i++) {
  const line = lines[i].trim();
  
  // Skip comments and empty lines
  if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
  
  // Match synonym entry patterns:
  //   "key": "value",
  //   key: "value",
  let match = line.match(/^"([^"]+)"\s*:\s*"[^"]*"\s*,?\s*$/);
  if (!match) {
    match = line.match(/^(\w[\w\s]*\w|\w)\s*:\s*"[^"]*"\s*,?\s*$/);
  }
  
  if (match) {
    const key = match[1].trim();
    if (seenKeys.has(key)) {
      linesToRemove.add(i);
    } else {
      seenKeys.add(key);
    }
  }
}

console.log(`Unique synonym keys: ${seenKeys.size}`);
console.log(`Duplicate lines to remove: ${linesToRemove.size}`);

if (linesToRemove.size === 0) {
  console.log('No duplicates found!');
  process.exit(0);
}

// Build new content, removing duplicate lines
const newLines = lines.filter((_, i) => !linesToRemove.has(i));

// Clean up consecutive blank lines
const cleaned = [];
let prevBlank = false;
for (const line of newLines) {
  const isBlank = line.trim() === '';
  if (isBlank && prevBlank) continue;
  cleaned.push(line);
  prevBlank = isBlank;
}

fs.writeFileSync(filePath, cleaned.join('\n'));
console.log(`Done! Removed ${linesToRemove.size} duplicate synonym lines.`);
console.log(`File reduced from ${lines.length} to ${cleaned.length} lines.`);
