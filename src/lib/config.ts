/**
 * Config Library Wrapper
 * Provides convenience functions for accessing active config
 */

import { getAppConfig, resetConfigCache } from "../config";
import type { AppConfig } from "../config/types";

/**
 * Get active config (alias for getAppConfig)
 */
export function getActiveConfig(): AppConfig {
  return getAppConfig();
}

/**
 * Clear config cache (for testing)
 * @internal
 */
export function __clearConfigCache(): void {
  resetConfigCache();
}
