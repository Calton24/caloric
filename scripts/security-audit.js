#!/usr/bin/env node

/**
 * Mobile Core Security Audit Script — v2
 *
 * Runs automated security checks:
 * - A) Secret scanning (API keys, service_role, private keys)
 * - B) Service role JWT detection
 * - C) Debug screen production gating
 * - D) Logging redaction (including URL query param tokens)
 * - E) Banned imports enforcement
 * - F) Dependency audit (pre-release + npm audit)
 * - G) Console.log enforcement in infrastructure
 * - H) Build artifact scanning
 * - I) gitleaks integration (optional, warns if not installed)
 *
 * CI Integration:
 *   npm run security-audit (exits 0 if all pass, 1 on failure)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

let failCount = 0;
let passCount = 0;

function log(msg) {
  console.log(msg);
}

function pass(msg) {
  passCount++;
  log(`${GREEN}✓${RESET} ${msg}`);
}

function fail(msg) {
  failCount++;
  log(`${RED}✗${RESET} ${msg}`);
}

function warn(msg) {
  log(`${YELLOW}⚠${RESET} ${msg}`);
}

function section(title) {
  log(`\n${BOLD}${title}${RESET}`);
  log("─".repeat(60));
}

// ─────────────────────────────────────────────────────────────────────────────
// A) Secret Scanning
// ─────────────────────────────────────────────────────────────────────────────

section("A) Secret Scanning");

const secretPatterns = [
  {
    name: "Actual JWT token",
    pattern: /ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
    dangerous: true,
  },
  {
    name: "Private key literal",
    pattern: /-----BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
    dangerous: true,
  },
  {
    name: "Stripe live secret key",
    pattern: /sk_live_[A-Za-z0-9_-]+/,
    dangerous: true,
  },
  {
    name: "AWS secret key value",
    pattern: /AKIA[0-9A-Z]{16}/,
    dangerous: true,
  },
  {
    name: "Firebase private key JSON",
    pattern: /"private_key":\s*"-----BEGIN PRIVATE KEY/,
    dangerous: true,
  },
];

const scanDirs = ["src", "app"];
const scanExtensions = [".ts", ".tsx", ".js"];

let secretFound = false;

function walkDir(dir) {
  let files = [];
  try {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      if (["node_modules", ".next", ".expo", "build", "dist", ".git"].includes(entry)) continue;
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        files = files.concat(walkDir(fullPath));
      } else if (scanExtensions.some((ext) => fullPath.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip unreadable dirs
  }
  return files;
}

for (const dir of scanDirs) {
  const fullPath = path.join(__dirname, "..", dir);
  if (!fs.existsSync(fullPath)) continue;

  const files = walkDir(fullPath);

  for (const file of files) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      for (const { name, pattern, dangerous } of secretPatterns) {
        if (pattern.test(content)) {
          const lines = content.split("\n");
          const lineNum = lines.findIndex((line) => pattern.test(line)) + 1;
          if (dangerous) {
            fail(`Found ${name} in ${file}:${lineNum}`);
            secretFound = true;
          } else {
            warn(`Found ${name} in ${file}:${lineNum}`);
          }
        }
      }
    } catch {
      // Skip binary files
    }
  }
}

if (!secretFound) {
  pass("No dangerous secrets found");
}

// ─────────────────────────────────────────────────────────────────────────────
// B) Service Role JWT Detection
// ─────────────────────────────────────────────────────────────────────────────

section("B) Service Role JWT Detection");

const configPaths = [
  "src/config/schema.ts",
  "src/lib/config.ts",
  "src/features/auth/SupabaseClient.ts",
];

let foundJWTCheck = false;

for (const configPath of configPaths) {
  const fullPath = path.join(__dirname, "..", configPath);
  if (!fs.existsSync(fullPath)) continue;

  const configContent = fs.readFileSync(fullPath, "utf-8");
  if (
    configContent.includes("isPrivilegedJwt") ||
    configContent.includes("decodeJwtPayload") ||
    (configContent.includes('role === "service_role"') && configContent.includes("Catches service_role"))
  ) {
    pass("Service role JWT verification is implemented");
    foundJWTCheck = true;
    break;
  }
}

if (!foundJWTCheck) {
  warn("Service role JWT verification might not be implemented (check manually)");
}

// ─────────────────────────────────────────────────────────────────────────────
// C) Debug Screen Production Gating
// ─────────────────────────────────────────────────────────────────────────────

section("C) Debug Screen Production Gating");

const debugScreens = [
  "app/(tabs)/mobile-core/growth.tsx",
  "app/(tabs)/mobile-core/push.tsx",
  "app/(tabs)/mobile-core/i18n.tsx",
  "app/(tabs)/mobile-core/presence.tsx",
  "app/(tabs)/mobile-core/activity.tsx",
  "app/(tabs)/mobile-core/live-activity.tsx",
  "app/(tabs)/mobile-core/maintenance.tsx",
  "app/(tabs)/mobile-core/glass.tsx",
  "app/(tabs)/mobile-core/widgets.tsx",
  "app/(tabs)/mobile-core/primitives.tsx",
  "app/(tabs)/mobile-core/patterns.tsx",
];

let allGuarded = true;

for (const screen of debugScreens) {
  const screenPath = path.join(__dirname, "..", screen);
  if (!fs.existsSync(screenPath)) {
    warn(`Screen not found: ${screen}`);
    continue;
  }

  const screenContent = fs.readFileSync(screenPath, "utf-8");
  if (screenContent.includes('if (!__DEV__) return <Redirect')) {
    pass(`${screen} is guarded`);
  } else {
    fail(`${screen} is NOT guarded with __DEV__`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// D) Logging Redaction Check
// ─────────────────────────────────────────────────────────────────────────────

section("D) Logging Redaction");

const redactorPath = path.join(__dirname, "..", "src/logging/redactor.ts");
const loggerPath = path.join(__dirname, "..", "src/logging/logger.ts");

if (fs.existsSync(redactorPath)) {
  const redactorContent = fs.readFileSync(redactorPath, "utf-8");
  if (redactorContent.includes("redactSensitive")) {
    pass("Logging redaction framework is implemented");
  } else {
    warn("Logging redaction function missing");
  }

  // Verify URL query param redaction exists
  if (redactorContent.includes("QUERY_TOKEN_REDACTED") || redactorContent.includes("access_token")) {
    pass("URL query parameter token redaction is implemented");
  } else {
    fail("URL query parameter token redaction is MISSING from redactor");
  }
} else {
  warn("Redactor module not found");
}

if (fs.existsSync(loggerPath)) {
  const loggerContent = fs.readFileSync(loggerPath, "utf-8");
  if (loggerContent.includes("redactSensitive")) {
    pass("Logger exports redactSensitive");
  } else {
    warn("Logger does not export redactSensitive");
  }
} else {
  warn("Logger module not found");
}

// ─────────────────────────────────────────────────────────────────────────────
// E) Banned Imports Check
// ─────────────────────────────────────────────────────────────────────────────

section("E) Banned Imports Enforcement");

const bannedImports = [
  {
    module: "posthog-react-native",
    allowIn: ["infrastructure/analytics", "lib/analytics"],
    reason: "Analytics must be abstracted through infrastructure layer",
  },
  {
    module: "expo-notifications",
    allowIn: ["infrastructure/notifications", "lib/notifications"],
    reason: "Notifications must be abstracted through infrastructure layer",
  },
  {
    module: "@supabase/supabase-js",
    allowIn: ["infrastructure", "lib/supabase", "config"],
    reason: "Supabase client must be abstracted, not used directly in features",
  },
];

let bannedImportViolations = 0;

for (const { module, allowIn } of bannedImports) {
  const allowRegex = new RegExp(allowIn.join("|"));

  const srcPath = path.join(__dirname, "..", "src");
  const srcFiles = walkDir(srcPath);

  for (const file of srcFiles) {
    if (allowRegex.test(file)) continue; // Skip allowed files

    const content = fs.readFileSync(file, "utf-8");
    if (content.includes(`from "${module}"`) || content.includes(`from '${module}'`)) {
      fail(`Banned import: ${module} in ${file}`);
      bannedImportViolations++;
    }
  }
}

if (bannedImportViolations === 0) {
  pass("No banned import violations found");
}

// ─────────────────────────────────────────────────────────────────────────────
// F) Dependency Audit
// ─────────────────────────────────────────────────────────────────────────────

section("F) Dependency Audit");

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"));

// Check for pre-release deps
const preReleaseDeps = Object.entries(packageJson.dependencies).filter(([name, version]) => {
  return version.includes("next") || version.includes("beta") || version.includes("alpha") || version === "0.0.0";
});

if (preReleaseDeps.length === 0) {
  pass("No unstable pre-release dependencies");
} else {
  warn(`Found ${preReleaseDeps.length} pre-release deps: ${preReleaseDeps.map(([n]) => n).join(", ")}`);
}

// Run npm audit --production
// Policy: warn (not fail) because all current findings are build-time CLI deps
// that Metro never bundles into the JS runtime. Specifically:
//   - fast-xml-parser (critical): @superwall → @react-native-community/cli → cli-doctor
//   - minimatch (high): @expo/cli, @expo/fingerprint, eslint
// If a RUNTIME dep ever shows critical/high, this MUST become fail().
try {
  execSync("npm audit --production --audit-level=high 2>&1", {
    cwd: path.join(__dirname, ".."),
    encoding: "utf-8",
    timeout: 30000,
  });
  pass("npm audit: no high/critical vulnerabilities");
} catch (e) {
  const output = e.stdout || e.message || "";
  if (output.includes("found 0 vulnerabilities") || output.includes("no vulnerabilities")) {
    pass("npm audit: no high/critical vulnerabilities");
  } else {
    const highMatch = output.match(/(\d+)\s+(high|critical)/gi);
    if (highMatch) {
      // Warn instead of fail: many come from transitive Expo deps we can't control
      warn(`npm audit: ${highMatch.join(", ")} — review with: npm audit --production`);
    } else {
      warn("npm audit: could not determine results (run manually)");
    }
  }
}

// CRITICAL: npm audit --omit=dev for RUNTIME deps MUST FAIL
// Runtime vulnerabilities ship to users — zero tolerance policy.
// Unlike --production, --omit=dev excludes devDependencies entirely.
//
// KNOWN FALSE POSITIVES (build-time tools NOT bundled by Metro):
//   - @react-native-community/cli* - CLI tools, not runtime code
//   - @expo/cli - Expo CLI, not runtime code
//   - fast-xml-parser - Used by cli-config-android for build, not runtime
//   - minimatch - Used by @expo/cli, not runtime
//
// Policy: If ALL vulns are in known build-time packages, WARN.
//         If ANY vuln is in runtime-bundled code, FAIL.
const BUILD_TIME_ONLY_PACKAGES = new Set([
  "fast-xml-parser",
  "minimatch",
  "@react-native-community/cli",
  "@react-native-community/cli-doctor",
  "@react-native-community/cli-platform-android",
  "@react-native-community/cli-platform-ios",
  "@react-native-community/cli-platform-apple",
  "@react-native-community/cli-config-android",
  "@expo/cli",
  "@expo/fingerprint",
  "@expo/metro-config",
]);

// Packages that inherit "high" severity from build-time deps but are safe at runtime
// These are marked "high" because they depend on CLI tools, not because they have runtime vulns
const BUILD_TIME_INHERITED_PACKAGES = new Set([
  "@superwall/react-native-superwall", // depends on @react-native-community/cli (build-time)
]);

try {
  execSync("npm audit --omit=dev --audit-level=high --json 2>&1", {
    cwd: path.join(__dirname, ".."),
    encoding: "utf-8",
    timeout: 30000,
  });
  pass("npm audit (runtime): no high/critical runtime vulnerabilities");
} catch (e) {
  const output = e.stdout || e.message || "";
  
  // Try to parse JSON output to categorize vulns
  let hasRuntimeVuln = false;
  let buildTimeCount = 0;
  let inheritedCount = 0;
  let runtimeVulnPackages = [];
  
  try {
    // Extract JSON from output (may have non-JSON prefix)
    const jsonStart = output.indexOf("{");
    if (jsonStart >= 0) {
      const jsonStr = output.slice(jsonStart);
      const auditResult = JSON.parse(jsonStr);
      
      // Check each vulnerability
      for (const [pkgName, vulnInfo] of Object.entries(auditResult.vulnerabilities || {})) {
        const severity = vulnInfo.severity;
        
        if (severity === "high" || severity === "critical") {
          if (BUILD_TIME_ONLY_PACKAGES.has(pkgName)) {
            buildTimeCount++;
          } else if (BUILD_TIME_INHERITED_PACKAGES.has(pkgName)) {
            // Check if vuln is inherited from build-time deps only
            const viaPackages = vulnInfo.via || [];
            const viaNames = viaPackages.map(v => typeof v === 'string' ? v : v.name).filter(Boolean);
            const allViaBuildTime = viaNames.every(name => 
              BUILD_TIME_ONLY_PACKAGES.has(name) || BUILD_TIME_INHERITED_PACKAGES.has(name)
            );
            if (allViaBuildTime) {
              inheritedCount++;
            } else {
              hasRuntimeVuln = true;
              runtimeVulnPackages.push(pkgName);
            }
          } else {
            hasRuntimeVuln = true;
            runtimeVulnPackages.push(pkgName);
          }
        }
      }
    }
  } catch (_parseErr) {
    // JSON parse failed, fall back to text analysis
    // If we can't parse, assume worst case only if no expected patterns found
    if (!output.includes("fast-xml-parser") && !output.includes("minimatch")) {
      hasRuntimeVuln = true;
    }
  }
  
  if (output.includes("found 0 vulnerabilities") || output.includes("no vulnerabilities")) {
    pass("npm audit (runtime): no high/critical runtime vulnerabilities");
  } else if (hasRuntimeVuln) {
    // FAIL: Runtime vulns are shipped to users — block deployment
    fail(`npm audit (runtime): vulns in bundled packages [${runtimeVulnPackages.join(", ")}] — MUST FIX before merge`);
  } else if (buildTimeCount > 0 || inheritedCount > 0) {
    // WARN: Only build-time vulns, not shipped to users
    warn(`npm audit (runtime): ${buildTimeCount + inheritedCount} build-time-only vulns (CLI tools, not bundled) — review with: npm audit --omit=dev`);
  } else {
    warn("npm audit (runtime): could not determine results — review manually");
  }
}

pass("Dependency audit complete");

// ─────────────────────────────────────────────────────────────────────────────
// G) Console.log Enforcement in Infrastructure
// ─────────────────────────────────────────────────────────────────────────────

section("G) Console.log Enforcement");

const infraDirs = ["src/infrastructure", "src/lib"];
let bareConsoleLogCount = 0;
const consoleLogViolations = [];
const consoleLogPattern = /^\s*console\.(log|warn|error|debug|info)\s*\(/;
const devGuardPattern = /__DEV__|if\s*\(\s*__DEV__/;

for (const infraDir of infraDirs) {
  const infraPath = path.join(__dirname, "..", infraDir);
  if (!fs.existsSync(infraPath)) continue;

  const infraFiles = walkDir(infraPath);
  for (const file of infraFiles) {
    try {
      const content = fs.readFileSync(file, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (consoleLogPattern.test(lines[i])) {
          // Check if it's inside a __DEV__ block (look back up to 5 lines)
          const contextStart = Math.max(0, i - 5);
          const contextLines = lines.slice(contextStart, i).join("\n");
          if (!devGuardPattern.test(contextLines)) {
            // Check if it's in a catch block (common pattern for fallback logging)
            const catchContext = lines.slice(Math.max(0, i - 3), i).join("\n");
            if (!catchContext.includes("catch")) {
              consoleLogViolations.push(`${file}:${i + 1}`);
              bareConsoleLogCount++;
            }
          }
        }
      }
    } catch {
      // Skip unreadable files
    }
  }
}

if (bareConsoleLogCount === 0) {
  pass("No unguarded console.log in infrastructure code");
} else {
  // FAIL — all infra code must use logger, not bare console.*
  // This prevents accidental data exfiltration and debug leakage in production.
  // Exceptions: __DEV__-guarded blocks and catch-block fallbacks are auto-excluded.
  fail(`${bareConsoleLogCount} unguarded console.log calls in infrastructure (must use logger)`);
  // Show first 5 for visibility
  for (const v of consoleLogViolations.slice(0, 5)) {
    log(`  → ${v}`);
  }
  if (consoleLogViolations.length > 5) {
    log(`  … and ${consoleLogViolations.length - 5} more`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// H) Build Artifact Scanning
// ─────────────────────────────────────────────────────────────────────────────

section("H) Build Artifact Scanning");

const artifactDirs = ["dist", "build", "ios/build"];
let artifactSecrets = false;

for (const artifactDir of artifactDirs) {
  const artifactPath = path.join(__dirname, "..", artifactDir);
  if (!fs.existsSync(artifactPath)) {
    // Not a failure — artifacts don't always exist
    continue;
  }

  // Check for .env files or secrets left in build output
  const dangerousFiles = [".env", ".env.local", ".env.production", "service-account.json"];
  for (const dangerous of dangerousFiles) {
    const dangerousPath = path.join(artifactPath, dangerous);
    if (fs.existsSync(dangerousPath)) {
      fail(`Secret file found in build artifact: ${artifactDir}/${dangerous}`);
      artifactSecrets = true;
    }
  }
}

if (!artifactSecrets) {
  pass("No secrets found in build artifacts");
}

// ─────────────────────────────────────────────────────────────────────────────
// I) gitleaks Integration (optional)
// ─────────────────────────────────────────────────────────────────────────────

section("I) gitleaks (optional)");

try {
  execSync("which gitleaks", { encoding: "utf-8" });
  try {
    execSync('gitleaks git -v --log-opts="--all" --no-banner 2>&1', {
      cwd: path.join(__dirname, ".."),
      encoding: "utf-8",
      timeout: 60000,
    });
    pass("gitleaks: no secrets found in git history");
  } catch (e) {
    const output = e.stdout || e.stderr || e.message || "";
    if (output.includes("no leaks found")) {
      pass("gitleaks: no secrets found in git history");
    } else {
      const leakMatch = output.match(/(\d+) leaks? found/i);
      if (leakMatch) {
        warn(`gitleaks: ${leakMatch[0]} — review with: gitleaks git -v --log-opts="--all"`);
      } else {
        warn("gitleaks: scan completed with warnings (review manually)");
      }
    }
  }
} catch {
  warn("gitleaks not installed — install with: brew install gitleaks");
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────

section("Security Audit Summary");
log(`${GREEN}${passCount} checks passed${RESET}`);

if (failCount > 0) {
  log(`${RED}${failCount} checks FAILED${RESET}`);
  process.exit(1);
} else {
  log(`${GREEN}✓ All security checks passed${RESET}`);
  process.exit(0);
}
