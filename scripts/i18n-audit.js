#!/usr/bin/env node
/**
 * i18n-audit.js — Find and categorize all hardcoded strings in the app.
 *
 * Produces a grouped, actionable report of all user-facing strings
 * that are not yet using t(). Helps prioritize translation work.
 *
 * Usage:
 *   node scripts/i18n-audit.js             # Full report
 *   node scripts/i18n-audit.js --summary   # Count by file only
 *   node scripts/i18n-audit.js --json      # Machine-readable output
 *
 * Categories:
 *   ALERT    — Alert.alert() calls with hardcoded strings
 *   JSX      — Text content in JSX elements
 *   PROP     — Props like title=, placeholder=, label=
 *   TEMPLATE — Template literals in JSX
 */

const { execSync } = require("child_process");

const args = process.argv.slice(2);
const summaryOnly = args.includes("--summary");
const jsonOutput = args.includes("--json");

// Run ESLint and capture structured output
const cmd = 'npx eslint -f json "app/**/*.{tsx,ts}" "src/ui/**/*.{tsx,ts}" 2>/dev/null || true';
const raw = execSync(cmd, { encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 });

let results;
try {
  results = JSON.parse(raw);
} catch {
  console.error("Failed to parse ESLint JSON output");
  process.exit(1);
}

// Extract i18n violations
const violations = [];
for (const file of results) {
  if (!file.messages || file.messages.length === 0) continue;
  const i18nMessages = file.messages.filter(
    (m) => m.ruleId === "i18n/no-hardcoded-strings"
  );
  for (const msg of i18nMessages) {
    const relPath = file.filePath.replace(process.cwd() + "/", "");
    violations.push({
      file: relPath,
      line: msg.line,
      column: msg.column,
      text: msg.message.match(/"([^"]+)"/)?.[1] || "unknown",
      severity: msg.severity,
    });
  }
}

if (jsonOutput) {
  console.log(JSON.stringify(violations, null, 2));
  process.exit(0);
}

// Group by file
const byFile = {};
for (const v of violations) {
  if (!byFile[v.file]) byFile[v.file] = [];
  byFile[v.file].push(v);
}

// Categorize by directory
const categories = {
  "app/(onboarding)/": { label: "Onboarding", count: 0 },
  "app/(modals)/": { label: "Modals", count: 0 },
  "app/(tabs)/": { label: "Tabs", count: 0 },
  "app/(main)/": { label: "Main screens", count: 0 },
  "app/auth/": { label: "Auth", count: 0 },
  "app/onboarding/": { label: "Onboarding (legacy)", count: 0 },
  "app/tracking/": { label: "Tracking", count: 0 },
  "src/ui/": { label: "UI Components", count: 0 },
  other: { label: "Other", count: 0 },
};

for (const v of violations) {
  let matched = false;
  for (const [prefix, cat] of Object.entries(categories)) {
    if (prefix !== "other" && v.file.startsWith(prefix)) {
      cat.count++;
      matched = true;
      break;
    }
  }
  if (!matched) categories.other.count++;
}

// Print report
console.log("");
console.log("╔══════════════════════════════════════════════════════╗");
console.log("║           HARDCODED STRING AUDIT REPORT             ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log("");
console.log(`Total violations: ${violations.length}`);
console.log(`Files affected: ${Object.keys(byFile).length}`);
console.log("");

// Category breakdown
console.log("── By Area ─────────────────────────────────────────");
for (const [, cat] of Object.entries(categories)) {
  if (cat.count > 0) {
    const bar = "█".repeat(Math.ceil(cat.count / 5));
    console.log(`  ${cat.label.padEnd(22)} ${String(cat.count).padStart(4)}  ${bar}`);
  }
}
console.log("");

if (summaryOnly) {
  // File-level summary
  console.log("── By File ─────────────────────────────────────────");
  const sorted = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length);
  for (const [file, items] of sorted) {
    console.log(`  ${String(items.length).padStart(3)} │ ${file}`);
  }
} else {
  // Detailed per-file report
  const sorted = Object.entries(byFile).sort((a, b) => b[1].length - a[1].length);
  for (const [file, items] of sorted) {
    console.log(`── ${file} (${items.length}) ──`);
    for (const item of items.slice(0, 20)) {
      console.log(`  L${String(item.line).padStart(4)}: "${item.text}"`);
    }
    if (items.length > 20) {
      console.log(`  ... and ${items.length - 20} more`);
    }
    console.log("");
  }
}

// Priority recommendations
console.log("── Priority Fix Order ───────────────────────────────");
console.log("  1. Alert.alert() calls — use useLocalizedAlert/useConfirmDialog");
console.log("  2. Screen titles/headers — use Header with titleKey");
console.log("  3. EmptyState — use titleKey/subtitleKey props");
console.log("  4. Button labels — use t() from useAppTranslation");
console.log("  5. Placeholders — use t() for TextInput placeholder");
console.log("  6. Inline JSX text — wrap in t() or use LocalizedText");
console.log("");

process.exit(0);
