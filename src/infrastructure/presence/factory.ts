/**
 * Presence — Factory
 *
 * Gating:
 *   getAppConfig().features.presence must be true, otherwise noop.
 *
 * Optional integrations (gated):
 *   - Analytics: tracks app_foregrounded / app_backgrounded
 *   - Growth: stores screen context for feature requests
 */

import { getAppConfig } from "../../config";
import { logger } from "../../logging/logger";
import { AppStatePresenceClient } from "./AppStatePresenceClient";
import { NoopPresenceClient } from "./NoopPresenceClient";
import { setPresenceClient } from "./presence";
import type { PresenceClient } from "./types";

let initialized = false;
let resolvedClient: PresenceClient = new NoopPresenceClient();

type PresenceMode = "disabled_by_config" | "enabled_appstate";

function logMode(mode: PresenceMode): void {
  logger.log(`[Presence] mode=${mode}`);
}

export function initPresence(): PresenceClient {
  if (initialized) return resolvedClient;

  const config = getAppConfig();
  const enabled = !!config.features.presence;

  if (!enabled) {
    resolvedClient = new NoopPresenceClient();
    setPresenceClient(resolvedClient);
    initialized = true;
    logMode("disabled_by_config");
    return resolvedClient;
  }

  const appStateClient = new AppStatePresenceClient();
  resolvedClient = appStateClient;
  setPresenceClient(resolvedClient);

  // Auto-start listening
  resolvedClient.start();

  // Optional analytics integration (gated)
  if (config.features.analytics) {
    try {
      // Dynamic require to avoid circular dependency
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { analytics } = require("../analytics");
      resolvedClient.onChange((state) => {
        if (state === "active") {
          analytics.track("app_foregrounded");
        } else if (state === "background") {
          analytics.track("app_backgrounded");
        }
      });
    } catch {
      // Analytics not available — skip
    }
  }

  initialized = true;
  logMode("enabled_appstate");
  return resolvedClient;
}

/** Testing only */
export function resetPresence(): void {
  try {
    resolvedClient.stop();
  } catch {
    // Swallow
  }
  resolvedClient = new NoopPresenceClient();
  setPresenceClient(resolvedClient);
  initialized = false;
}
