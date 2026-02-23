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
    process.env.EXPO_PUBLIC_APP_PROFILE || process.env.APP_PROFILE || "intake";
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
        projectId: process.env.EAS_PROJECT_ID || "your-eas-project-id",
      },
    },
  };
};
