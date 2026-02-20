// scripts/maestro-ci-ios.js
const { execSync, spawn } = require("child_process");
const http = require("http");
const fs = require("fs");
const path = require("path");

// ===== Configuration =====
const udid = process.env.SIMULATOR_UDID;
const skipBuild = process.env.SKIP_BUILD === "1";
const metroPort = 8081;

// ===== Run ID & Logging =====
const RUN_ID = new Date().toISOString().replace(/[:.]/g, "-");
const LOG_DIR = path.join(process.cwd(), "ci-logs");
fs.mkdirSync(LOG_DIR, { recursive: true });
const LOG_FILE = path.join(LOG_DIR, `maestro-ci-ios-${RUN_ID}.log`);

function log(line) {
  const msg = `${line}\n`;
  process.stdout.write(msg);
  fs.appendFileSync(LOG_FILE, msg);
}

// ===== Validation =====
if (!udid) {
  log("❌ Missing SIMULATOR_UDID environment variable.");
  log("Usage: SIMULATOR_UDID=<uuid> npm run maestro:ci:ios:fast");
  process.exit(1);
}

log(`📋 Run ID: ${RUN_ID}`);
log(`📝 Log file: ${LOG_FILE}`);
log(`📱 Simulator UDID: ${udid}`);
log(`⚡ Mode: ${skipBuild ? "FAST (skip build)" : "FULL (build + test)"}`);

// ===== Helper Functions =====
function run(cmd, options = {}) {
  execSync(cmd, { stdio: "inherit", ...options });
}

function killPort(port) {
  try {
    execSync(`lsof -ti tcp:${port} | xargs kill -9`, { stdio: "ignore" });
    log(`🧹 Killed anything on port ${port}`);
  } catch {
    log(`ℹ️  Nothing running on port ${port}`);
  }
}

function waitForMetro(port = 8081, timeoutMs = 60000) {
  const url = `http://127.0.0.1:${port}/status`;
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const check = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= timeoutMs) {
        reject(new Error(`Metro not ready after ${timeoutMs}ms (${url})`));
        return;
      }

      http.get(url, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          if (data.includes("packager-status:running")) {
            log(`✅ Metro ready at ${url} (took ${elapsed}ms)`);
            resolve();
          } else {
            if (elapsed % 5000 < 1000) {
              log(`⏳ Metro not ready yet (${elapsed}ms elapsed)...`);
            }
            setTimeout(check, 1000);
          }
        });
      }).on("error", (err) => {
        if (elapsed < timeoutMs - 1000) {
          setTimeout(check, 1000);
        } else {
          reject(new Error(`Metro unreachable: ${err.message}`));
        }
      });
    };
    check();
  });
}

// ===== Main Execution =====
let metro;

function cleanup(code) {
  try {
    if (metro) {
      log("🧹 Stopping Metro...");
      metro.kill("SIGINT");
    }
  } catch {}
  
  if (code === 0) {
    log("CI_RESULT=PASS");
  } else {
    log("CI_RESULT=FAIL");
  }
  
  process.exit(code ?? 0);
}

process.on("SIGINT", () => cleanup(130));
process.on("SIGTERM", () => cleanup(143));

(async () => {
  try {
    // 1. Boot simulator
    log(`📱 Booting simulator ${udid}...`);
    run(`xcrun simctl boot "${udid}" || true`);
    run(`xcrun simctl bootstatus "${udid}" -b`);

    // 2. Kill any existing Metro on port 8081
    killPort(metroPort);

    // 3. Start Metro
    log("🧠 Starting Metro (dev-client)...");
    metro = spawn("npx", ["expo", "start", "--dev-client", "--port", String(metroPort)], {
      stdio: "inherit",
      env: {
        ...process.env,
        RCT_METRO_PORT: String(metroPort),
        REACT_NATIVE_PACKAGER_HOSTNAME: "127.0.0.1",
      },
    });

    // 4. Wait for Metro to be ready
    log("⏳ Waiting for Metro to be ready...");
    await waitForMetro(metroPort, 60000);

    // 6. Build iOS (if not skipped)
    if (skipBuild) {
      log("⏭️  Skipping build (SKIP_BUILD=1)");
    } else {
      log("🏗️  Building iOS...");
      const buildLog = path.join(LOG_DIR, `build-${RUN_ID}.log`);
      try {
        // Capture build output to file
        execSync(`npm run ios:sim:build > "${buildLog}" 2>&1`);
        log("✅ Build succeeded");
      } catch (err) {
        log("❌ Build failed - saving last 200 lines to log");
        try {
          const buildOutput = execSync(`tail -200 "${buildLog}" 2>/dev/null || echo "No build log found"`).toString();
          fs.appendFileSync(LOG_FILE, `\n=== BUILD FAILURE (last 200 lines) ===\n${buildOutput}\n`);
        } catch {}
        throw new Error("iOS build failed");
      }
    }

    // 7. Install app
    log("📲 Installing iOS app...");
    run(`npm run ios:sim:install`);

    // 8. Run Maestro
    log("🧪 Running Maestro...");
    run(`maestro test maestro/flows`);

    log("✅ Maestro passed.");
    cleanup(0);
  } catch (e) {
    log(`❌ Maestro CI failed: ${e.message}`);
    cleanup(1);
  }
})();
