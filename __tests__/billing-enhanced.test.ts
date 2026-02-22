/**
 * Enhanced Billing System Tests - TDD Approach
 * Tests for Stripe entitlement mapping and subscription lifecycle
 */

import { getAppConfig, resetConfigCache } from "../src/config";
import { __resetBillingProvider, getBillingProvider } from "../src/lib/billing";
import { getSupabaseClient } from "../src/lib/supabase";

// Mock the config system
jest.mock("../src/config", () => {
  const actualConfig = jest.requireActual("../src/config");
  return {
    ...actualConfig,
    getAppConfig: jest.fn(),
  };
});

// Mock Supabase
const mockSupabaseClient = {
  auth: {
    getUser: jest.fn(() =>
      Promise.resolve({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      })
    ),
  },
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn(() =>
      Promise.resolve({
        data: null,
        error: { code: "PGRST116" },
      })
    ),
  })),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
  })),
  functions: {
    invoke: jest.fn(() =>
      Promise.resolve({
        data: {
          url: "https://checkout.stripe.com/test",
          sessionId: "cs_test_123",
        },
        error: null,
      })
    ),
  },
};

jest.mock("../src/lib/supabase", () => ({
  getSupabaseClient: jest.fn(() => mockSupabaseClient),
}));

const mockGetAppConfig = getAppConfig as jest.MockedFunction<
  typeof getAppConfig
>;
const mockGetSupabaseClient = getSupabaseClient as jest.MockedFunction<
  typeof getSupabaseClient
>;

