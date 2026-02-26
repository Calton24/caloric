/**
 * Remote Config Client
 * Fetches feature flags from Supabase with RLS protection and caching
 * This is OPTIONAL - only use if you need runtime feature flag toggles
 */

import { FeatureFlags, getAppConfig } from "../../config";
import { logger } from "../../logging/logger";
import { getSupabaseClient } from "../supabase";
import {
    cacheRemoteConfig,
    clearRemoteConfigCache,
    getCachedRemoteConfig,
} from "./cache";

export interface RemoteFeatureFlags extends Partial<FeatureFlags> {
  /** Last updated timestamp */
  updated_at?: string;
  /** Config version */
  version?: number;
}

export interface RemoteConfigRow {
  id: string;
  app_profile: string;
  environment: string;
  feature_flags: RemoteFeatureFlags;
  enabled: boolean;
  updated_at: string;
  version: number;
}

/**
 * Fetch remote feature flags from Supabase
 * Falls back to local config if fetch fails
 *
 * Table schema (create this in your Supabase project):
 * ```sql
 * CREATE TABLE remote_config (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   app_profile TEXT NOT NULL,
 *   environment TEXT NOT NULL,
 *   feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
 *   enabled BOOLEAN NOT NULL DEFAULT true,
 *   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 *   version INTEGER NOT NULL DEFAULT 1,
 *   UNIQUE(app_profile, environment)
 * );
 *
 * -- RLS Policies
 * ALTER TABLE remote_config ENABLE ROW LEVEL SECURITY;
 *
 * -- Allow all authenticated users to read config for their app
 * CREATE POLICY "Users can read config for their app"
 *   ON remote_config FOR SELECT
 *   TO authenticated
 *   USING (enabled = true);
 *
 * -- Only service role can insert/update (via Edge Functions)
 * CREATE POLICY "Only service role can modify config"
 *   ON remote_config FOR ALL
 *   TO service_role
 *   USING (true)
 *   WITH CHECK (true);
 * ```
 */
export async function fetchRemoteConfig(): Promise<FeatureFlags> {
  try {
    const config = getAppConfig();
    const client = getSupabaseClient();

    logger.log(
      `Fetching remote config for ${config.profile}:${config.environment}`
    );

    // Check cache first (5 minute TTL)
    const cached = getCachedRemoteConfig(config.profile, config.environment);
    if (cached) {
      logger.log(`Using cached remote config (version ${cached.version})`);
      return { ...config.features, ...cached.feature_flags };
    }

    // Fetch from Supabase
    const { data, error } = await client
      .from("remote_config")
      .select("*")
      .eq("app_profile", config.profile)
      .eq("environment", config.environment)
      .eq("enabled", true)
      .single<RemoteConfigRow>();

    if (error) {
      logger.warn(
        `Failed to fetch remote config, using local config:`,
        error.message
      );
      return config.features;
    }

    if (!data) {
      logger.log(`No remote config found, using local config`);
      return config.features;
    }

    logger.log(`Remote config fetched (version ${data.version})`);

    // Cache the result
    cacheRemoteConfig(config.profile, config.environment, data);

    // Merge remote flags with local config (remote takes precedence)
    return {
      ...config.features,
      ...data.feature_flags,
    };
  } catch (error) {
    console.error(`❌ Error fetching remote config:`, error);
    // Fall back to local config
    return getAppConfig().features;
  }
}

/**
 * Get feature flags with remote config support
 * This is the main function to use in your app
 *
 * Example:
 * ```ts
 * const features = await getFeatureFlags();
 * if (features.vision) {
 *   // Enable vision features
 * }
 * ```
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
  return fetchRemoteConfig();
}

/**
 * Force refresh remote config (clears cache)
 */
export async function refreshRemoteConfig(): Promise<FeatureFlags> {
  const config = getAppConfig();
  clearRemoteConfigCache(config.profile, config.environment);
  return fetchRemoteConfig();
}

/**
 * Check if a specific feature is enabled
 * Convenience helper that checks remote config
 *
 * Example:
 * ```ts
 * if (await isFeatureEnabled('vision')) {
 *   // Show vision features
 * }
 * ```
 */
export async function isFeatureEnabled(
  feature: keyof FeatureFlags
): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[feature] || false;
}
