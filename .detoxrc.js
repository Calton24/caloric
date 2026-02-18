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
        "xcodebuild -workspace ios/mobilecore.xcworkspace -scheme mobilecore -configuration Debug -sdk iphonesimulator -arch x86_64 -derivedDataPath ios/build",
      binaryPath:
        "ios/build/Build/Products/Debug-iphonesimulator/mobilecore.app",
    },
    "ios.release": {
      type: "ios.app",
      build:
        "xcodebuild -workspace ios/mobilecore.xcworkspace -scheme mobilecore -configuration Release -sdk iphonesimulator -arch x86_64 -derivedDataPath ios/build",
      binaryPath:
        "ios/build/Build/Products/Release-iphonesimulator/mobilecore.app",
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
