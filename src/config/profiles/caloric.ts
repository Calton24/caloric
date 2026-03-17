/**
 * Caloric App Configuration
 * Vision AI food tracking app
 */

import { AppProfileConfig } from "../types";

export const caloricConfig: AppProfileConfig = {
  // Base configuration (production)
  supabase: {
    url:
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      "https://your-caloric-project.supabase.co",
    anonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY", // Replace with actual anon key from Supabase dashboard
  },

  firebase: {
    ios: {
      googleAppId: "1:123456789:ios:abcdef123456",
      gcmSenderId: "123456789",
      apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      projectId: "caloric-prod",
      storageBucket: "caloric-prod.appspot.com",
      clientId:
        "123456789-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
      bundleId: "com.yourcompany.caloric",
    },
    android: {
      googleAppId: "1:123456789:android:abcdef123456",
      apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
      projectId: "caloric-prod",
      storageBucket: "caloric-prod.appspot.com",
      gcmSenderId: "123456789",
      clientId:
        "123456789-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com",
      packageName: "com.yourcompany.caloric",
    },
  },

  billing: {
    provider: "revenueCat" as const,
    revenueCat: {
      apiKey:
        process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
        "appl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Replace with your RevenueCat API key
    },
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
    habit: false, // Not needed for caloric
    analytics: true,
    growth: false,
    haptics: true,
    notifications: true,
    firebaseAnalytics: false, // Firebase not installed in caloric
    crashReporting: false, // Firebase not installed in caloric
    performanceMonitoring: false, // Firebase not installed in caloric
    billing: true, // Enable billing system (includes paywall UI)
    i18n: true,
    presence: true,
    activityMonitor: true,
    liveActivity: true,
    maintenance: true,
    allowUnsafeClientWrites: false, // SECURITY: Use Edge Function for growth ingestion
  },

  app: {
    name: "Caloric",
    slug: "caloric",
    bundleIdentifier: "com.calton24.caloric",
    androidPackage: "com.calton24.caloric",
    version: "1.0.0",
    scheme: "caloric",
  },

  // Environment-specific overrides
  environments: {
    dev: {
      // Supabase config comes from env vars (base config)
      firebase: {
        ios: {
          projectId: "caloric-dev",
          storageBucket: "caloric-dev.appspot.com",
          bundleId: "com.calton24.caloric.dev",
          googleAppId: "1:123456789:ios:dev123456",
          gcmSenderId: "123456789",
          apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        },
        android: {
          projectId: "caloric-dev",
          storageBucket: "caloric-dev.appspot.com",
          packageName: "com.calton24.caloric.dev",
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
        name: "Caloric",
        slug: "caloric-dev",
        bundleIdentifier: "com.calton24.caloric.dev",
        androidPackage: "com.calton24.caloric.dev",
      },
    },
    staging: {
      // Supabase config comes from env vars (base config)
      app: {
        name: "Caloric Staging",
        bundleIdentifier: "com.calton24.caloric.staging",
        androidPackage: "com.calton24.caloric.staging",
      },
    },
    prod: {
      // Production uses base config by default
      // Only override if needed
    },
  },
};
