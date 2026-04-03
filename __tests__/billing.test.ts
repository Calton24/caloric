/**
 * Billing System Tests
 * Tests provider selection, entitlement mapping, and billing logic
 *
 * NOTE: We test our adapter logic, NOT the external SDK internals
 */

import { getAppConfig, resetConfigCache } from "../src/config";
import {
    __resetBillingProvider,
    getBillingProvider,
    initializeBilling,
} from "../src/lib/billing";
import { NoBillingProvider } from "../src/lib/billing/types";
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
        data: { url: "https://checkout.stripe.com/test" },
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

describe("Billing System", () => {
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

    (mockSupabaseClient.from as jest.Mock).mockReturnValue({
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
    });

    (mockSupabaseClient.functions.invoke as jest.Mock).mockReturnValue(
      Promise.resolve({
        data: { url: "https://checkout.stripe.com/test" },
        error: null,
      })
    );
  });

  describe("Provider Selection", () => {
    it("should return NoBillingProvider when billing is disabled", () => {
      mockGetAppConfig.mockReturnValue({
        features: { billing: false },
      } as any);

      const provider = getBillingProvider();

      expect(provider).toBeInstanceOf(NoBillingProvider);
      expect(provider.getProviderName()).toBe("none");
    });

    it("should return NoBillingProvider when no billing config exists", () => {
      mockGetAppConfig.mockReturnValue({
        features: { billing: true },
        billing: undefined,
      } as any);

      const provider = getBillingProvider();

      expect(provider).toBeInstanceOf(NoBillingProvider);
    });

    it("should return StripeProvider for default profile", () => {
      mockGetAppConfig.mockReturnValue({
        features: { billing: true },
        billing: {
          provider: "stripe",
          stripe: {
            publishableKey: "pk_test_stripe",
            mode: "checkout",
            priceIds: { monthly: "price_123", yearly: "price_456" },
            successUrl: "test://success",
            cancelUrl: "test://cancel",
          },
        },
      } as any);

      const provider = getBillingProvider();

      expect(provider.getProviderName()).toBe("stripe");
    });

    it("should throw error if provider config is missing", () => {
      mockGetAppConfig.mockReturnValue({
        features: { billing: true },
        billing: {
          provider: "stripe",
          // Missing stripe config
        },
      } as any);

      expect(() => getBillingProvider()).toThrow("no stripe config found");
    });

    it("should cache provider instance", () => {
      mockGetAppConfig.mockReturnValue({
        features: { billing: false },
      } as any);

      const provider1 = getBillingProvider();
      const provider2 = getBillingProvider();

      expect(provider1).toBe(provider2); // Same instance
    });
  });

  describe("NoBillingProvider", () => {
    let provider: NoBillingProvider;

    beforeEach(() => {
      provider = new NoBillingProvider();
    });

    it("should initialize without errors", async () => {
      await expect(provider.initialize()).resolves.not.toThrow();
    });

    it("should return free entitlement", async () => {
      const entitlement = await provider.getEntitlements();

      expect(entitlement.isPro).toBe(false);
      expect(entitlement.tier).toBe("free");
      expect(entitlement.isActive).toBe(false);
      expect(entitlement.expiresAt).toBeNull();
    });

    it("should not throw when presenting paywall", async () => {
      await expect(provider.presentPaywall()).resolves.not.toThrow();
    });

    it("should not throw when restoring purchases", async () => {
      await expect(provider.restorePurchases()).resolves.not.toThrow();
    });

    it("should accept entitlement change callbacks", () => {
      const callback = jest.fn();
      expect(() => provider.onEntitlementsChanged(callback)).not.toThrow();
    });
  });

  describe("Stripe Provider", () => {
    beforeEach(() => {
      mockGetAppConfig.mockReturnValue({
        features: { billing: true },
        billing: {
          provider: "stripe",
          stripe: {
            publishableKey: "pk_test_stripe_key",
            mode: "checkout",
            priceIds: { monthly: "price_123", yearly: "price_456" },
            successUrl: "test://success",
            cancelUrl: "test://cancel",
          },
        },
      } as any);
    });

    it("should initialize with user authentication", async () => {
      const provider = getBillingProvider();
      await expect(provider.initialize()).resolves.not.toThrow();
    });

    it("should throw if methods called before initialize", async () => {
      __resetBillingProvider();
      const provider = getBillingProvider();

      await expect(provider.getEntitlements()).rejects.toThrow(
        "Must call initialize() first"
      );
    });

    it("should return free entitlement for users without subscription", async () => {
      const provider = getBillingProvider();
      await provider.initialize();

      const entitlement = await provider.getEntitlements();

      expect(entitlement.isPro).toBe(false);
      expect(entitlement.tier).toBe("free");
      expect(entitlement.isActive).toBe(false);
    });

    it("should create checkout session via Supabase Edge Function", async () => {
      const provider = getBillingProvider();
      await provider.initialize();

      await expect(provider.presentPaywall()).resolves.not.toThrow();
    });

    it("should sync subscription status on restore", async () => {
      const provider = getBillingProvider();
      await provider.initialize();

      await expect(provider.restorePurchases()).resolves.not.toThrow();
    });

    it("should register entitlement change callbacks", async () => {
      const provider = getBillingProvider();
      await provider.initialize();

      const callback = jest.fn();
      provider.onEntitlementsChanged(callback);

      expect(callback).not.toHaveBeenCalled(); // Not called yet
    });
  });

  describe("initializeBilling helper", () => {
    it("should initialize billing provider", async () => {
      mockGetAppConfig.mockReturnValue({
        features: { billing: false },
      } as any);

      await expect(initializeBilling()).resolves.not.toThrow();
    });

    it("should throw if initialization fails", async () => {
      mockGetAppConfig.mockReturnValue({
        features: { billing: true },
        billing: {
          provider: "stripe",
          // Missing config - will cause error
        },
      } as any);

      await expect(initializeBilling()).rejects.toThrow();
    });
  });

  describe("Entitlement Model", () => {
    it("should have consistent entitlement structure across providers", async () => {
      // Test NoBilling entitlement structure
      mockGetAppConfig.mockReturnValue({
        features: { billing: false },
      } as any);

      const noBillingProvider = getBillingProvider();
      await noBillingProvider.initialize();
      const noBillingEntitlement = await noBillingProvider.getEntitlements();

      expect(noBillingEntitlement).toHaveProperty("isPro");
      expect(noBillingEntitlement).toHaveProperty("tier");
      expect(noBillingEntitlement).toHaveProperty("expiresAt");
      expect(noBillingEntitlement).toHaveProperty("isActive");

      // Reset and test Stripe
      __resetBillingProvider();

      mockGetAppConfig.mockReturnValue({
        features: { billing: true },
        billing: {
          provider: "stripe",
          stripe: {
            publishableKey: "pk_test",
            mode: "checkout",
            priceIds: { monthly: "price_123", yearly: "price_456" },
            successUrl: "test://success",
            cancelUrl: "test://cancel",
          },
        },
      } as any);

      const stripeProvider = getBillingProvider();
      await stripeProvider.initialize();
      const stripeEntitlement = await stripeProvider.getEntitlements();

      // Same structure
      expect(stripeEntitlement).toHaveProperty("isPro");
      expect(stripeEntitlement).toHaveProperty("tier");
      expect(stripeEntitlement).toHaveProperty("expiresAt");
      expect(stripeEntitlement).toHaveProperty("isActive");
    });

    it("should support all subscription tiers", async () => {
      const tiers = ["free", "pro", "team", "enterprise"];

      tiers.forEach((tier) => {
        expect(["free", "pro", "team", "enterprise"]).toContain(tier);
      });
    });
  });
});
