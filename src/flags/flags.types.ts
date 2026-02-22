/**
 * Feature Flags Types
 */

/**
 * Feature flag client interface
 * Implementations can use LaunchDarkly, Split.io, etc.
 */
export interface FeatureFlagClient {
  /**
   * Check if a flag is enabled
   * @param flagKey - Feature flag identifier
   * @param defaultValue - Default value if flag cannot be evaluated
   */
  isEnabled(flagKey: string, defaultValue?: boolean): boolean;

  /**
   * Get flag variant/value
   * @param flagKey - Feature flag identifier
   * @param defaultValue - Default value if flag cannot be evaluated
   */
  getValue<T = any>(flagKey: string, defaultValue: T): T;

  /**
   * Set user context for flag evaluation
   * @param userId - User identifier
   * @param attributes - Additional user attributes
   */
  setUser(userId: string, attributes?: Record<string, any>): void;

  /**
   * Clear user context
   */
  clearUser(): void;
}

/**
 * No-op implementation that always returns default values
 * Safe fallback when no flag client is configured
 */
export class NoopFlagClient implements FeatureFlagClient {
  isEnabled(_flagKey: string, defaultValue: boolean = false): boolean {
    return defaultValue;
  }

  getValue<T = any>(_flagKey: string, defaultValue: T): T {
    return defaultValue;
  }

  setUser(_userId: string, _attributes?: Record<string, any>): void {
    // No-op
  }

  clearUser(): void {
    // No-op
  }
}
