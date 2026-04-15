const fs = require('fs');
const content = fs.readFileSync('src/features/nutrition/ontology/food-ontology.ts', 'utf8');
const lines = content.split('\n');
const keyRegex = /^\s*["']?([^"':]+)["']?\s*:\s*\{/;
const seen = {};
const dupes = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(keyRegex);
  if (m) {
    const key = m[1].trim().replace(/["']/g, '');
    if (key.length > 1 && key.length < 50 && key.indexOf('//') === -1 && key.indexOf('*') === -1) {
      if (seen[key]) {
        dupes.push({ key, firstLine: seen[key], dupeLine: i+1 });
      } else {
        seen[key] = i+1;
      }
    }
  }
}
dupes.forEach(d => console.log(d.key + ' | first:' + d.firstLine + ' | dupe:' + d.dupeLine));
console.log('Total duplicates:', dupes.length);
