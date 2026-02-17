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
    notifications: true, // Critical for proximity alerts
    firebaseAnalytics: false, // Firebase not installed in mobile-core
    crashReporting: false, // Firebase not installed in mobile-core
    performanceMonitoring: false, // Firebase not installed in mobile-core
    billing: true, // Enable billing system (includes paywall UI)
  },

  app: {
    name: "Proxi",
    slug: "proxi-mobile",
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
        analytics: false,
        firebaseAnalytics: true,
        crashReporting: true,
        billing: false, // Disable billing in dev
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