describe("Stripe Provider - Enhanced Entitlement Tests", () => {
  beforeEach(() => {
    __resetBillingProvider();
    resetConfigCache();
    jest.clearAllMocks();

    // Restore all Supabase mocks after clearAllMocks
    mockGetSupabaseClient.mockImplementation(() => mockSupabaseClient as any);

    mockSupabaseClient.auth.getUser = jest.fn(() =>
      Promise.resolve({
        data: { user: { id: "test-user-id", email: "test@example.com" } },
        error: null,
      })
    );

    (mockSupabaseClient.channel as jest.Mock).mockReturnValue({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
    });

    (mockSupabaseClient.functions.invoke as jest.Mock).mockReturnValue(
      Promise.resolve({
        data: {
          url: "https://checkout.stripe.com/test",
          sessionId: "cs_test_123",
        },
        error: null,
      })
    );

    // Default config with proper Stripe setup
    mockGetAppConfig.mockReturnValue({
      features: { billing: true },
      billing: {
        provider: "stripe",
        stripe: {
          publishableKey: "pk_test_stripe_key",
          mode: "checkout",
          priceIds: {
            monthly: "price_monthly_123",
            yearly: "price_yearly_456",
            pro: "price_pro_789",
            team: "price_team_012",
          },
          defaultPriceId: "price_monthly_123",
          successUrl: "test://success",
          cancelUrl: "test://cancel",
        },
      },
    } as any);
  });

  describe("Entitlement Mapping", () => {
    it("should return free tier when user has no subscription", async () => {
      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(() =>
          Promise.resolve({
            data: null,
            error: { code: "PGRST116" }, // No rows found
          })
        ),
      });

      const provider = getBillingProvider();
      await provider.initialize();

      const entitlement = await provider.getEntitlements();

      expect(entitlement.isPro).toBe(false);
      expect(entitlement.tier).toBe("free");
      expect(entitlement.isActive).toBe(false);
      expect(entitlement.expiresAt).toBeNull();
    });

    it("should return pro tier for active subscription", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(() =>
          Promise.resolve({
            data: {
              user_id: "test-user-id",
              stripe_subscription_id: "sub_123",
              stripe_price_id: "price_pro_789",
              status: "active",
              current_period_end: futureDate.toISOString(),
            },
            error: null,
          })
        ),
      });

      const provider = getBillingProvider();
      await provider.initialize();

      const entitlement = await provider.getEntitlements();

      expect(entitlement.isPro).toBe(true);
      expect(entitlement.tier).toBe("pro");
      expect(entitlement.isActive).toBe(true);
      expect(entitlement.expiresAt).toEqual(futureDate);
    });

    it("should return team tier for team subscription", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(() =>
          Promise.resolve({
            data: {
              user_id: "test-user-id",
              stripe_subscription_id: "sub_123",
              stripe_price_id: "price_team_012",
              status: "active",
              current_period_end: futureDate.toISOString(),
            },
            error: null,
          })
        ),
      });

      const provider = getBillingProvider();
      await provider.initialize();

      const entitlement = await provider.getEntitlements();

      expect(entitlement.tier).toBe("team");
      expect(entitlement.isPro).toBe(true);
    });

    it("should return free tier for expired subscription", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(() =>
          Promise.resolve({
            data: {
              user_id: "test-user-id",
              stripe_subscription_id: "sub_123",
              stripe_price_id: "price_pro_789",
              status: "active", // Status might still be active until webhook processes
              current_period_end: pastDate.toISOString(),
            },
            error: null,
          })
        ),
      });

      const provider = getBillingProvider();
      await provider.initialize();

      const entitlement = await provider.getEntitlements();

      expect(entitlement.isPro).toBe(false);
      expect(entitlement.tier).toBe("free");
      expect(entitlement.isActive).toBe(false);
    });

    it("should return free tier for canceled subscription", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);

      (mockSupabaseClient.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn(() =>
          Promise.resolve({
            data: {
              user_id: "test-user-id",
              stripe_subscription_id: "sub_123",
              stripe_price_id: "price_pro_789",
              status: "canceled",
              current_period_end: futureDate.toISOString(),
            },
            error: null,
          })
        ),
      });

      const provider = getBillingProvider();
      await provider.initialize();

      const entitlement = await provider.getEntitlements();

      expect(entitlement.isPro).toBe(false);
      expect(entitlement.tier).toBe("free");
      expect(entitlement.isActive).toBe(false);
    });
  });

  describe("Checkout Session Creation", () => {
    it("should create checkout session with monthly price ID from trigger", async () => {
      const provider = getBillingProvider();
      await provider.initialize();

      await provider.presentPaywall("monthly");

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        "create-checkout",
        {
          body: {
            priceId: "price_monthly_123",
            userId: "test-user-id",
            successUrl: "test://success",
            cancelUrl: "test://cancel",
          },
        }
      );
    });

    it("should use default price ID when no trigger specified", async () => {
      const provider = getBillingProvider();
      await provider.initialize();

      await provider.presentPaywall();

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        "create-checkout",
        {
          body: {
            priceId: "price_monthly_123", // defaultPriceId
            userId: "test-user-id",
            successUrl: "test://success",
            cancelUrl: "test://cancel",
          },
        }
      );
    });

    it("should throw error if trigger not found in priceIds", async () => {
      const provider = getBillingProvider();
      await provider.initialize();

      await expect(provider.presentPaywall("unknown_trigger")).rejects.toThrow(
        "No price ID found for trigger: unknown_trigger"
      );
    });

    it("should use first price ID if no default specified", async () => {
      mockGetAppConfig.mockReturnValue({
        features: { billing: true },
        billing: {
          provider: "stripe",
          stripe: {
            publishableKey: "pk_test_stripe_key",
            mode: "checkout",
            priceIds: {
              yearly: "price_yearly_456",
            },
            successUrl: "test://success",
            cancelUrl: "test://cancel",
            // No defaultPriceId
          },
        },
      } as any);

      __resetBillingProvider();
      const provider = getBillingProvider();
      await provider.initialize();

      await provider.presentPaywall();

      expect(mockSupabaseClient.functions.invoke).toHaveBeenCalledWith(
        "create-checkout",
        {
          body: {
            priceId: "price_yearly_456",
            userId: "test-user-id",
            successUrl: "test://success",
            cancelUrl: "test://cancel",
          },
        }
      );
    });
  });
});
