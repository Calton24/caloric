/**
 * Feature Flags Module
 *
 * Provides a swappable feature flag abstraction.
 * Default: NoopFlagClient (always returns default values)
 * Production: Use setFlagClient() to inject LaunchDarkly, Split.io, etc.
 *
 * Example:
 *   import { flags } from 'src/flags/flags';
 *
 *   if (flags.isEnabled('new-chat-ui')) {
 *     // Show new chat UI
 *   }
 */

import type { FeatureFlagClient } from "./flags.types";
import { NoopFlagClient } from "./flags.types";

/**
 * Current flag client instance
 * Defaults to NoopFlagClient (always returns default values)
 */
let client: FeatureFlagClient = new NoopFlagClient();

/**
 * Set the feature flag client
 * Use this to swap in LaunchDarkly, Split.io, or custom implementations
 *
 * @param newClient - Feature flag client to use
 *
 * @example
 *   const ldClient = new LaunchDarklyFlagClient(sdkKey);
 *   setFlagClient(ldClient);
 */
export function setFlagClient(newClient: FeatureFlagClient): void {
  client = newClient;
}

/**
 * Get current feature flag client
 * @returns Current FeatureFlagClient instance
 */
export function getFlagClient(): FeatureFlagClient {
  return client;
}

/**
 * Feature flags API
 * All methods are fail-safe and will not throw
 */
export const flags = {
  /**
   * Check if a feature flag is enabled
   * @param flagKey - Feature flag identifier
   * @param defaultValue - Default value if flag cannot be evaluated (defaults to false)
   * @returns Flag value or default
   */
  isEnabled(flagKey: string, defaultValue: boolean = false): boolean {
    try {
      return client.isEnabled(flagKey, defaultValue);
    } catch (error) {
      console.warn(`[flags] Error checking flag "${flagKey}":`, error);
      return defaultValue;
    }
  },

  /**
   * Get feature flag variant/value
   * @param flagKey - Feature flag identifier
   * @param defaultValue - Default value if flag cannot be evaluated
   * @returns Flag value or default
   */
  getValue<T = any>(flagKey: string, defaultValue: T): T {
    try {
      return client.getValue(flagKey, defaultValue);
    } catch (error) {
      console.warn(`[flags] Error getting value for "${flagKey}":`, error);
      return defaultValue;
    }
  },

  /**
   * Set user context for flag evaluation
   * @param userId - User identifier
   * @param attributes - Additional user attributes
   */
  setUser(userId: string, attributes?: Record<string, any>): void {
    try {
      client.setUser(userId, attributes);
    } catch (error) {
      console.warn(`[flags] Error setting user:`, error);
    }
  },

  /**
   * Clear user context
   */
  clearUser(): void {
    try {
      client.clearUser();
    } catch (error) {
      console.warn(`[flags] Error clearing user:`, error);
    }
  },
};
