/**
 * Growth Layer - Factory
 */

import Constants from "expo-constants";
import { getAppConfig } from "../../config";
import { setGrowthClient } from "./growth";
import { NoopGrowthClient } from "./providers/NoopGrowthClient";
import { SupabaseGrowthClient } from "./providers/SupabaseGrowthClient";
import type { GrowthClient } from "./types";

function env(key: string): string | undefined {
  return (
    (Constants.expoConfig?.extra as any)?.[key] ??
    process.env[`EXPO_PUBLIC_${key}`] ??
    undefined
  );
}

let initialized = false;
let resolvedClient: GrowthClient = new NoopGrowthClient();

type GrowthMode =
  | "disabled_by_config"
  | "enabled_missing_backend"
  | "supabase_initialized";

function logMode(mode: GrowthMode): void {
  console.log(`[Growth] mode=${mode}`);
}

export function initGrowth(): GrowthClient {
  if (initialized) return resolvedClient;

  const config = getAppConfig();
  const enabled = !!config.features.growth;

  if (!enabled) {
    resolvedClient = new NoopGrowthClient();
    setGrowthClient(resolvedClient);
    initialized = true;
    logMode("disabled_by_config");
    return resolvedClient;
  }

  const provider = env("GROWTH_PROVIDER");
  if (provider !== "supabase") {
    resolvedClient = new NoopGrowthClient();
    setGrowthClient(resolvedClient);
    initialized = true;
    logMode("enabled_missing_backend");
    return resolvedClient;
  }

  resolvedClient = new SupabaseGrowthClient();
  setGrowthClient(resolvedClient);
  initialized = true;
  logMode("supabase_initialized");
  return resolvedClient;
}

export function resetGrowth(): void {
  resolvedClient = new NoopGrowthClient();
  setGrowthClient(resolvedClient);
  initialized = false;
}
