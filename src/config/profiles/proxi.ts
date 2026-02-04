/**
 * Proxi App Configuration
 * Social proximity and connection app
 */

import { AppProfileConfig } from "../types";

export const proxiConfig: AppProfileConfig = {
  // Base configuration (production)
  supabase: {
    url: "https://your-proxi-project.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Replace with actual anon key
  },

  firebase: {
    ios: {
      googleAppId: "1:987654321:ios:xyz789012345",
      gcmSenderId: "987654321",
      apiKey: "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      projectId: "proxi-prod",
      storageBucket: "proxi-prod.appspot.com",
      clientId:
        "987654321-yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.apps.googleusercontent.com",
      bundleId: "com.yourcompany.proxi",
    },
    android: {
      googleAppId: "1:987654321:android:xyz789012345",
      apiKey: "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      projectId: "proxi-prod",
      storageBucket: "proxi-prod.appspot.com",
      gcmSenderId: "987654321",
      clientId:
        "987654321-yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.apps.googleusercontent.com",
      packageName: "com.yourcompany.proxi",
    },
  },

  features: {
    vision: false, // No vision features in proxi
    water: false,
    habit: true, // Social habits/streaks
    paywall: true,
    analytics: true,
    notifications: true, // Critical for proximity alerts
    firebaseAnalytics: true, // Enable Firebase Analytics
    crashReporting: true, // Enable Crashlytics
    performanceMonitoring: false, // Proxi doesn't need performance monitoring
  },

  app: {
    name: "Proxi",
    slug: "proxi-app",
    bundleIdentifier: "com.yourcompany.proxi",
    androidPackage: "com.yourcompany.proxi",
    version: "1.0.0",
    scheme: "proxi",
  },

  // Environment-specific overrides
  environments: {
    dev: {
      supabase: {
        url: "https://your-proxi-dev-project.supabase.co",
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Dev anon key
      },
      firebase: {
        ios: {
          projectId: "proxi-dev",
          storageBucket: "proxi-dev.appspot.com",
          bundleId: "com.yourcompany.proxi.dev",
          googleAppId: "1:987654321:ios:dev789012",
          gcmSenderId: "987654321",
          apiKey: "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
        },
        android: {
          projectId: "proxi-dev",
          storageBucket: "proxi-dev.appspot.com",
          packageName: "com.yourcompany.proxi.dev",
          googleAppId: "1:987654321:android:dev789012",
          apiKey: "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
          gcmSenderId: "987654321",
        },
      },
      features: {
        paywall: false,
        analytics: false,
        firebaseAnalytics: true,
        crashReporting: true,
      },
      app: {
        name: "Proxi Dev",
        slug: "proxi-app-dev",
        bundleIdentifier: "com.yourcompany.proxi.dev",
        androidPackage: "com.yourcompany.proxi.dev",
      },
    },
    staging: {
      supabase: {
        url: "https://your-proxi-staging-project.supabase.co",
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Staging anon key
      },
      app: {
        name: "Proxi Staging",
        bundleIdentifier: "com.yourcompany.proxi.staging",
        androidPackage: "com.yourcompany.proxi.staging",
      },
    },
    prod: {
      // Production uses base config
    },
  },
};
