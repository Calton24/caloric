/**
 * Remote Config Cache
 * In-memory cache with TTL for remote feature flags
 */

import { RemoteConfigRow } from "./client";

interface CacheEntry {
  data: RemoteConfigRow;
  expiresAt: number;
}

// In-memory cache
const cache = new Map<string, CacheEntry>();

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Generate cache key
 */
function getCacheKey(appProfile: string, environment: string): string {
  return `${appProfile}:${environment}`;
}

/**
 * Cache remote config
 */
export function cacheRemoteConfig(
  appProfile: string,
  environment: string,
  data: RemoteConfigRow,
): void {
  const key = getCacheKey(appProfile, environment);
  const expiresAt = Date.now() + CACHE_TTL_MS;

  cache.set(key, { data, expiresAt });

  console.log(
    `💾 Cached remote config for ${key} (expires in ${CACHE_TTL_MS / 1000}s)`,
  );
}

/**
 * Get cached remote config if not expired
 */
export function getCachedRemoteConfig(
  appProfile: string,
  environment: string,
): RemoteConfigRow | null {
  const key = getCacheKey(appProfile, environment);
  const entry = cache.get(key);

  if (!entry) {
    return null;
  }

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    console.log(`🗑️ Cache expired for ${key}`);
    return null;
  }

  return entry.data;
}

/**
 * Clear cache for specific profile/environment
 */
export function clearRemoteConfigCache(
  appProfile: string,
  environment: string,
): void {
  const key = getCacheKey(appProfile, environment);
  cache.delete(key);
  console.log(`🗑️ Cleared cache for ${key}`);
}

/**
 * Clear all cache entries
 */
export function clearAllRemoteConfigCache(): void {
  cache.clear();
  console.log(`🗑️ Cleared all remote config cache`);
}
