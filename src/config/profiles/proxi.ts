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
      successUrl: "proxi://checkout/success",
      cancelUrl: "proxi://checkout/cancel",
    },
  },

  features: {
    vision: false, // No vision features in proxi
    water: false,
    habit: true, // Social habits/streaks
    analytics: true,
    growth: false,
    haptics: true,
    notifications: true, // Critical for proximity alerts
    firebaseAnalytics: false, // Firebase not installed in mobile-core
    crashReporting: false, // Firebase not installed in mobile-core
    performanceMonitoring: false, // Firebase not installed in mobile-core
    billing: true, // Enable billing system (includes paywall UI)
    i18n: true,
    presence: true,
    activityMonitor: true,
    liveActivity: true,
    maintenance: true,
  },

  app: {
    name: "Mobile Core",
    slug: "mobile-core",
    bundleIdentifier: "com.yourcompany.mobilecore",
    androidPackage: "com.yourcompany.mobilecore",
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
        analytics: false,
        growth: true,
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
        url: "https://your-proxi-staging-project.supabase.co",
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
