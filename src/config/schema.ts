/**
 * Zod validation schemas for runtime config validation
 * Ensures type safety and provides friendly error messages
 */

import { z } from "zod";

export const AppEnvironmentSchema = z.enum(["dev", "staging", "prod"], {
  message: "APP_ENV must be one of: dev, staging, prod",
});

export const AppProfileSchema = z.enum(["intake", "default"], {
  message: "APP_PROFILE must be one of: intake, default",
});

export const SupabaseConfigSchema = z.object({
  url: z
    .string()
    .url("Supabase URL must be a valid URL")
    .refine((url) => url.startsWith("https://"), {
      message: "Supabase URL must use HTTPS for security",
    }),
  anonKey: z
    .string()
    .min(20, "Supabase anon key appears invalid (too short)")
    .refine((key) => !key.includes("service_role"), {
      message:
        "SECURITY ERROR: service_role key detected in client config. Use anon key only!",
    }),
  functionsUrl: z.string().url().optional(),
});

export const FirebaseConfigSchema = z.object({
  ios: z.object({
    googleAppId: z.string().min(1, "Firebase iOS googleAppId is required"),
    gcmSenderId: z.string().min(1, "Firebase iOS gcmSenderId is required"),
    apiKey: z.string().min(1, "Firebase iOS apiKey is required"),
    projectId: z.string().min(1, "Firebase iOS projectId is required"),
    storageBucket: z.string().min(1, "Firebase iOS storageBucket is required"),
    clientId: z.string().optional(),
    bundleId: z.string().min(1, "Firebase iOS bundleId is required"),
  }),
  android: z.object({
    googleAppId: z.string().min(1, "Firebase Android googleAppId is required"),
    apiKey: z.string().min(1, "Firebase Android apiKey is required"),
    projectId: z.string().min(1, "Firebase Android projectId is required"),
    storageBucket: z
      .string()
      .min(1, "Firebase Android storageBucket is required"),
    gcmSenderId: z.string().min(1, "Firebase Android gcmSenderId is required"),
    clientId: z.string().optional(),
    packageName: z.string().min(1, "Firebase Android packageName is required"),
  }),
});

export const SuperwallConfigSchema = z.object({
  apiKey: z.string().min(1, "Superwall API key is required"),
  triggers: z
    .record(z.string(), z.string())
    .optional()
    .describe("Paywall trigger IDs"),
});

export const StripeConfigSchema = z.object({
  publishableKey: z
    .string()
    .min(1, "Stripe publishable key is required")
    .refine((key) => key.startsWith("pk_"), {
      message: "Stripe publishable key must start with 'pk_'",
    })
    .refine((key) => !key.includes("sk_") && !key.includes("rk_"), {
      message:
        "SECURITY ERROR: Stripe secret key detected in client config. Use publishable key only!",
    }),
  mode: z.enum(["checkout", "payment_sheet"], {
    message: "Stripe mode must be 'checkout' or 'payment_sheet'",
  }),
  priceIds: z
    .record(z.string(), z.string())
    .refine((obj) => Object.keys(obj).length > 0, {
      message: "At least one price ID required",
    }),
  defaultPriceId: z.string().optional(),
  successUrl: z.string().url("Success URL must be a valid deep link"),
  cancelUrl: z.string().url("Cancel URL must be a valid deep link"),
});

export const BillingProviderSchema = z.enum(["superwall", "stripe"], {
  message: "Billing provider must be 'superwall' or 'stripe'",
});

export const BillingConfigSchema = z
  .object({
    provider: BillingProviderSchema,
    superwall: SuperwallConfigSchema.optional(),
    stripe: StripeConfigSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.provider === "superwall") {
        return !!data.superwall;
      }
      if (data.provider === "stripe") {
        return !!data.stripe;
      }
      return true;
    },
    {
      message:
        "Billing config must include provider-specific configuration (superwall or stripe)",
    }
  );

// Partial billing config for environment overrides (without refinement)
export const PartialBillingConfigSchema = z
  .object({
    provider: BillingProviderSchema.optional(),
    superwall: SuperwallConfigSchema.optional(),
    stripe: StripeConfigSchema.optional(),
  })
  .optional();

export const FeatureFlagsSchema = z.object({
  vision: z.boolean(),
  water: z.boolean(),
  habit: z.boolean(),
  analytics: z.boolean(),
  notifications: z.boolean(),
  firebaseAnalytics: z.boolean(),
  crashReporting: z.boolean(),
  performanceMonitoring: z.boolean(),
  billing: z.boolean(),
});

export const AppMetadataSchema = z.object({
  name: z.string().min(1, "App name is required"),
  slug: z
    .string()
    .min(1, "App slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  bundleIdentifier: z
    .string()
    .min(1, "Bundle identifier is required")
    .regex(/^[a-z0-9.]+$/, "Bundle identifier must be reverse domain notation"),
  androidPackage: z
    .string()
    .min(1, "Android package is required")
    .regex(/^[a-z0-9.]+$/, "Android package must be reverse domain notation"),
  version: z
    .string()
    .regex(/^\d+\.\d+\.\d+$/, "Version must be semver (e.g., 1.0.0)"),
  scheme: z.string().min(1, "App scheme is required"),
});

export const EnvironmentOverridesSchema = z.object({
  supabase: SupabaseConfigSchema.partial().optional(),
  firebase: FirebaseConfigSchema.partial().optional(),
  billing: PartialBillingConfigSchema,
  features: FeatureFlagsSchema.partial().optional(),
  app: AppMetadataSchema.partial().optional(),
});

export const AppProfileConfigSchema = z.object({
  supabase: SupabaseConfigSchema,
  firebase: FirebaseConfigSchema.optional(),
  billing: BillingConfigSchema.optional(),
  features: FeatureFlagsSchema,
  app: AppMetadataSchema,
  environments: z
    .object({
      dev: EnvironmentOverridesSchema.optional(),
      staging: EnvironmentOverridesSchema.optional(),
      prod: EnvironmentOverridesSchema.optional(),
    })
    .optional(),
});

export const AppConfigSchema = z.object({
  profile: AppProfileSchema,
  environment: AppEnvironmentSchema,
  supabase: SupabaseConfigSchema,
  firebase: FirebaseConfigSchema.optional(),
  billing: BillingConfigSchema.optional(),
  features: FeatureFlagsSchema,
  app: AppMetadataSchema,
});

/**
 * Validate and parse config with friendly error messages
 */
export function validateConfig<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues
      .map((err) => `  - ${err.path.join(".")}: ${err.message}`)
      .join("\n");

    throw new Error(
      `❌ Config Validation Error in ${context}:\n${errors}\n\n` +
        `Check your config files and environment variables.`
    );
  }

  return result.data;
}
