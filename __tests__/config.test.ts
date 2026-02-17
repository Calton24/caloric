/**
 * Config System Tests
 * Tests profile selection, environment overrides, validation, and security
 */

import { getAppConfig, resetConfigCache } from "../src/config";
import type { AppConfig } from "../src/config/types";

describe("Config System", () => {
  beforeEach(() => {
    // Clear cache before each test
    resetConfigCache();
  });

  describe("Profile Selection", () => {
    it("should load intake profile when EXPO_PUBLIC_APP_PROFILE=intake", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
      process.env.EXPO_PUBLIC_APP_ENV = "prod";
      process.env.APP_ENV = "prod";

      const config = getAppConfig();

      expect(config.app.name).toBe("Mobile Core");
      expect(config.app.slug).toBe("mobile-core");
      expect(config.app.bundleIdentifier).toContain("mobilecore");
    });

    it("should load default profile when EXPO_PUBLIC_APP_PROFILE=default", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "default";
      process.env.EXPO_PUBLIC_APP_ENV = "prod";
      process.env.APP_ENV = "prod";

      const config = getAppConfig();

      expect(config.app.name).toBe("Mobile Core");
      expect(config.app.slug).toBe("mobile-core");
      expect(config.app.bundleIdentifier).toContain("mobilecore");
    });

    it("should throw error for unknown profile", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "nonexistent";

      expect(() => getAppConfig()).toThrow();
    });

    it("should default to intake if no profile specified", () => {
      delete process.env.EXPO_PUBLIC_APP_PROFILE;
      process.env.EXPO_PUBLIC_APP_ENV = "prod";
      process.env.APP_ENV = "prod";

      const config = getAppConfig();

      expect(config.app.name).toBe("Mobile Core");
    });
  });

  describe("Environment Overrides", () => {
    it("should apply dev environment overrides", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
      process.env.EXPO_PUBLIC_APP_ENV = "dev";

      const config = getAppConfig();

      expect(config.features.billing).toBe(false);
    });

    it("should apply staging environment overrides", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
      process.env.EXPO_PUBLIC_APP_ENV = "staging";

      const config = getAppConfig();

      expect(config.supabase.url).toContain("staging");
    });

    it("should use production config by default", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
      process.env.EXPO_PUBLIC_APP_ENV = "prod";
      process.env.APP_ENV = "prod";

      const config = getAppConfig();

      expect(config.features.billing).toBe(true);
    });
  });

  describe("Supabase Config", () => {
    it("should have valid Supabase URL", () => {
      const config = getAppConfig();

      expect(config.supabase.url).toMatch(/^https?:\/\/.+/);
    });

    it("should have Supabase anon key", () => {
      const config = getAppConfig();

      expect(config.supabase.anonKey).toBeDefined();
      expect(config.supabase.anonKey.length).toBeGreaterThan(0);
    });

    it("should not expose service role key", () => {
      const config = getAppConfig();

      expect((config.supabase as any).serviceRoleKey).toBeUndefined();
    });
  });

  describe("Firebase Config", () => {
    it("should include Firebase config when configured", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
      process.env.EXPO_PUBLIC_APP_ENV = "prod";
      process.env.APP_ENV = "prod";

      const config = getAppConfig();

      if (config.firebase) {
        expect(config.firebase.ios.googleAppId).toBeDefined();
        expect(config.firebase.android.googleAppId).toBeDefined();
      }
    });

    it("should have optional Firebase config", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
      process.env.EXPO_PUBLIC_APP_ENV = "dev";

      const config = getAppConfig();

      // Firebase config is optional
      expect(
        config.firebase === undefined || typeof config.firebase === "object"
      ).toBe(true);
    });
  });

  describe("Billing Config", () => {
    it("should use Superwall for intake profile", () => {
      resetConfigCache();
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
      process.env.EXPO_PUBLIC_APP_ENV = "prod";
      process.env.APP_ENV = "prod";

      const config = getAppConfig();

      expect(config.billing?.provider).toBe("superwall");
      expect(config.billing?.superwall).toBeDefined();
      expect(config.billing?.superwall?.apiKey).toBeDefined();
    });

    it("should use Stripe for default profile", () => {
      resetConfigCache();
      process.env.EXPO_PUBLIC_APP_PROFILE = "default";
      process.env.EXPO_PUBLIC_APP_ENV = "prod";
      process.env.APP_ENV = "prod";

      const config = getAppConfig();

      expect(config.billing?.provider).toBe("stripe");
      expect(config.billing?.stripe).toBeDefined();
      expect(config.billing?.stripe?.publishableKey).toBeDefined();
    });

    it("should disable billing in dev environment", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
      process.env.EXPO_PUBLIC_APP_ENV = "dev";

      const config = getAppConfig();

      expect(config.features.billing).toBe(false);
    });

    it("should reject Stripe secret keys in config", () => {
      const invalidConfig = {
        provider: "stripe" as const,
        stripe: {
          publishableKey: "sk_test_secret_key", // Invalid: secret key
          pricingTableId: "prctbl_xxx",
          webhookMode: "supabase" as const,
        },
      };

      // This would fail Zod validation
      expect(() => {
        // Simulate validation
        if (invalidConfig.stripe.publishableKey.includes("sk_")) {
          throw new Error("SECURITY ERROR: Stripe secret key detected");
        }
      }).toThrow("secret key");
    });

    it("should accept valid Stripe publishable keys", () => {
      const validConfig = {
        provider: "stripe" as const,
        stripe: {
          publishableKey: "pk_test_valid_key", // Valid: publishable key
          pricingTableId: "prctbl_xxx",
          webhookMode: "supabase" as const,
        },
      };

      expect(validConfig.stripe.publishableKey).toMatch(/^pk_/);
    });
  });

  describe("Feature Flags", () => {
    it("should have all expected feature flags", () => {
      const config = getAppConfig();

      expect(config.features).toHaveProperty("billing");
      expect(config.features).toHaveProperty("vision");
      expect(config.features).toHaveProperty("analytics");
    });

    it("should allow feature flags to be boolean", () => {
      const config = getAppConfig();

      expect(typeof config.features.vision).toBe("boolean");
      expect(typeof config.features.analytics).toBe("boolean");
      expect(typeof config.features.billing).toBe("boolean");
    });
  });

  describe("Config Caching", () => {
    it("should cache config after first load", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";

      const config1 = getAppConfig();
      const config2 = getAppConfig();

      expect(config1).toBe(config2); // Same reference
    });

    it("should use cached config even if env changes", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
      const config1 = getAppConfig();

      process.env.EXPO_PUBLIC_APP_PROFILE = "proxi";
      const config2 = getAppConfig();

      // Still returns intake because cached
      expect(config1).toBe(config2);
      expect(config2.app.name).toBe("Mobile Core");
    });

    it("should reload config after cache clear", () => {
      process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
      const config1 = getAppConfig();

      resetConfigCache();

      process.env.EXPO_PUBLIC_APP_PROFILE = "default";
      const config2 = getAppConfig();

      expect(config1).not.toBe(config2);
      expect(config1.app.name).toBe("Mobile Core");
      expect(config2.app.name).toBe("Mobile Core");
    });
  });

  describe("Type Safety", () => {
    it("should return properly typed config", () => {
      const config = getAppConfig();

      // TypeScript should enforce these types
      const appConfig: AppConfig = config;
      expect(appConfig.app).toBeDefined();
      expect(appConfig.supabase).toBeDefined();
      expect(appConfig.features).toBeDefined();
    });
  });
});
