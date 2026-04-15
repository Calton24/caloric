/**
 * Caloric Default Configuration
 */

import { AppProfileConfig } from "../types";

export const defaultConfig: AppProfileConfig = {
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
      googleAppId: "1:987654321:ios:xyz789012345",
      gcmSenderId: "987654321",
      apiKey: "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      projectId: "caloric-prod",
      storageBucket: "caloric-prod.appspot.com",
      clientId:
        "987654321-yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.apps.googleusercontent.com",
      bundleId: "com.yourcompany.caloric",
    },
    android: {
      googleAppId: "1:987654321:android:xyz789012345",
      apiKey: "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
      projectId: "caloric-prod",
      storageBucket: "caloric-prod.appspot.com",
      gcmSenderId: "987654321",
      clientId:
        "987654321-yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy.apps.googleusercontent.com",
      packageName: "com.yourcompany.caloric",
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
      successUrl: "caloric://checkout/success",
      cancelUrl: "caloric://checkout/cancel",
    },
  },

  features: {
    vision: false,
    water: false,
    habit: true,
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
    bundleIdentifier: "com.yourcompany.caloric",
    androidPackage: "com.yourcompany.caloric",
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
          bundleId: "com.yourcompany.caloric.dev",
          googleAppId: "1:987654321:ios:dev789012",
          gcmSenderId: "987654321",
          apiKey: "AIzaSyYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY",
        },
        android: {
          projectId: "caloric-dev",
          storageBucket: "caloric-dev.appspot.com",
          packageName: "com.yourcompany.caloric.dev",
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
        name: "Caloric",
        slug: "caloric-dev",
        bundleIdentifier: "com.yourcompany.caloric.dev",
        androidPackage: "com.yourcompany.caloric.dev",
      },
    },
    staging: {
      supabase: {
        url: "https://your-caloric-staging-project.supabase.co",
        anonKey: "YOUR_STAGING_ANON_KEY", // Replace with staging anon key
      },
      app: {
        name: "Caloric Staging",
        bundleIdentifier: "com.yourcompany.caloric.staging",
        androidPackage: "com.yourcompany.caloric.staging",
      },
    },
    prod: {
      // Production uses base config
    },
  },
};
