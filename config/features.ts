/**
 * Feature flags for the mobile-core component library
 * Toggle these to enable/disable features during development
 */
export const FeatureFlags = {
  /**
   * Show the Playground tab for testing components
   * Set to false in production builds
   */
  SHOW_PLAYGROUND: true,
} as const;

export type FeatureFlag = keyof typeof FeatureFlags;
