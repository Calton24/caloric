/**
 * Billing Types
 * Unified entitlement model across all billing providers
 */

import { logger } from "../../logging/logger";

/**
 * Subscription tier
 */
export type SubscriptionTier = "free" | "pro" | "team" | "enterprise";

/**
 * Entitlement status
 * Represents what the user has access to
 */
export interface Entitlement {
  /** Whether user has any pro features */
  isPro: boolean;
  /** Current subscription tier */
  tier: SubscriptionTier;
  /** Active until (null if free/expired) */
  expiresAt: Date | null;
  /** Whether subscription is currently active */
  isActive: boolean;
  /** Product identifier if subscribed */
  productId?: string;
}

/**
 * Billing Provider Interface
 * All providers must implement this interface
 */
export interface BillingProvider {
  /**
   * Initialize the billing provider
   * Must be called before any other methods
   */
  initialize(): Promise<void>;

  /**
   * Get current user entitlements
   * Returns user's access level and subscription status
   */
  getEntitlements(): Promise<Entitlement>;

  /**
   * Fetch available offerings (products/packages) from the billing provider.
   */
  getOfferings(): Promise<any>;

  /**
   * Present paywall to user
   * @param trigger - Paywall trigger identifier
   */
  presentPaywall(trigger?: string): Promise<boolean | void>;

  /**
   * Register callback for entitlement changes
   * Called when user purchases, restores, or subscription expires
   */
  onEntitlementsChanged(callback: (entitlement: Entitlement) => void): void;

  /**
   * Restore purchases (iOS) or sync with backend
   */
  restorePurchases(): Promise<void>;

  /**
   * Get provider name for debugging
   */
  getProviderName(): string;

  /**
   * Present the Customer Center for subscription management.
   * Supported by RevenueCat — no-op for other providers.
   */
  presentCustomerCenter?(): Promise<void>;

  /**
   * Identify the authenticated user with the billing provider.
   * Call after sign-in so purchases are tied to the user account.
   */
  logIn?(userId: string): Promise<void>;

  /**
   * Log out the current user from the billing provider.
   * Call after sign-out.
   */
  logOut?(): Promise<void>;
}

/**
 * No-op billing provider
 * Used when billing is disabled
 */
export class NoBillingProvider implements BillingProvider {
  async initialize(): Promise<void> {
    logger.log("[Billing] No-op provider initialized (billing disabled)");
  }

  async getEntitlements(): Promise<Entitlement> {
    return {
      isPro: false,
      tier: "free",
      expiresAt: null,
      isActive: false,
    };
  }

  async getOfferings(): Promise<any> {
    return null;
  }

  async presentPaywall(_trigger?: string): Promise<boolean> {
    logger.warn("[Billing] Paywall disabled (billing not enabled)");
    return false;
  }

  onEntitlementsChanged(_callback: (entitlement: Entitlement) => void): void {
    // No-op
  }

  async restorePurchases(): Promise<void> {
    logger.warn("[Billing] Restore disabled (billing not enabled)");
  }

  async presentCustomerCenter(): Promise<void> {
    logger.warn(
      "[Billing] Customer Center not available (billing not enabled)"
    );
  }

  async logIn(_userId: string): Promise<void> {
    /* no-op */
  }

  async logOut(): Promise<void> {
    /* no-op */
  }

  getProviderName(): string {
    return "none";
  }
}
