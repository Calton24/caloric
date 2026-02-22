/**
 * Core configuration types for multi-app setup
 * Each app profile maps to a unique Supabase project + feature flags
 */

export type AppEnvironment = "dev" | "staging" | "prod";

export type AppProfile = "default" | "intake" | "proxi"; // Add new app profiles here

export interface SupabaseConfig {
  /** Supabase project URL */
  url: string;
  /** Supabase anonymous key (safe for client) */
  anonKey: string;
  /** Optional: Edge Functions base URL (defaults to {url}/functions/v1) */
  functionsUrl?: string;
}

export interface FirebaseConfig {
  /** Firebase iOS configuration */
  ios: {
    /** Google App ID */
    googleAppId: string;
    /** GCM Sender ID */
    gcmSenderId: string;
    /** API Key */
    apiKey: string;
    /** Project ID */
    projectId: string;
    /** Storage Bucket */
    storageBucket: string;
    /** Client ID (optional) */
    clientId?: string;
    /** Bundle ID */
    bundleId: string;
  };
  /** Firebase Android configuration */
  android: {
    /** Google App ID */
    googleAppId: string;
    /** API Key */
    apiKey: string;
    /** Project ID */
    projectId: string;
    /** Storage Bucket */
    storageBucket: string;
    /** GCM Sender ID */
    gcmSenderId: string;
    /** Client ID (optional) */
    clientId?: string;
    /** Package Name */
    packageName: string;
  };
}

export type BillingProvider = "superwall" | "stripe";

export interface SuperwallConfig {
  /** Superwall API key (safe for client) */
  apiKey: string;
  /** Paywall triggers (optional) - map trigger names to IDs */
  triggers?: Record<string, string>;
}

export interface StripeConfig {
  /** Stripe publishable key (safe for client) */
  publishableKey: string;
  /** Stripe checkout mode */
  mode: "checkout" | "payment_sheet";
  /** Price IDs mapped to product tiers */
  priceIds: Record<string, string>;
  /** Default price ID to use if no trigger specified */
  defaultPriceId?: string;
  /** Success URL for checkout redirect (app deep link) */
  successUrl: string;
  /** Cancel URL for checkout redirect (app deep link) */
  cancelUrl: string;
}

export interface BillingConfig {
  /** Billing provider selection */
  provider: BillingProvider;
  /** Superwall configuration (required if provider is "superwall") */
  superwall?: SuperwallConfig;
  /** Stripe configuration (required if provider is "stripe") */
  stripe?: StripeConfig;
}

export interface FeatureFlags {
  /** Vision AI features */
  vision: boolean;
  /** Water tracking */
  water: boolean;
  /** Habit tracking */
  habit: boolean;
  /** Analytics (Supabase / custom) */
  analytics: boolean;
  /** Growth layer (feature requests + milestones) */
  growth: boolean;
  /** Push notifications */
  notifications: boolean;
  /** Firebase Analytics instrumentation */
  firebaseAnalytics: boolean;
  /** Firebase Crashlytics crash reporting */
  crashReporting: boolean;
  /** Firebase Performance Monitoring */
  performanceMonitoring: boolean;
  /** Billing / subscription system (includes paywall UI) */
  billing: boolean;
}

export interface AppMetadata {
  /** Display name */
  name: string;
  /** Expo slug */
  slug: string;
  /** iOS bundle identifier */
  bundleIdentifier: string;
  /** Android package name */
  androidPackage: string;
  /** App version */
  version: string;
  /** App scheme for deep linking */
  scheme: string;
}

export interface EnvironmentOverrides {
  /** Per-environment Supabase configs (optional) */
  supabase?: Partial<SupabaseConfig>;
  /** Per-environment Firebase configs (optional) */
  firebase?: Partial<FirebaseConfig>;
  /** Per-environment billing configs (optional) */
  billing?: Partial<BillingConfig>;
  /** Per-environment feature flag overrides (optional) */
  features?: Partial<FeatureFlags>;
  /** Per-environment app metadata overrides (optional) */
  app?: Partial<AppMetadata>;
}

export interface AppConfig {
  /** App profile identifier */
  profile: AppProfile;
  /** Current environment */
  environment: AppEnvironment;
  /** Supabase configuration */
  supabase: SupabaseConfig;
  /** Firebase configuration (optional) */
  firebase?: FirebaseConfig;
  /** Billing configuration (optional) */
  billing?: BillingConfig;
  /** Feature flags */
  features: FeatureFlags;
  /** App metadata */
  app: AppMetadata;
}

export interface AppProfileConfig {
  /** Base Supabase config (typically production) */
  supabase: SupabaseConfig;
  /** Base Firebase config (optional) */
  firebase?: FirebaseConfig;
  /** Base billing config (optional) */
  billing?: BillingConfig;
  /** Base feature flags */
  features: FeatureFlags;
  /** App metadata */
  app: AppMetadata;
  /** Environment-specific overrides */
  environments?: {
    dev?: EnvironmentOverrides;
    staging?: EnvironmentOverrides;
    prod?: EnvironmentOverrides;
  };
}
