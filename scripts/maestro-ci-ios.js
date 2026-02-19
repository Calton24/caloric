// scripts/maestro-ci-ios.js
const { execSync, spawn } = require("child_process");

const udid = process.env.SIMULATOR_UDID || process.env.DETOX_DEVICE_UDID;
if (!udid) {
  console.error("❌ Missing SIMULATOR_UDID (or DETOX_DEVICE_UDID).");
  process.exit(1);
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

console.log(`📱 Booting simulator ${udid}`);
run(`xcrun simctl boot "${udid}" || true`);
run(`xcrun simctl bootstatus "${udid}" -b`);

console.log("🧠 Starting Metro (dev-client)...");
const metro = spawn("npx", ["expo", "start", "--dev-client", "--port", "8081"], {
  stdio: "inherit",
  env: { ...process.env, RCT_METRO_PORT: "8081" },
});

function cleanup(code) {
  try {
    console.log("🧹 Stopping Metro...");
    metro.kill("SIGINT");
  } catch {}
  process.exit(code ?? 0);
}

process.on("SIGINT", () => cleanup(130));
process.on("SIGTERM", () => cleanup(143));

try {
  // give Metro a moment
  run(`node -e "setTimeout(()=>process.exit(0), 5000)"`);

  console.log("🏗️ Building iOS...");
  run(`npm run ios:sim:build`);

  console.log("📲 Installing iOS app...");
  run(`npm run ios:sim:install`);

  console.log("🧪 Running Maestro...");
  run(`maestro test maestro/flows`);

  console.log("✅ Maestro passed.");
  cleanup(0);
} catch (e) {
  console.error("❌ Maestro CI failed.");
  cleanup(1);
}
