/**
 * Intake App Configuration
 * Vision AI food tracking app
 */

import { AppProfileConfig } from "../types";

export const intakeConfig: AppProfileConfig = {
  // Base configuration (production)
  supabase: {
    url:
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      "https://your-intake-project.supabase.co",
    anonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Replace with actual anon key
  },

  firebase: {
    ios: {
      googleAppId: "1:123456789:ios:abcdef123456",
      gcmSenderId: "123456789",
      apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      projectId: "intake-prod",
      storageBucket: "intake-prod.appspot.com",
      clientId:
        "123456789-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
      bundleId: "com.yourcompany.intake",
    },
    android: {
      googleAppId: "1:123456789:android:abcdef123456",
      apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      projectId: "intake-prod",
      storageBucket: "intake-prod.appspot.com",
      gcmSenderId: "123456789",
      clientId:
        "123456789-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
      packageName: "com.yourcompany.intake",
    },
  },

  billing: {
    provider: "superwall" as const,
    superwall: {
      apiKey: "pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Replace with your Superwall API key
      triggers: {
        premium: "premium_paywall",
        pro: "pro_subscription",
        foodScanning: "food_scan_limit",
      } satisfies Record<string, string>,
    },
  },

  features: {
    vision: true, // Vision AI enabled for food scanning
    water: true,
    habit: false, // Not needed for intake
    analytics: true,
    growth: false,
    notifications: true,
    firebaseAnalytics: false, // Firebase not installed in mobile-core
    crashReporting: false, // Firebase not installed in mobile-core
    performanceMonitoring: false, // Firebase not installed in mobile-core
    billing: true, // Enable billing system (includes paywall UI)
  },

  app: {
    name: "Mobile Core",
    slug: "mobile-core",
    bundleIdentifier: "com.calton24.mobilecore",
    androidPackage: "com.calton24.mobilecore",
    version: "1.0.0",
    scheme: "mobile-core",
  },

  // Environment-specific overrides
  environments: {
    dev: {
      // Supabase config comes from env vars (base config)
      firebase: {
        ios: {
          projectId: "intake-dev",
          storageBucket: "intake-dev.appspot.com",
          bundleId: "com.yourcompany.intake.dev",
          googleAppId: "1:123456789:ios:dev123456",
          gcmSenderId: "123456789",
          apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        },
        android: {
          projectId: "intake-dev",
          storageBucket: "intake-dev.appspot.com",
          packageName: "com.yourcompany.intake.dev",
          googleAppId: "1:123456789:android:dev123456",
          apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          gcmSenderId: "123456789",
        },
      },
      features: {
        analytics: false,
        growth: true,
        firebaseAnalytics: true, // Keep Firebase Analytics in dev
        crashReporting: true, // Keep crash reporting
        performanceMonitoring: false, // Disable perf monitoring in dev
        billing: false, // Disable billing in dev (use test mode in staging)
      },
      app: {
        name: "Mobile Core",
        slug: "mobile-core-dev",
        bundleIdentifier: "com.calton24.mobilecore.dev",
        androidPackage: "com.calton24.mobilecore.dev",
      },
    },
    staging: {
      // Supabase config comes from env vars (base config)
      app: {
        name: "Mobile Core Staging",
        bundleIdentifier: "com.yourcompany.mobilecore.staging",
        androidPackage: "com.yourcompany.mobilecore.staging",
      },
    },
    prod: {
      // Production uses base config by default
      // Only override if needed
    },
  },
};
