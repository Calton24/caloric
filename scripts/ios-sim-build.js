// scripts/ios-sim-build.js
const { execSync } = require("child_process");

const udid = process.env.SIMULATOR_UDID || process.env.DETOX_DEVICE_UDID;
if (!udid) {
  console.error("❌ Missing SIMULATOR_UDID (or DETOX_DEVICE_UDID).");
  process.exit(1);
}

const workspace = process.env.IOS_WORKSPACE || "ios/Caloric.xcworkspace";
const scheme = process.env.IOS_SCHEME || "Caloric";
const configuration = process.env.IOS_CONFIGURATION || "Debug";
const derivedData = process.env.IOS_DERIVED_DATA || "ios/build";

const cmd = [
  "xcodebuild",
  `-workspace "${workspace}"`,
  `-scheme "${scheme}"`,
  `-configuration "${configuration}"`,
  `-sdk iphonesimulator`,
  `-destination "id=${udid}"`,
  `-derivedDataPath "${derivedData}"`,
  "clean build",
].join(" ");

console.log(`📦 Building iOS app for simulator UDID: ${udid}`);
execSync(cmd, { stdio: "inherit" });
