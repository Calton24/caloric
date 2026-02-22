/**
 * Configuration Loader
 * Loads and validates app config based on APP_PROFILE and APP_ENV
 */

import Constants from "expo-constants";
import { APP_PROFILES } from "./profiles";
import {
    AppConfigSchema,
    AppEnvironmentSchema,
    AppProfileConfigSchema,
    AppProfileSchema,
    validateConfig,
} from "./schema";
import {
    AppConfig,
    AppEnvironment,
    AppProfile,
    AppProfileConfig,
} from "./types";

/**
 * Parse environment variables from Expo
 * All client-side env vars must be prefixed with EXPO_PUBLIC_
 *
 * Only allows unprefixed access in test/node environments to prevent
 * accidentally reading secrets in production builds.
 */
function getEnvVar(key: string, defaultValue?: string): string {
  // Try EXPO_PUBLIC_ prefixed version first
  const value =
    Constants.expoConfig?.extra?.[key] || process.env[`EXPO_PUBLIC_${key}`];

  // Allow unprefixed fallback ONLY in test/node environments
  const isTestEnv =
    process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;
  const finalValue =
    value || (isTestEnv ? process.env[key] : undefined) || defaultValue;

  if (!finalValue) {
    throw new Error(
      `❌ Missing required environment variable: ${key}\n` +
        `Make sure to set EXPO_PUBLIC_${key} in your .env or eas.json\n` +
        `(Unprefixed env vars are only allowed in test environments)`
    );
  }

  return finalValue;
}

/**
 * Get optional environment variable
 */
function getOptionalEnvVar(
  key: string,
  defaultValue?: string
): string | undefined {
  const isTestEnv =
    process.env.NODE_ENV === "test" || process.env.JEST_WORKER_ID !== undefined;
  return (
    Constants.expoConfig?.extra?.[key] ||
    process.env[`EXPO_PUBLIC_${key}`] ||
    (isTestEnv ? process.env[key] : undefined) ||
    defaultValue
  );
}

/**
 * Load app profile from environment
 */
function loadAppProfile(): AppProfile {
  const profile = getEnvVar("APP_PROFILE", "default"); // Default to default profile
  return validateConfig(AppProfileSchema, profile, "APP_PROFILE");
}

/**
 * Load app environment from environment
 */
function loadAppEnvironment(): AppEnvironment {
  const env = getOptionalEnvVar("APP_ENV", "dev") || "dev"; // Default to dev
  return validateConfig(AppEnvironmentSchema, env, "APP_ENV");
}

/**
 * Merge base config with environment overrides
 */
function mergeConfigWithEnvironment(
  baseConfig: AppProfileConfig,
  environment: AppEnvironment
): Omit<AppConfig, "profile" | "environment"> {
  const envOverrides = baseConfig.environments?.[environment];

  return {
    supabase: {
      ...baseConfig.supabase,
      ...envOverrides?.supabase,
    },
    firebase: baseConfig.firebase
      ? {
          ...baseConfig.firebase,
          ...envOverrides?.firebase,
        }
      : undefined,
    billing: baseConfig.billing
      ? {
          ...baseConfig.billing,
          ...envOverrides?.billing,
        }
      : undefined,
    features: {
      ...baseConfig.features,
      ...envOverrides?.features,
    },
    app: {
      ...baseConfig.app,
      ...envOverrides?.app,
    },
  };
}

/**
 * Load and validate the complete app configuration
 * This is the main entry point for config loading
 */
export function loadAppConfig(): AppConfig {
  try {
    // 1. Load profile and environment
    const profile = loadAppProfile();
    const environment = loadAppEnvironment();

    console.log(
      `📱 Loading config for profile: ${profile}, environment: ${environment}`
    );

    // 2. Get base profile config
    const profileConfig = APP_PROFILES[profile];
    if (!profileConfig) {
      throw new Error(
        `❌ Unknown app profile: ${profile}\n` +
          `Available profiles: ${Object.keys(APP_PROFILES).join(", ")}\n` +
          `Add your profile to src/config/profiles/`
      );
    }

    // 3. Validate base profile config
    const validatedProfileConfig = validateConfig(
      AppProfileConfigSchema,
      profileConfig,
      `Profile: ${profile}`
    ) as any; // Type assertion to bypass strict checking while Zod validates at runtime

    // 4. Merge with environment overrides
    const mergedConfig = mergeConfigWithEnvironment(
      validatedProfileConfig as any,
      environment
    );

    // 5. Build final config
    const finalConfig: AppConfig = {
      profile,
      environment,
      ...mergedConfig,
    } as any; // Type assertion while Zod validates at runtime

    // 6. Final validation
    const validatedConfig = validateConfig(
      AppConfigSchema,
      finalConfig,
      "Final Config"
    );

    console.log(`✅ Config loaded successfully:`);
    console.log(`   App: ${validatedConfig.app.name}`);
    console.log(`   Supabase: ${validatedConfig.supabase.url}`);
    console.log(
      `   Features:`,
      Object.entries(validatedConfig.features)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(", ")
    );

    return validatedConfig as AppConfig;
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    }
    throw error;
  }
}

// Singleton pattern: Load config once and cache it
let cachedConfig: AppConfig | null = null;

/**
 * Get the current app configuration (singleton)
 * Config is loaded once and cached for the app lifecycle
 */
export function getAppConfig(): AppConfig {
  if (!cachedConfig) {
    cachedConfig = loadAppConfig();
  }
  return cachedConfig;
}

/**
 * Reset cached config (useful for testing)
 */
export function resetConfigCache(): void {
  cachedConfig = null;
}
