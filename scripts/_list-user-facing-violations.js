#!/usr/bin/env node
// Lists all user-facing i18n violations (excludes dev/playground)
const { execSync } = require("child_process");

const devPaths = [
  "caloric/glass",
  "caloric/primitives",
  "caloric/patterns",
  "caloric/widgets",
  "caloric/growth",
  "caloric/activity",
  "caloric/i18n.tsx",
  "caloric/live-activity",
  "caloric/maintenance",
  "caloric/presence",
  "caloric/push",
  "src/ui/dev/",
];

const raw = execSync(
  "npx eslint 'app/**/*.{tsx,ts}' 'src/ui/**/*.{tsx,ts}' --format json 2>/dev/null",
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 }
);

const j = JSON.parse(raw);
const cwd = process.cwd();

const violations = [];
j.filter((f) => f.messages.some((m) => m.ruleId === "i18n/no-hardcoded-strings"))
  .filter((f) => !devPaths.some((p) => f.filePath.includes(p)))
  .forEach((f) => {
    const msgs = f.messages.filter(
      (m) => m.ruleId === "i18n/no-hardcoded-strings"
    );
    const rel = f.filePath.replace(cwd + "/", "");
    msgs.forEach((m) => {
      const text = (m.message.match(/"([^"]+)"/) || [])[1] || "";
      violations.push({ file: rel, line: m.line, col: m.column, text });
    });
  });

// Group by file
const byFile = {};
violations.forEach((v) => {
  if (!byFile[v.file]) byFile[v.file] = [];
  byFile[v.file].push(v);
});

let total = 0;
for (const [file, vs] of Object.entries(byFile).sort()) {
  console.log(`\n=== ${file} (${vs.length}) ===`);
  vs.forEach((v) => console.log(`  L${v.line}:${v.col}  "${v.text}"`));
  total += vs.length;
}
console.log(`\nTOTAL user-facing violations: ${total}`);
