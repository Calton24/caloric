// scripts/ios-sim-install.js
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const udid = process.env.SIMULATOR_UDID || process.env.DETOX_DEVICE_UDID;
if (!udid) {
  console.error("❌ Missing SIMULATOR_UDID (or DETOX_DEVICE_UDID).");
  process.exit(1);
}

const derivedData = process.env.IOS_DERIVED_DATA || "ios/build";

// common output location:
const productsDir = path.join(
  derivedData,
  "Build/Products/Debug-iphonesimulator"
);

if (!fs.existsSync(productsDir)) {
  console.error(`❌ Build products dir not found: ${productsDir}`);
  process.exit(1);
}

// pick first .app
const app = fs
  .readdirSync(productsDir)
  .find((f) => f.endsWith(".app"));

if (!app) {
  console.error(`❌ No .app found in: ${productsDir}`);
  process.exit(1);
}

const appPath = path.join(productsDir, app);

console.log(`📲 Installing ${appPath} -> ${udid}`);
execSync(`xcrun simctl install "${udid}" "${appPath}"`, { stdio: "inherit" });

console.log(`✅ Installed: ${app}`);
