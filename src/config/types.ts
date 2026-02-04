/**
 * Core configuration types for multi-app setup
 * Each app profile maps to a unique Supabase project + feature flags
 */

export type AppEnvironment = "dev" | "staging" | "prod";

export type AppProfile = "intake" | "proxi"; // Add new app profiles here

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

export interface FeatureFlags {
  /** Vision AI features */
  vision: boolean;
  /** Water tracking */
  water: boolean;
  /** Habit tracking */
  habit: boolean;
  /** Paywall / subscriptions */
  paywall: boolean;
  /** Analytics (Supabase / custom) */
  analytics: boolean;
  /** Push notifications */
  notifications: boolean;
  /** Firebase Analytics instrumentation */
  firebaseAnalytics: boolean;
  /** Firebase Crashlytics crash reporting */
  crashReporting: boolean;
  /** Firebase Performance Monitoring */
  performanceMonitoring: boolean;
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
