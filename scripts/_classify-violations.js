#!/usr/bin/env node
// Temporary script to classify i18n violations into buckets.
// Reads /tmp/eslint-i18n.json produced by ESLint --format json
const fs = require("fs");

const input = fs.readFileSync("/tmp/eslint-i18n.json", "utf8");
const j = JSON.parse(input);
const files = j.filter((f) =>
  f.messages.some((m) => m.ruleId === "i18n/no-hardcoded-strings")
);

const buckets = {};
function addToBucket(name, path, count) {
  if (!buckets[name]) buckets[name] = { files: [], count: 0 };
  buckets[name].files.push({ path, count });
  buckets[name].count += count;
}

files.forEach((f) => {
  const n = f.messages.filter(
    (m) => m.ruleId === "i18n/no-hardcoded-strings"
  ).length;
  const p = f.filePath.replace(process.cwd() + "/", "");
  let bucket = "other";
  if (
    p.includes("caloric/glass") ||
    p.includes("caloric/primitives") ||
    p.includes("caloric/patterns") ||
    p.includes("caloric/widgets") ||
    p.includes("playground")
  )
    bucket = "playground/design-system";
  else if (p.includes("/dev/") || p.includes("Debug")) bucket = "dev-panels";
  else if (p.includes("onboarding")) bucket = "onboarding";
  else if (p.includes("auth") || p.includes("Auth")) bucket = "auth";
  else if (p.includes("settings") || p.includes("Settings")) bucket = "settings";
  else if (
    p.includes("tracking") ||
    p.includes("camera") ||
    p.includes("confirm-meal") ||
    p.includes("EditMeal") ||
    p.includes("meal") ||
    p.includes("Meal")
  )
    bucket = "tracking/meals";
  else if (p.includes("modal") || p.includes("Modal") || p.includes("Sheet") || p.includes("sheet") || p.includes("Dialog") || p.includes("Consent"))
    bucket = "modals/sheets";
  else if (p.includes("growth") || p.includes("FeatureRequest") || p.includes("share"))
    bucket = "growth";
  else if (p.includes("progress") || p.includes("weight") || p.includes("streak") || p.includes("Streak"))
    bucket = "progress";
  else if (p.includes("(tabs)") || p.includes("home") || p.includes("index.tsx"))
    bucket = "home/tabs";
  else if (p.includes("primitives") || p.includes("components") || p.includes("ui/"))
    bucket = "ui-primitives";
  else if (p.includes("_layout") || p.includes("layout"))
    bucket = "navigation/layout";

  addToBucket(bucket, p, n);
});

let total = 0;
Object.entries(buckets)
  .sort((a, b) => b[1].count - a[1].count)
  .forEach(([name, b]) => {
    if (b.count === 0) return;
    console.log(`\n=== ${name.toUpperCase()} (${b.count}) ===`);
    b.files
      .sort((a, b) => b.count - a.count)
      .forEach((f) => console.log(`  ${f.count}  ${f.path}`));
    total += b.count;
  });
console.log(`\nTOTAL: ${total}`);
