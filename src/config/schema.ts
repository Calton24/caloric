/**
 * Zod validation schemas for runtime config validation
 * Ensures type safety and provides friendly error messages
 */

import { z } from "zod";

export const AppEnvironmentSchema = z.enum(["dev", "staging", "prod"], {
  message: "APP_ENV must be one of: dev, staging, prod",
});

export const AppProfileSchema = z.enum(["intake", "proxi"], {
  message: "APP_PROFILE must be one of: intake, proxi",
});

export const SupabaseConfigSchema = z.object({
  url: z
    .string()
    .url("Supabase URL must be a valid URL")
    .refine((url) => url.includes("supabase.co"), {
      message: "Supabase URL must be a valid Supabase project URL",
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

export const FeatureFlagsSchema = z.object({
  vision: z.boolean(),
  water: z.boolean(),
  habit: z.boolean(),
  paywall: z.boolean(),
  analytics: z.boolean(),
  notifications: z.boolean(),
  firebaseAnalytics: z.boolean(),
  crashReporting: z.boolean(),
  performanceMonitoring: z.boolean(),
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
  features: FeatureFlagsSchema.partial().optional(),
  app: AppMetadataSchema.partial().optional(),
});

export const AppProfileConfigSchema = z.object({
  supabase: SupabaseConfigSchema,
  firebase: FirebaseConfigSchema.optional(),
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
  features: FeatureFlagsSchema,
  app: AppMetadataSchema,
});

/**
 * Validate and parse config with friendly error messages
 */
export function validateConfig<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context: string,
): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.issues
      .map((err) => `  - ${err.path.join(".")}: ${err.message}`)
      .join("\n");

    throw new Error(
      `❌ Config Validation Error in ${context}:\n${errors}\n\n` +
        `Check your config files and environment variables.`,
    );
  }

  return result.data;
}
