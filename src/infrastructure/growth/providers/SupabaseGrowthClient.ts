/**
 * SupabaseGrowthClient
 * Stores feature requests in Supabase via Edge Function (default) or direct insert.
 *
 * 🔒 SECURITY — Edge Function Default (recommended)
 *   By default, requests go through `submit-feature-request` Edge Function which:
 *   - Rate-limits per IP and per user_id (e.g., 5 req/min)
 *   - Validates/sanitizes payload server-side
 *   - Strips unexpected fields before inserting
 *   - Returns 429 on abuse instead of silently inserting
 *
 *   Edge Function path: supabase/functions/submit-feature-request/index.ts
 *
 * ⚠️ UNSAFE MODE — Direct Client Insert (opt-in only)
 *   Set `features.allowUnsafeClientWrites = true` in your profile to use direct insert.
 *   Client-side cooldown/dedup are convenience guards only.
 *
 *   **What RLS does:**
 *     - Prevents user_id spoofing (INSERT WITH CHECK on auth.uid())
 *     - Prevents reading other users' requests
 *
 *   **What RLS does NOT do:**
 *     - Rate limit requests (a bot can flood thousands of rows)
 *     - Validate payload content (data poisoning)
 *     - Protect against denial-of-wallet (Supabase bills by row count)
 *
 *   RLS Policy Required:
 *     CREATE POLICY "Users can insert their own requests"
 *       ON feature_requests FOR INSERT
 *       WITH CHECK (
 *         user_id IS NULL                    -- allow anonymous
 *         OR user_id = auth.uid()::text      -- enforce match for logged-in
 *       );
 */

import Constants from "expo-constants";
import { Platform } from "react-native";
import { getAppConfig } from "../../../config";
import { getSupabaseClient } from "../../../lib/supabase";
import { analytics } from "../../analytics/analytics";
import { getStorage } from "../../storage";
import { getGrowthAnonId } from "../anonId";
import { getGrowthScreen } from "../growthContext";
import type {
    FeatureRequestInput,
    GrowthClient,
    GrowthMilestoneType,
} from "../types";
import {
    DEDUPE_WINDOW_MS,
    GrowthRequestError,
    getCooldownRemainingMs,
    getDedupeHash,
    isWithinWindow,
} from "../utils";

const COOLDOWN_KEY = "growth:last_submit_at";
const DEDUPE_KEY_PREFIX = "growth:dedupe:";

function parseStoredNumber(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildInfo() {
  const config = getAppConfig();
  const version = Constants.expoConfig?.version ?? config.app.version;
  const buildNumber =
    Platform.OS === "ios"
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();

  return {
    version,
    buildNumber: buildNumber ?? "0",
    platform: Platform.OS === "ios" ? "ios" : "android",
  } as const;
}

export class SupabaseGrowthClient implements GrowthClient {
  readonly kind = "supabase" as const;
  private userId: string | null = null;

  setUser(user: { userId: string } | null): void {
    this.userId = user?.userId ?? null;
  }

  track(event: string, props?: Record<string, unknown>): void {
    analytics.track(event, { ...props, source: "growth" });
  }

  milestone(type: GrowthMilestoneType, props?: Record<string, unknown>): void {
    analytics.track("growth_milestone", { type, ...props });
  }

  async requestFeature(input: FeatureRequestInput): Promise<void> {
    const title = input.title?.trim() ?? "";
    if (!title) {
      throw new GrowthRequestError("invalid_title", "Title is required.");
    }

    const storage = getStorage();
    const now = Date.now();

    const lastSubmitAt = parseStoredNumber(await storage.getItem(COOLDOWN_KEY));
    const cooldownRemaining = getCooldownRemainingMs(lastSubmitAt, now);
    if (cooldownRemaining > 0) {
      throw new GrowthRequestError(
        "cooldown",
        "Please wait a moment before submitting another request."
      );
    }

    const anonId = await getGrowthAnonId();
    const dedupeHash = getDedupeHash(title, anonId);
    const lastDedupeAt = parseStoredNumber(
      await storage.getItem(`${DEDUPE_KEY_PREFIX}${dedupeHash}`)
    );

    if (isWithinWindow(lastDedupeAt, now, DEDUPE_WINDOW_MS)) {
      throw new GrowthRequestError(
        "duplicate",
        "Looks like you already sent this request recently."
      );
    }

    const config = getAppConfig();
    const screen = getGrowthScreen() ?? undefined;
    const build = buildInfo();

    const payload = {
      app_profile: config.profile,
      anon_id: anonId,
      user_id: this.userId,
      title,
      description: input.description?.trim() || null,
      category: input.category ?? null,
      severity: input.severity ?? null,
      screen,
      platform: build.platform,
      app_version: build.version,
      build_number: build.buildNumber,
      dedupe_hash: dedupeHash,
      meta: {
        source: "growth_layer",
      },
    };

    const client = getSupabaseClient();

    // SECURITY: Use Edge Function by default for server-side rate limiting.
    // Direct insert only allowed when explicitly opted in via allowUnsafeClientWrites.
    if (config.features.allowUnsafeClientWrites) {
      // Direct insert — only for internal/dev builds not facing public traffic
      const { error } = await client.from("feature_requests").insert(payload);
      if (error) {
        throw new GrowthRequestError("unknown", error.message);
      }
    } else {
      // Edge Function — rate-limited, validated server-side (recommended)
      const { error } = await client.functions.invoke(
        "submit-feature-request",
        {
          body: payload,
        }
      );
      if (error) {
        throw new GrowthRequestError("unknown", error.message);
      }
    }

    await storage.setItem(COOLDOWN_KEY, now.toString());
    await storage.setItem(`${DEDUPE_KEY_PREFIX}${dedupeHash}`, now.toString());

    analytics.track("feature_requested", {
      title,
      category: input.category,
      severity: input.severity,
      screen,
      appProfile: config.profile,
    });
  }
}
