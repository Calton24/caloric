const fs = require('fs');
const filePath = 'src/features/nutrition/ontology/food-ontology.ts';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

// Find the FOOD_ONTOLOGY object boundaries
// Match entries like:  "key": {  or  key: {
const entryStartRegex = /^(\s*)(["']?)([^"':\/\*\n]+)\2\s*:\s*\{/;

// Track which keys we've seen
const seenKeys = new Set();
const linesToRemove = new Set();

// First pass: find all entry starts and their block ends
let i = 0;
while (i < lines.length) {
  const m = lines[i].match(entryStartRegex);
  if (m) {
    const key = m[3].trim();
    // Only process actual food entry keys (not inner objects like 'category', 'nutrients', etc.)
    const indent = m[1];
    if (indent.length === 2 && key.length > 1 && key.length < 60) {
      if (seenKeys.has(key)) {
        // This is a duplicate! Find the end of this entry block
        let braceDepth = 0;
        let j = i;
        let foundOpen = false;
        while (j < lines.length) {
          for (const ch of lines[j]) {
            if (ch === '{') { braceDepth++; foundOpen = true; }
            if (ch === '}') braceDepth--;
          }
          linesToRemove.add(j);
          if (foundOpen && braceDepth === 0) break;
          j++;
        }
        i = j + 1;
        continue;
      } else {
        seenKeys.add(key);
      }
    }
  }
  i++;
}

console.log('Lines to remove:', linesToRemove.size);
console.log('Unique keys found:', seenKeys.size);

// Build output without removed lines
const outputLines = lines.filter((_, idx) => !linesToRemove.has(idx));

// Clean up any double blank lines left behind
let cleaned = outputLines.join('\n');
cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

fs.writeFileSync(filePath, cleaned, 'utf8');
console.log('Done! Removed duplicate entries.');
