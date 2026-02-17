/**
 * Mobile Core Default Configuration
 */

import { AppProfileConfig } from "../types";

export const defaultConfig: AppProfileConfig = {
  // Base configuration (production)
  supabase: {
    url: "https://your-mobile-core-project.supabase.co",
    anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Replace with actual anon key
  },

  firebase: {
    ios: {
      googleAppId: "1:987654321:ios:xyz789012345",
      gcmSenderId: "987654321",
      apiKey: "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      projectId: "mobile-core-prod",
      storageBucket: "mobile-core-prod.appspot.com",
      clientId:
        "987654321-yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.apps.googleusercontent.com",
      bundleId: "com.yourcompany.mobilecore",
    },
    android: {
      googleAppId: "1:987654321:android:xyz789012345",
      apiKey: "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      projectId: "mobile-core-prod",
      storageBucket: "mobile-core-prod.appspot.com",
      gcmSenderId: "987654321",
      clientId:
        "987654321-yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.apps.googleusercontent.com",
      packageName: "com.yourcompany.mobilecore",
    },
  },

  billing: {
    provider: "stripe" as const,
    stripe: {
      publishableKey: "pk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", // Replace with your Stripe publishable key
      mode: "checkout" as const,
      priceIds: {
        monthly: "price_monthly_xxxxxxxxxxxxxx",
        yearly: "price_yearly_xxxxxxxxxxxxxx",
        premium: "price_premium_xxxxxxxxxxxxxx",
      },
      defaultPriceId: "price_monthly_xxxxxxxxxxxxxx",
      successUrl: "mobilecore://checkout/success",
      cancelUrl: "mobilecore://checkout/cancel",
    },
  },

  features: {
    vision: false,
    water: false,
    habit: true,
    analytics: true,
    notifications: true,
    firebaseAnalytics: false, // Firebase not installed in mobile-core
    crashReporting: false, // Firebase not installed in mobile-core
    performanceMonitoring: false, // Firebase not installed in mobile-core
    billing: true, // Enable billing system (includes paywall UI)
  },

  app: {
    name: "Mobile Core",
    slug: "mobile-core",
    bundleIdentifier: "com.yourcompany.mobilecore",
    androidPackage: "com.yourcompany.mobilecore",
    version: "1.0.0",
    scheme: "mobilecore",
  },

  // Environment-specific overrides
  environments: {
    dev: {
      supabase: {
        url: "https://your-mobile-core-dev-project.supabase.co",
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Dev anon key
      },
      firebase: {
        ios: {
          projectId: "mobile-core-dev",
          storageBucket: "mobile-core-dev.appspot.com",
          bundleId: "com.yourcompany.mobilecore.dev",
          googleAppId: "1:987654321:ios:dev789012",
          gcmSenderId: "987654321",
          apiKey: "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
        },
        android: {
          projectId: "mobile-core-dev",
          storageBucket: "mobile-core-dev.appspot.com",
          packageName: "com.yourcompany.mobilecore.dev",
          googleAppId: "1:987654321:android:dev789012",
          apiKey: "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
          gcmSenderId: "987654321",
        },
      },
      features: {
        analytics: false,
        firebaseAnalytics: true,
        crashReporting: true,
        billing: false, // Disable billing in dev
      },
      app: {
        name: "Mobile Core",
        slug: "mobile-core-dev",
        bundleIdentifier: "com.yourcompany.mobilecore.dev",
        androidPackage: "com.yourcompany.mobilecore.dev",
      },
    },
    staging: {
      supabase: {
        url: "https://your-mobile-core-staging-project.supabase.co",
        anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Staging anon key
      },
      app: {
        name: "Mobile Core Staging",
        bundleIdentifier: "com.yourcompany.mobilecore.staging",
        androidPackage: "com.yourcompany.mobilecore.staging",
      },
    },
    prod: {
      // Production uses base config
    },
  },
};
