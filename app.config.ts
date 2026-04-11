/**
 * Expo App Configuration
 * Dynamically generated from active app profile
 */

import { ConfigContext, ExpoConfig } from "expo/config";

// Import config loader
// Note: This runs at build time, so env vars must be set during prebuild/build
const getConfig = (): any => {
  // During build time, we need to load config differently
  // Use process.env directly since Constants.expoConfig isn't available yet
  const appProfile =
    process.env.EXPO_PUBLIC_APP_PROFILE || process.env.APP_PROFILE || "caloric";
  const appEnv =
    process.env.EXPO_PUBLIC_APP_ENV || process.env.APP_ENV || "dev";

  // Import profiles (plain JS file for Node.js compatibility at build time)
  // eslint-disable-next-line
  const { APP_PROFILES } = require("./src/config/app-profiles.js");
  const profileConfig = APP_PROFILES[appProfile];

  if (!profileConfig) {
    throw new Error(
      `❌ Unknown app profile: ${appProfile}\n` +
        `Available profiles: ${Object.keys(APP_PROFILES).join(", ")}\n` +
        `Set EXPO_PUBLIC_APP_PROFILE in your .env or eas.json`
    );
  }

  // Get environment overrides
  const envOverrides = profileConfig.environments?.[appEnv] || {};

  // Merge configs
  const appConfig = {
    ...profileConfig.app,
    ...envOverrides.app,
  };

  const supabaseConfig = {
    ...profileConfig.supabase,
    ...envOverrides.supabase,
  };

  return {
    appConfig,
    supabaseConfig,
    appProfile,
    appEnv,
  };
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const { appConfig, appProfile, appEnv } = getConfig();

  return {
    ...config,
    name: appConfig.name,
    slug: appConfig.slug,
    version: appConfig.version,
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: appConfig.scheme,
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      supportsTablet: true,
      bundleIdentifier: appConfig.bundleIdentifier,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSMotionUsageDescription:
          "This app uses the pedometer to track your steps, distance, and floors climbed for the Live Activity.",
        NSMicrophoneUsageDescription:
          "Allow Caloric to use the microphone for voice meal logging.",
        NSSpeechRecognitionUsageDescription:
          "Allow Caloric to use speech recognition to convert your voice to food entries.",
        NSCameraUsageDescription:
          "Allow Caloric to use the camera to scan and identify food for calorie tracking.",
        NSHealthShareUsageDescription:
          "Allow Caloric to read your weight data from Apple Health for progress tracking.",
        NSHealthUpdateUsageDescription:
          "Allow Caloric to save your meals and weight to Apple Health.",
      },
      entitlements: {
        "com.apple.developer.healthkit": true,
        "com.apple.developer.applesignin": ["Default"],
      },
    },

    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      package: appConfig.androidPackage,
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
            deploymentTarget: "16.0",
            // Suppress deprecation warnings from native dependencies
            extraPodfilePropertiesAppend: {
              CLANG_WARN_DEPRECATED_OBJC_IMPLEMENTATIONS: "NO",
              GCC_WARN_ABOUT_DEPRECATED_FUNCTIONS: "NO",
            },
          },
        },
      ],
      // Fix Xcode 14+ resource bundle code signing
      "./plugins/withDisableResourceBundleSigning",
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
        },
      ],
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#ffffff",
        },
      ],
      // expo-widgets config plugin will be added here once the package
      // ships a stable plugin. Until then the factory falls back to Noop.
      // See: src/infrastructure/liveActivity/factory.ts
      "./plugins/withLiveActivity",
      [
        "./plugins/withIconComposer",
        { iconPath: "./assets/images/caloric.icon" },
      ],
      "expo-secure-store",
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme:
            "com.googleusercontent.apps.390435728176-967pml00ib7jpm5hjto9ddj8ivb73l6g",
        },
      ],
      [
        "expo-speech-recognition",
        {
          microphonePermission:
            "Allow Caloric to use the microphone for voice meal logging.",
          speechRecognitionPermission:
            "Allow Caloric to use speech recognition to convert your voice to food entries.",
        },
      ],
      [
        "react-native-vision-camera",
        {
          cameraPermissionText:
            "Allow Caloric to use the camera to scan and identify food for calorie tracking.",
          enableCodeScanner: true,
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
    },

    // Pass config to runtime via extra
    extra: {
      APP_PROFILE: appProfile,
      APP_ENV: appEnv,
      sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
      enableSentryInDev:
        process.env.EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV === "true",
      environment: appEnv,
      // Analytics (PostHog) — static reads so the bundler inlines them
      POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
      POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
      eas: {
        projectId:
          process.env.EAS_PROJECT_ID || "f4e04abd-0a14-493f-adcd-7bff9750ee56",
      },
    },
  };
};
