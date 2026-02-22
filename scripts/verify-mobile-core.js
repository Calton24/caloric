#!/usr/bin/env node

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = process.cwd();

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".expo",
  ".turbo",
  "coverage",
  "dist",
  "build",
  "ios/build",
  "ios/Pods",
  "android/build",
  "android/app/build",
]);

const CODE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

const ALLOWED_POSTHOG_IMPORTS = new Set([
  path.join("src", "infrastructure", "analytics", "PostHogAnalyticsClient.ts"),
]);

const files = [];

function shouldSkipDir(relativePath) {
  if (!relativePath) return false;
  if (SKIP_DIRS.has(relativePath)) return true;

  return Array.from(SKIP_DIRS).some((dir) => relativePath.startsWith(dir + path.sep));
}

function walk(dir, relativeDir = "") {
  if (shouldSkipDir(relativeDir)) return;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath, relPath);
      continue;
    }

    const ext = path.extname(entry.name);
    if (!CODE_EXTENSIONS.has(ext)) continue;

    files.push({ fullPath, relPath });
  }
}

function runCommand(cmd, args, label) {
  console.log(`\n[verify] ${label}`);
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function scanFiles() {
  const violations = [];

  const posthogImportRegex =
    /from\s+["']posthog-react-native["']|require\(["']posthog-react-native["']\)/;
  const forbiddenEnvRegex = /process\.env\.(POSTHOG_API_KEY|POSTHOG_HOST)/;

  let analyticsBootLogFound = false;
  let growthBootLogFound = false;

  for (const file of files) {
    const content = fs.readFileSync(file.fullPath, "utf8");

    if (posthogImportRegex.test(content)) {
      if (!ALLOWED_POSTHOG_IMPORTS.has(file.relPath)) {
        violations.push(
          `Illegal PostHog import in ${file.relPath} (must live in infrastructure only)`
        );
      }
    }

    if (forbiddenEnvRegex.test(content)) {
      violations.push(
        `Forbidden env var access in ${file.relPath} (use EXPO_PUBLIC_*)`
      );
    }

    if (file.relPath === path.join("src", "infrastructure", "analytics", "factory.ts")) {
      if (/\[Analytics\]\s+mode=/.test(content)) {
        analyticsBootLogFound = true;
      }
    }

    if (file.relPath === path.join("src", "infrastructure", "growth", "factory.ts")) {
      if (/\[Growth\]\s+mode=/.test(content)) {
        growthBootLogFound = true;
      }
    }
  }

  if (!analyticsBootLogFound) {
    violations.push("Missing boot mode log in analytics factory");
  }

  if (!growthBootLogFound) {
    violations.push("Missing boot mode log in growth factory");
  }

  if (violations.length > 0) {
    console.error("\n[verify] FAIL\n");
    for (const msg of violations) {
      console.error(`- ${msg}`);
    }
    process.exit(1);
  }

  console.log("\n[verify] Static checks passed");
}

function main() {
  runCommand("npx", ["tsc", "--noEmit"], "typecheck");
  runCommand("npm", ["test"], "unit tests");

  walk(ROOT);
  scanFiles();

  console.log("\n[verify] All checks passed");
}

main();
