/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: "jest",
      config: "e2e/jest.config.js",
    },
    jest: {
      setupTimeout: 120000,
    },
  },
  apps: {
    "ios.debug": {
      type: "ios.app",
      build:
        "xcodebuild -workspace ios/MobileCoreDev.xcworkspace -scheme MobileCoreDev -configuration Debug -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' -derivedDataPath ios/build clean build",
      binaryPath:
        "ios/build/Build/Products/Debug-iphonesimulator/MobileCoreDev.app",
    },
    "ios.release": {
      type: "ios.app",
      build:
        "xcodebuild -workspace ios/MobileCoreDev.xcworkspace -scheme MobileCoreDev -configuration Release -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 15 Pro,OS=17.5' -derivedDataPath ios/build clean build",
      binaryPath:
        "ios/build/Build/Products/Release-iphonesimulator/MobileCoreDev.app",
    },
  },
  devices: {
    simulator: {
      type: "ios.simulator",
      device: {
        type: "iPhone 15 Pro",
      },
    },
  },
  configurations: {
    "ios.debug": {
      device: "simulator",
      app: "ios.debug",
    },
    "ios.release": {
      device: "simulator",
      app: "ios.release",
    },
  },
};
