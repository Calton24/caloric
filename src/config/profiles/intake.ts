/**
 * Fork intake profile template (Vision AI food tracking → CalCut)
 */

import { AppProfileConfig } from "../types";

export const caloricConfig: AppProfileConfig = {
  // Base configuration (production)
  supabase: {
    url:
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      "https://your-caloric-project.supabase.co",
    anonKey:
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY",
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
      apiKey: "placeholder_replace_with_actual_key",
    },
  },

  features: {
    vision: true,
    water: true,
    habit: false,
    analytics: true,
    growth: false,
    haptics: true,
    notifications: true,
    firebaseAnalytics: false,
    crashReporting: false,
    performanceMonitoring: false,
    billing: true,
    i18n: true,
    presence: true,
    activityMonitor: true,
    liveActivity: true,
    maintenance: true,
    allowUnsafeClientWrites: false,
  },

  app: {
    name: "CalCut",
    slug: "caloric",
    bundleIdentifier: "com.calton.caloric",
    androidPackage: "com.calton.caloric",
    version: "1.0.0",
    scheme: ["calcut", "caloric"],
  },

  environments: {
    dev: {
      firebase: {
        ios: {
          projectId: "caloric-dev",
          storageBucket: "caloric-dev.appspot.com",
          bundleId: "com.calton.caloric",
          googleAppId: "1:123456789:ios:dev123456",
          gcmSenderId: "123456789",
          apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
        },
        android: {
          projectId: "caloric-dev",
          storageBucket: "caloric-dev.appspot.com",
          packageName: "com.calton.caloric",
          googleAppId: "1:123456789:android:dev123456",
          apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
          gcmSenderId: "123456789",
        },
      },
      features: {
        analytics: false,
        growth: true,
        firebaseAnalytics: true,
        crashReporting: true,
        performanceMonitoring: false,
        billing: false,
      },
      app: {
        name: "CalCut Dev",
        slug: "caloric-dev",
      },
    },
    staging: {
      app: {
        name: "CalCut Staging",
      },
    },
    prod: {},
  },
};
