/**
 * Stripe Billing Provider
 * Client-side Stripe integration via Supabase Edge Functions
 *
 * SECURITY: This is client-side only. All Stripe secret operations
 * (checkout session creation, webhook handling) happen in Supabase Edge Functions.
 *
 * Mobile app only uses publishable key (pk_*).
 */

import type { StripeConfig } from "../../config/types";
import { logger } from "../../logging/logger";
import { getSupabaseClient } from "../supabase";
import type { BillingProvider, Entitlement, SubscriptionTier } from "./types";

/**
 * Stripe Provider Implementation
 *
 * This provider uses Supabase Edge Functions as a proxy for Stripe operations.
 * The mobile app never touches Stripe secret keys.
 *
 * Flow:
 * 1. App calls Edge Function to create checkout session
 * 2. Edge Function uses Stripe secret key (server-side)
 * 3. App opens checkout URL in browser
 * 4. Stripe webhook → Supabase Edge Function → Database update
 * 5. App polls/listens for subscription status in database
 */
export class StripeProvider implements BillingProvider {
  private config: StripeConfig;
  private initialized = false;
  private entitlementCallbacks: ((entitlement: Entitlement) => void)[] = [];
  private userId: string | null = null;

  constructor(config: StripeConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.log("[Stripe] Already initialized");
      return;
    }

    try {
      const supabase = getSupabaseClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("[Stripe] User must be authenticated");
      }

      this.userId = user.id;
      logger.log("[Stripe] Initialized for user:", user.id);

      // Set up real-time listener for subscription changes
      this.setupSubscriptionListener();

      this.initialized = true;
    } catch (error) {
      logger.error("[Stripe] Initialization failed:", error);
      throw error;
    }
  }

  async getEntitlements(): Promise<Entitlement> {
    if (!this.initialized) {
      throw new Error("[Stripe] Must call initialize() first");
    }

    try {
      const supabase = getSupabaseClient();

      // Query subscription status from database
      // Subscriptions are kept in sync via Stripe webhooks
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", this.userId)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found (user has no subscription)
        throw error;
      }

      // No subscription found - return free tier
      if (!data) {
        return {
          isPro: false,
          tier: "free",
          expiresAt: null,
          isActive: false,
        };
      }

      // Check if subscription is active
      const isActive = data.status === "active" || data.status === "trialing";
      const expiresAt = data.current_period_end
        ? new Date(data.current_period_end)
        : null;

      // Check if subscription has expired
      const now = new Date();
      const hasExpired = expiresAt ? expiresAt < now : false;

      if (!isActive || hasExpired) {
        return {
          isPro: false,
          tier: "free",
          expiresAt,
          isActive: false,
        };
      }

      // Map price ID to tier
      const tier = this.mapPriceIdToTier(data.stripe_price_id);

      return {
        isPro: tier !== "free",
        tier,
        expiresAt,
        isActive: true,
        productId: data.stripe_price_id,
      };
    } catch (error) {
      logger.error("[Stripe] Failed to get entitlements:", error);
      throw error;
    }
  }

  /**
   * Map Stripe price ID to subscription tier
   */
  private mapPriceIdToTier(priceId: string): SubscriptionTier {
    // Find which config key maps to this price ID
    for (const [key, configPriceId] of Object.entries(this.config.priceIds)) {
      if (configPriceId === priceId) {
        // Map common tier names
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes("enterprise")) return "enterprise";
        if (lowerKey.includes("team")) return "team";
        if (lowerKey.includes("pro") || lowerKey.includes("premium"))
          return "pro";
      }
    }

    // Default to pro if we have an active subscription but don't recognize the tier
    return "pro";
  }

  async presentPaywall(trigger?: string): Promise<void> {
    if (!this.initialized) {
      throw new Error("[Stripe] Must call initialize() first");
    }

    try {
      // Get price ID from trigger or use default
      const priceId = trigger
        ? this.config.priceIds[trigger]
        : this.config.defaultPriceId || Object.values(this.config.priceIds)[0];

      if (!priceId) {
        throw new Error(
          `[Stripe] No price ID found for trigger: ${trigger}. ` +
            `Available triggers: ${Object.keys(this.config.priceIds).join(", ")}`
        );
      }

      logger.log("[Stripe] Creating checkout session for price:", priceId);

      // Create checkout session via Supabase Edge Function
      // Webhooks are handled by Supabase (mobile apps cannot be webhook endpoints)
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.functions.invoke(
        "create-checkout",
        {
          body: {
            priceId,
            userId: this.userId,
            successUrl: this.config.successUrl,
            cancelUrl: this.config.cancelUrl,
          },
        }
      );

      if (error) throw error;

      // Open checkout URL
      const checkoutUrl = data.url;
      logger.log("[Stripe] Checkout URL:", checkoutUrl);

      // TODO: Open checkout URL in browser
      // await openBrowserAsync(checkoutUrl);
    } catch (error) {
      logger.error("[Stripe] Failed to present paywall:", error);
      throw error;
    }
  }

  onEntitlementsChanged(callback: (entitlement: Entitlement) => void): void {
    this.entitlementCallbacks.push(callback);
  }

  async restorePurchases(): Promise<void> {
    if (!this.initialized) {
      throw new Error("[Stripe] Must call initialize() first");
    }

    try {
      logger.log("[Stripe] Syncing subscription status...");

      // Fetch latest entitlements from database
      // Stripe webhook already updated database
      const entitlement = await this.getEntitlements();

      // Notify listeners
      this.entitlementCallbacks.forEach((callback) => callback(entitlement));

      logger.log("[Stripe] Subscription synced");
    } catch (error) {
      logger.error("[Stripe] Failed to restore purchases:", error);
      throw error;
    }
  }

  getProviderName(): string {
    return "stripe";
  }

  /**
   * Set up real-time listener for subscription changes
   */
  private setupSubscriptionListener(): void {
    if (!this.userId) return;

    const supabase = getSupabaseClient();

    supabase
      .channel(`subscriptions:${this.userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${this.userId}`,
        },
        async (payload) => {
          logger.log("[Stripe] Subscription changed:", payload);

          // Fetch updated entitlements
          const entitlement = await this.getEntitlements();

          // Notify all listeners
          this.entitlementCallbacks.forEach((callback) =>
            callback(entitlement)
          );
        }
      )
      .subscribe();
  }
}
