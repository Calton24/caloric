/**
 * Superwall Billing Provider
 * Wrapper around Superwall SDK for mobile paywalls.
 *
 * Superwall handles paywall UI presentation and A/B testing.
 * It delegates actual purchases to RevenueCat (or StoreKit directly)
 * via the purchase controller configured during Superwall.configure().
 *
 * NOTE: This is a wrapper/adapter only. We test our logic, not Superwall SDK internals.
 */

import type { SuperwallConfig } from "../../config/types";
import { logger } from "../../logging/logger";
import type { BillingProvider, Entitlement, SubscriptionTier } from "./types";

// Lazy-loaded Superwall SDK
let SuperwallSDK: any = null;

function getSuperwall() {
  if (!SuperwallSDK) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      SuperwallSDK =
        require("@superwall/react-native-superwall").default ??
        require("@superwall/react-native-superwall").Superwall;
    } catch {
      logger.warn(
        "[Superwall] @superwall/react-native-superwall not available"
      );
      return null;
    }
  }
  return SuperwallSDK;
}

/**
 * Superwall Provider Implementation
 *
 * This wraps the Superwall SDK and maps their entitlement model to ours.
 * For testing: Mock the Superwall SDK, test our adapter logic only.
 */
export class SuperwallProvider implements BillingProvider {
  private config: SuperwallConfig;
  private initialized = false;
  private entitlementCallbacks: ((entitlement: Entitlement) => void)[] = [];

  constructor(config: SuperwallConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.log("[Superwall] Already initialized");
      return;
    }

    try {
      const SW = getSuperwall();
      if (SW) {
        await SW.configure(this.config.apiKey);
      }

      logger.log(
        "[Superwall] Initialized with API key:",
        this.config.apiKey.substring(0, 10) + "..."
      );

      this.initialized = true;
    } catch (error) {
      logger.error("[Superwall] Initialization failed:", error);
      throw error;
    }
  }

  async getOfferings(): Promise<any> {
    return null;
  }

  async getEntitlements(): Promise<Entitlement> {
    if (!this.initialized) {
      throw new Error("[Superwall] Must call initialize() first");
    }

    try {
      // Superwall delegates entitlement checks to RevenueCat.
      // When used standalone, return free tier — the RevenueCatProvider
      // is the source of truth for entitlements.
      const mockEntitlement: Entitlement = {
        isPro: false,
        tier: "free",
        expiresAt: null,
        isActive: false,
      };

      return mockEntitlement;
    } catch (error) {
      logger.error("[Superwall] Failed to get entitlements:", error);
      throw error;
    }
  }

  async presentPaywall(trigger?: string): Promise<void> {
    if (!this.initialized) {
      throw new Error("[Superwall] Must call initialize() first");
    }

    try {
      const paywallTrigger = trigger || this.getDefaultTrigger();
      logger.log(
        "[Superwall] Presenting paywall with trigger:",
        paywallTrigger
      );

      const SW = getSuperwall();
      if (SW) {
        await SW.register(paywallTrigger);
      }
    } catch (error) {
      logger.error("[Superwall] Failed to present paywall:", error);
      throw error;
    }
  }

  onEntitlementsChanged(callback: (entitlement: Entitlement) => void): void {
    this.entitlementCallbacks.push(callback);
  }

  async restorePurchases(): Promise<void> {
    if (!this.initialized) {
      throw new Error("[Superwall] Must call initialize() first");
    }

    try {
      logger.log("[Superwall] Restoring purchases...");

      const SW = getSuperwall();
      if (SW) {
        await SW.restorePurchases();
      }

      // Notify listeners of potential entitlement change
      await this.notifyEntitlementChange();
    } catch (error) {
      logger.error("[Superwall] Failed to restore purchases:", error);
      throw error;
    }
  }

  getProviderName(): string {
    return "superwall";
  }

  /**
   * Get default trigger from config
   */
  private getDefaultTrigger(): string {
    const triggers = this.config.triggers;
    return triggers?.premium || triggers?.pro || "default_paywall";
  }

  /**
   * Notify all listeners of entitlement change
   */
  private async notifyEntitlementChange(): Promise<void> {
    try {
      const entitlement = await this.getEntitlements();
      this.entitlementCallbacks.forEach((callback) => callback(entitlement));
    } catch (error) {
      console.error("[Superwall] Failed to notify entitlement change:", error);
    }
  }

  /**
   * Map Superwall subscription status to our tier model
   * This is where we adapt Superwall's model to our unified interface
   */
  private mapToTier(superwallStatus: any): SubscriptionTier {
    // TODO: Implement proper mapping based on Superwall's API
    // This will depend on how you configure products in Superwall

    if (!superwallStatus?.isActive) {
      return "free";
    }

    // Map based on product identifier
    const productId = superwallStatus.productId?.toLowerCase() || "";

    if (productId.includes("enterprise")) {
      return "enterprise";
    }
    if (productId.includes("team")) {
      return "team";
    }
    if (productId.includes("pro")) {
      return "pro";
    }

    return "free";
  }
}
