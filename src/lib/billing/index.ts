/**
 * Billing Provider Factory
 * Creates the appropriate billing provider based on active config
 */

import { logger } from "../../logging/logger";
import { getActiveConfig } from "../config";
import { StripeProvider } from "./stripe";
import { SuperwallProvider } from "./superwall";
import type { BillingProvider } from "./types";
import { NoBillingProvider } from "./types";

let cachedProvider: BillingProvider | null = null;

/**
 * Get the billing provider for the current app profile
 *
 * Returns:
 * - NoBillingProvider if billing is disabled
 * - SuperwallProvider if config.billing.provider === "superwall"
 * - StripeProvider if config.billing.provider === "stripe"
 *
 * Provider is cached and reused for the app lifecycle.
 */
export function getBillingProvider(): BillingProvider {
  if (cachedProvider) {
    return cachedProvider;
  }

  const config = getActiveConfig();

  // Check if billing is enabled via feature flag
  const billingEnabled = config.features.billing;
  if (!billingEnabled) {
    logger.log("[Billing] Billing disabled via feature flag");
    cachedProvider = new NoBillingProvider();
    return cachedProvider;
  }

  // Check if billing config exists
  // Hard error in dev to prevent shipping broken monetization
  if (!config.billing) {
    const isDev = config.environment === "dev";

    if (isDev) {
      throw new Error(
        "[Billing] FATAL: Billing feature flag is enabled but no billing config found!\n" +
          "This will break monetization in production.\n" +
          "Either:\n" +
          "  1. Add billing config to your profile (src/config/profiles/)\n" +
          "  2. Disable billing feature flag (features.billing = false)"
      );
    }

    logger.warn(
      "[Billing] Billing enabled but no billing config found, using no-op provider"
    );
    cachedProvider = new NoBillingProvider();
    return cachedProvider;
  }

  // Create provider based on config
  switch (config.billing.provider) {
    case "superwall":
      logger.log("[Billing] Using Superwall provider");
      if (!config.billing.superwall) {
        throw new Error(
          "[Billing] Superwall provider selected but no superwall config found"
        );
      }
      cachedProvider = new SuperwallProvider(config.billing.superwall);
      break;

    case "stripe":
      logger.log("[Billing] Using Stripe provider");
      if (!config.billing.stripe) {
        throw new Error(
          "[Billing] Stripe provider selected but no stripe config found"
        );
      }
      cachedProvider = new StripeProvider(config.billing.stripe);
      break;

    default:
      logger.error(
        "[Billing] Unknown provider:",
        (config.billing as any).provider
      );
      cachedProvider = new NoBillingProvider();
  }

  return cachedProvider;
}

/**
 * Initialize the billing provider
 * Call this early in your app lifecycle (e.g., App.tsx useEffect)
 *
 * @example
 * ```tsx
 * useEffect(() => {
 *   initializeBilling().catch(console.error);
 * }, []);
 * ```
 */
export async function initializeBilling(): Promise<void> {
  try {
    const provider = getBillingProvider();
    await provider.initialize();
    logger.log(`[Billing] ${provider.getProviderName()} initialized`);
  } catch (error) {
    logger.error("[Billing] Initialization failed:", error);
    throw error;
  }
}

/**
 * Reset cached provider (useful for testing)
 * @internal
 */
export function __resetBillingProvider(): void {
  cachedProvider = null;
}

// Export types and providers for testing
export type { BillingProvider, Entitlement, SubscriptionTier } from "./types";
export { NoBillingProvider, StripeProvider, SuperwallProvider };

