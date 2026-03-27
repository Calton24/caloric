/**
 * RevenueCat Billing Provider
 *
 * Full implementation using:
 *   - react-native-purchases  (SDK core: configure, getCustomerInfo, logIn, logOut, restorePurchases)
 *   - react-native-purchases-ui (Paywall UI + Customer Center)
 *
 * Both modules are lazy-loaded so the provider file can be imported on all
 * platforms without causing a hard crash on web / storybook.
 */

import type { RevenueCatConfig } from "../../config/types";
import { logger } from "../../logging/logger";
import type { BillingProvider, Entitlement, SubscriptionTier } from "./types";

// ─── Lazy module references ─────────────────────────────────────────────────

let _Purchases: any = null;
let _RevenueCatUI: any = null;

function getPurchases() {
  if (!_Purchases) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _Purchases = require("react-native-purchases").default;
    } catch {
      throw new Error(
        "[RevenueCat] react-native-purchases not installed. Run: npx expo install react-native-purchases"
      );
    }
  }
  return _Purchases;
}

function getRevenueCatUI() {
  if (!_RevenueCatUI) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _RevenueCatUI = require("react-native-purchases-ui").default;
    } catch {
      throw new Error(
        "[RevenueCat] react-native-purchases-ui not installed. Run: npx expo install react-native-purchases-ui"
      );
    }
  }
  return _RevenueCatUI;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export class RevenueCatProvider implements BillingProvider {
  private config: RevenueCatConfig;
  private initialized = false;
  private entitlementCallbacks: ((entitlement: Entitlement) => void)[] = [];

  constructor(config: RevenueCatConfig) {
    this.config = config;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.log("[RevenueCat] Already initialized, skipping");
      return;
    }

    try {
      const RC = getPurchases();

      RC.configure({ apiKey: this.config.apiKey });

      // Real-time subscription status updates (renewals, expirations, purchases)
      RC.addCustomerInfoUpdateListener((customerInfo: any) => {
        const entitlement = this.mapCustomerInfo(customerInfo);
        this.entitlementCallbacks.forEach((cb) => cb(entitlement));
      });

      this.initialized = true;
      logger.log("[RevenueCat] Initialized successfully");
    } catch (error) {
      logger.error("[RevenueCat] Initialization failed:", error);
      throw error;
    }
  }

  // ── User identification ─────────────────────────────────────────────────

  /**
   * Identify a logged-in user so purchases are tied to their account.
   * Call this after the user authenticates (use your backend user ID).
   */
  async logIn(userId: string): Promise<void> {
    if (!this.initialized) {
      logger.warn("[RevenueCat] logIn called before initialize, skipping");
      return;
    }
    try {
      const RC = getPurchases();
      const { customerInfo } = await RC.logIn(userId);
      logger.log("[RevenueCat] Logged in:", userId);
      // Emit updated entitlement right away
      const entitlement = this.mapCustomerInfo(customerInfo);
      this.entitlementCallbacks.forEach((cb) => cb(entitlement));
    } catch (error) {
      // Non-fatal — the user can still use the app anonymously
      logger.error("[RevenueCat] logIn failed:", error);
    }
  }

  /**
   * Log out the current user.  Call this when the user signs out so the
   * SDK reverts to an anonymous session.
   */
  async logOut(): Promise<void> {
    if (!this.initialized) return;
    try {
      const RC = getPurchases();
      const isAnonymous = await RC.isAnonymous();
      if (isAnonymous) {
        logger.log("[RevenueCat] Already anonymous, skipping logOut");
        return;
      }
      const customerInfo = await RC.logOut();
      const entitlement = this.mapCustomerInfo(customerInfo);
      this.entitlementCallbacks.forEach((cb) => cb(entitlement));
      logger.log("[RevenueCat] Logged out");
    } catch (error) {
      logger.error("[RevenueCat] logOut failed:", error);
    }
  }

  // ── Entitlements ────────────────────────────────────────────────────────

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

  onEntitlementsChanged(callback: (entitlement: Entitlement) => void): void {
    this.entitlementCallbacks.push(callback);
  }

  // ── Offerings ───────────────────────────────────────────────────────────

  /**
   * Fetch the configured offerings from RevenueCat.
   * Returns null if no offerings are configured yet.
   */
  async getOfferings(): Promise<any> {
    if (!this.initialized) {
      throw new Error("[RevenueCat] Must call initialize() first");
    }
    try {
      const RC = getPurchases();
      const offerings = await RC.getOfferings();
      return offerings;
    } catch (error) {
      logger.error("[RevenueCat] Failed to get offerings:", error);
      throw error;
    }
  }

  // ── Paywall UI ──────────────────────────────────────────────────────────

  /**
   * Presents the RevenueCat-managed paywall UI.
   * The paywall is configured entirely in the RevenueCat dashboard —
   * no code changes required when updating copy, pricing, or layout.
   */
  async presentPaywall(_trigger?: string): Promise<void> {
    try {
      const RCUI = getRevenueCatUI();
      const result = await RCUI.presentPaywall();
      logger.log("[RevenueCat] Paywall closed with result:", result);
    } catch (error) {
      logger.error("[RevenueCat] presentPaywall failed:", error);
      throw error;
    }
  }

  /**
   * Presents the paywall only if the user does not already have the
   * specified entitlement (defaults to "pro").  Useful as a gate
   * before premium features.
   */
  async presentPaywallIfNeeded(requiredEntitlementId = "pro"): Promise<void> {
    try {
      const RCUI = getRevenueCatUI();
      const result = await RCUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: requiredEntitlementId,
      });
      logger.log("[RevenueCat] PaywallIfNeeded result:", result);
    } catch (error) {
      logger.error("[RevenueCat] presentPaywallIfNeeded failed:", error);
      throw error;
    }
  }

  // ── Customer Center ─────────────────────────────────────────────────────

  /**
   * Opens the RevenueCat Customer Center — a native UI that lets users
   * manage their subscriptions, request refunds, and contact support.
   * No custom UI code required.
   */
  async presentCustomerCenter(): Promise<void> {
    try {
      const RCUI = getRevenueCatUI();
      await RCUI.presentCustomerCenter();
      logger.log("[RevenueCat] Customer Center closed");
    } catch (error) {
      logger.error("[RevenueCat] presentCustomerCenter failed:", error);
      throw error;
    }
  }

  // ── Restore ─────────────────────────────────────────────────────────────

  async restorePurchases(): Promise<void> {
    if (!this.initialized) {
      throw new Error("[RevenueCat] Must call initialize() first");
    }
    try {
      const RC = getPurchases();
      logger.log("[RevenueCat] Restoring purchases…");
      const customerInfo = await RC.restorePurchases();
      const entitlement = this.mapCustomerInfo(customerInfo);
      this.entitlementCallbacks.forEach((cb) => cb(entitlement));
      logger.log("[RevenueCat] Purchases restored");
    } catch (error) {
      logger.error("[RevenueCat] Failed to restore purchases:", error);
      throw error;
    }
  }

  // ── Utilities ───────────────────────────────────────────────────────────

  getProviderName(): string {
    return "revenueCat";
  }

  /**
   * Map RevenueCat CustomerInfo → our unified Entitlement model.
   *
   * Looks for an active entitlement named "pro" in the RevenueCat dashboard.
   * If your entitlement has a different identifier, update the key below.
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

  private mapProductToTier(productId: string | undefined): SubscriptionTier {
    if (!productId) return "pro";
    const lower = productId.toLowerCase();
    if (lower.includes("enterprise")) return "enterprise";
    if (lower.includes("team")) return "team";
    return "pro";
  }
}
