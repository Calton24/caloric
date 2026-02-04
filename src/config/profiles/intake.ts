/**
 * Intake App Configuration
 * Vision AI food tracking app
 */

import { AppProfileConfig } from "../types";

export const intakeConfig: AppProfileConfig = {
  // Base configuration (production)
  supabase: {
    url: "https://your-intake-project.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Replace with actual anon key
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

  features: {
    vision: true, // Vision AI enabled for food scanning
    water: true,
    habit: false, // Not needed for intake
    paywall: true,
    analytics: true,
    notifications: true,
    firebaseAnalytics: true, // Enable Firebase Analytics
    crashReporting: true, // Enable Crashlytics
    performanceMonitoring: true, // Enable Performance Monitoring
  },

  app: {
    name: "Intake",
    slug: "intake-app",
    bundleIdentifier: "com.yourcompany.intake",
    androidPackage: "com.yourcompany.intake",
    version: "1.0.0",
    scheme: "intake",
  },

  // Environment-specific overrides
  environments: {
    dev: {
      supabase: {
        url: "https://your-intake-dev-project.supabase.co",
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Dev anon key
      },
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
        paywall: false, // Disable paywall in dev
        analytics: false,
        firebaseAnalytics: true, // Keep Firebase Analytics in dev
        crashReporting: true, // Keep crash reporting
        performanceMonitoring: false, // Disable perf monitoring in dev
      },
      app: {
        name: "Intake Dev",
        slug: "intake-app-dev",
        bundleIdentifier: "com.yourcompany.intake.dev",
        androidPackage: "com.yourcompany.intake.dev",
      },
    },
    staging: {
      supabase: {
        url: "https://your-intake-staging-project.supabase.co",
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Staging anon key
      },
      app: {
        name: "Intake Staging",
        bundleIdentifier: "com.yourcompany.intake.staging",
        androidPackage: "com.yourcompany.intake.staging",
      },
    },
    prod: {
      // Production uses base config by default
      // Only override if needed
    },
  },
};
