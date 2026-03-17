/**
 * RevenueCat Billing Provider
 * Handles IAP purchases, entitlements, and restore via RevenueCat SDK.
 *
 * RevenueCat manages StoreKit/Google Play purchases, receipt validation,
 * and entitlement status. Superwall can sit on top for paywall UI.
 */

import type { RevenueCatConfig } from "../../config/types";
import { logger } from "../../logging/logger";
import type { BillingProvider, Entitlement, SubscriptionTier } from "./types";

// Lazy-loaded RevenueCat SDK reference
let Purchases: any = null;

function getPurchases() {
  if (!Purchases) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Purchases = require("react-native-purchases").default;
    } catch {
      throw new Error(
        "[RevenueCat] react-native-purchases not installed. Run: npx expo install react-native-purchases"
      );
    }
  }
  return Purchases;
}

export class RevenueCatProvider implements BillingProvider {
  private config: RevenueCatConfig;
  private initialized = false;
  private entitlementCallbacks: ((entitlement: Entitlement) => void)[] = [];

  constructor(config: RevenueCatConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.log("[RevenueCat] Already initialized");
      return;
    }

    try {
      const RC = getPurchases();
      RC.configure({ apiKey: this.config.apiKey });

      // Listen for entitlement changes (purchases, renewals, expirations)
      RC.addCustomerInfoUpdateListener((customerInfo: any) => {
        const entitlement = this.mapCustomerInfo(customerInfo);
        this.entitlementCallbacks.forEach((cb) => cb(entitlement));
      });

      this.initialized = true;
      logger.log("[RevenueCat] Initialized");
    } catch (error) {
      logger.error("[RevenueCat] Initialization failed:", error);
      throw error;
    }
  }

  async getEntitlements(): Promise<Entitlement> {
    if (!this.initialized) {
      throw new Error("[RevenueCat] Must call initialize() first");
    }

    try {
      const RC = getPurchases();
      const customerInfo = await RC.getCustomerInfo();
      return this.mapCustomerInfo(customerInfo);
    } catch (error) {
      logger.error("[RevenueCat] Failed to get entitlements:", error);
      throw error;
    }
  }

  async presentPaywall(_trigger?: string): Promise<void> {
    // When using Superwall alongside RevenueCat, Superwall handles
    // paywall presentation. This method is a no-op in that setup.
    logger.warn(
      "[RevenueCat] presentPaywall called directly — use Superwall for paywall UI"
    );
  }

  onEntitlementsChanged(callback: (entitlement: Entitlement) => void): void {
    this.entitlementCallbacks.push(callback);
  }

  async restorePurchases(): Promise<void> {
    if (!this.initialized) {
      throw new Error("[RevenueCat] Must call initialize() first");
    }

    try {
      logger.log("[RevenueCat] Restoring purchases...");
      const RC = getPurchases();
      const customerInfo = await RC.restorePurchases();
      const entitlement = this.mapCustomerInfo(customerInfo);
      this.entitlementCallbacks.forEach((cb) => cb(entitlement));
      logger.log("[RevenueCat] Purchases restored");
    } catch (error) {
      logger.error("[RevenueCat] Failed to restore purchases:", error);
      throw error;
    }
  }

  getProviderName(): string {
    return "revenueCat";
  }

  /**
   * Map RevenueCat CustomerInfo to our unified Entitlement model.
   *
   * Expects an entitlement named "pro" in your RevenueCat dashboard.
   * Adjust the entitlement key if your setup uses a different name.
   */
  private mapCustomerInfo(customerInfo: any): Entitlement {
    const proEntitlement = customerInfo?.entitlements?.active?.pro;

    if (proEntitlement) {
      return {
        isPro: true,
        tier: this.mapProductToTier(proEntitlement.productIdentifier),
        expiresAt: proEntitlement.expirationDate
          ? new Date(proEntitlement.expirationDate)
          : null,
        isActive: true,
        productId: proEntitlement.productIdentifier,
      };
    }

    return {
      isPro: false,
      tier: "free",
      expiresAt: null,
      isActive: false,
    };
  }

  /**
   * Map RevenueCat product identifier to our tier model.
   */
  private mapProductToTier(productId: string | undefined): SubscriptionTier {
    if (!productId) return "pro";

    const lower = productId.toLowerCase();
    if (lower.includes("enterprise")) return "enterprise";
    if (lower.includes("team")) return "team";
    return "pro";
  }
}
