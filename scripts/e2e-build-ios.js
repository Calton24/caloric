// scripts/e2e-build-ios.js
const { spawnSync } = require("node:child_process");

const udid = process.env.DETOX_DEVICE_UDID;
if (!udid) {
  console.error("Missing DETOX_DEVICE_UDID (CI must export selected simulator UDID).");
  process.exit(1);
}

const args = [
  "-workspace", "ios/MobileCoreDev.xcworkspace",
  "-scheme", "MobileCoreDev",
  "-configuration", "Debug",
  "-sdk", "iphonesimulator",
  "-destination", `id=${udid}`,
  "-derivedDataPath", "ios/build",
  "clean", "build",
];

const res = spawnSync("xcodebuild", args, { stdio: "inherit" });
process.exit(res.status ?? 1);
