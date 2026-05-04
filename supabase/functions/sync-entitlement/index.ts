// @ts-nocheck
/// <reference lib="deno.ns" />
/**
 * Supabase Edge Function: sync-entitlement
 *
 * Pull-based RC sync. Closes the anonymous-purchase gap that webhooks miss:
 *   1. User purchases while RC is anonymous ($RCAnonymousID:...)
 *   2. Webhook fires under anonymous ID → UUID regex check → SKIPPED
 *   3. provider.logIn(user.id) aliases identity in RC
 *   4. THIS function queries RC REST API with the now-known Supabase user ID
 *   5. Upserts subscription_state with the real premium status
 *
 * Call sites:
 *   - BillingGate: after provider.logIn() resolves on auth state change
 *   - BillingGate: after restorePurchases() resolves
 *   - useFeatureAccess.recheck(): on denial path, one check before showing paywall
 *
 * Rate limiting:
 *   Server-side guard: if subscription_state.updated_at < 60s ago, returns
 *   the cached row without calling the RC API. Prevents overcalling from
 *   rapid auth state changes or accidental loops.
 *
 * Security:
 *   - Requires valid Supabase JWT (verify_jwt = true via config.json)
 *   - RC secret key (REVENUECAT_SECRET_KEY) never leaves this function
 *   - Writes via service_role — client cannot reach subscription_state directly
 */

import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";
import { normalizeFromSubscriberResponse } from "../_shared/entitlement-normalizer.ts";

const CACHE_TTL_SECONDS = 60;
const RC_API_BASE = "https://api.revenuecat.com/v1";

function toClientStatus(status: string, isActive: boolean): string {
  if (!isActive) return "inactive";
  return status;
}

function freeResponse(
  overrides: Partial<Record<string, unknown>> = {}
): Response {
  const verifiedAt = new Date().toISOString();
  return json({
    ok: true,
    cached: false,
    isPro: false,
    is_active: false,
    status: "inactive",
    expiresAt: null,
    productId: null,
    lastServerVerifiedAt: verifiedAt,
    last_server_verified_at: verifiedAt,
    source: "revenuecat_sync_fallback",
    ...overrides,
  });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return json({ ok: true }, 200, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "authorization, content-type",
    });
  }

  if (req.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    // ── 1. Verify user auth ──────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ ok: false, code: "UNAUTHENTICATED" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const rcSecretKey = Deno.env.get("REVENUECAT_SECRET_KEY");

    if (!rcSecretKey) {
      console.error("[sync-entitlement]", {
        step: "load_env",
        userId: null,
        appUserId: null,
        rcStatus: null,
        reason: "REVENUECAT_SECRET_KEY not configured; fail-open to free",
      });
      return freeResponse();
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser(jwt);

    if (userErr || !user) {
      return json({ ok: false, code: "UNAUTHENTICATED" }, 401);
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // ── 2. Rate-limit guard: skip RC API if synced recently ──────────────────
    const { data: existing, error: existingErr } = await admin
      .from("subscription_state")
      .select(
        "is_active, status, expires_at, product_id, updated_at, last_server_verified_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingErr) {
      console.error("[sync-entitlement]", {
        step: "read_subscription_state_cache",
        userId: user.id,
        appUserId: user.id,
        rcStatus: null,
        reason: `Cache read failed: ${existingErr.message}`,
      });
      return freeResponse({ reason: "cache_read_failed" });
    }

    if (existing?.updated_at) {
      const lastSync = new Date(existing.updated_at).getTime();
      const ageSeconds = (Date.now() - lastSync) / 1000;
      if (ageSeconds < CACHE_TTL_SECONDS) {
        console.log(
          `[sync-entitlement] Cache hit for ${user.id} (${Math.round(ageSeconds)}s old)`
        );
        return json({
          ok: true,
          cached: true,
          isPro: existing.is_active === true,
          status: toClientStatus(
            String(existing.status ?? "free"),
            existing.is_active === true
          ),
          is_active: existing.is_active === true,
          expiresAt: existing.expires_at ?? null,
          productId: existing.product_id ?? null,
          // Return the DB-stored server timestamp, not a new Date()
          lastServerVerifiedAt:
            existing.last_server_verified_at ?? new Date().toISOString(),
          last_server_verified_at:
            existing.last_server_verified_at ?? new Date().toISOString(),
          source: "revenuecat_sync",
        });
      }
    }

    // ── 3. Query RevenueCat REST API ─────────────────────────────────────────
    // Uses Supabase user.id as the RC app_user_id (set via provider.logIn)
    const rcUrl = `${RC_API_BASE}/subscribers/${encodeURIComponent(user.id)}`;
    let rcRes: Response;
    try {
      rcRes = await fetch(rcUrl, {
        headers: {
          Authorization: `Bearer ${rcSecretKey}`,
          "Content-Type": "application/json",
          "X-Platform": "ios", // required by RC REST API
        },
      });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.error("[sync-entitlement]", {
        step: "query_revenuecat_subscriber",
        userId: user.id,
        appUserId: user.id,
        rcStatus: null,
        reason: `RevenueCat fetch failed: ${reason.slice(0, 200)}`,
      });
      return freeResponse({ reason: "revenuecat_fetch_failed" });
    }

    if (rcRes.status === 404) {
      // User has no purchase history — upsert as free
      console.log(`[sync-entitlement] No RC subscriber found for ${user.id}`);
      const verifiedAt = new Date().toISOString();
      await upsertSubscriptionState(
        admin,
        user.id,
        {
          status: "free",
          is_active: false,
          entitlement_id: null,
          product_id: null,
          store: null,
          expires_at: null,
          will_renew: false,
        },
        verifiedAt
      );
      return freeResponse({
        status: "inactive",
        lastServerVerifiedAt: verifiedAt,
        last_server_verified_at: verifiedAt,
        source: "revenuecat_sync",
      });
    }

    if (!rcRes.ok) {
      const errText = await rcRes.text().catch(() => "");
      console.error("[sync-entitlement]", {
        step: "query_revenuecat_subscriber",
        userId: user.id,
        appUserId: user.id,
        rcStatus: rcRes.status,
        reason:
          rcRes.status >= 500
            ? "RevenueCat API returned 5xx; fail-open to free"
            : "RevenueCat API returned 4xx; treating user as inactive",
      });
      const verifiedAt = new Date().toISOString();
      await upsertSubscriptionState(
        admin,
        user.id,
        {
          status: "free",
          is_active: false,
          entitlement_id: null,
          product_id: null,
          store: null,
          expires_at: null,
          will_renew: false,
        },
        verifiedAt
      );
      return freeResponse({
        status: "inactive",
        lastServerVerifiedAt: verifiedAt,
        last_server_verified_at: verifiedAt,
        source: "revenuecat_sync",
        rcStatus: rcRes.status,
        reason: errText ? errText.slice(0, 200) : "RevenueCat 4xx",
      });
    }

    let rcBody: Record<string, unknown>;
    try {
      rcBody = (await rcRes.json()) as Record<string, unknown>;
    } catch (err) {
      const rcMessage = err instanceof Error ? err.message : String(err);
      console.error("[sync-entitlement]", {
        step: "parse_revenuecat_json",
        userId: user.id,
        appUserId: user.id,
        rcStatus: rcRes.status,
        reason: `RevenueCat response was not valid JSON: ${rcMessage.slice(0, 200)}`,
      });
      return freeResponse({
        step: "parse_revenuecat_json",
        rcStatus: rcRes.status,
        reason: "RevenueCat response was not valid JSON",
      });
    }
    const subscriber = rcBody?.subscriber as
      | Record<string, unknown>
      | undefined;

    if (!subscriber) {
      // Free user edge case: accept missing/empty subscriber as inactive.
      console.error("[sync-entitlement]", {
        step: "parse_revenuecat_response",
        userId: user.id,
        appUserId: user.id,
        rcStatus: rcRes.status,
        reason: "Missing subscriber field; treating user as inactive",
      });
      const verifiedAt = new Date().toISOString();
      await upsertSubscriptionState(
        admin,
        user.id,
        {
          status: "free",
          is_active: false,
          entitlement_id: null,
          product_id: null,
          store: null,
          expires_at: null,
          will_renew: false,
        },
        verifiedAt
      );
      return freeResponse({
        status: "inactive",
        lastServerVerifiedAt: verifiedAt,
        last_server_verified_at: verifiedAt,
        source: "revenuecat_sync",
      });
    }

    // ── 4. Normalize using shared rules ──────────────────────────────────────
    let normalized: ReturnType<typeof normalizeFromSubscriberResponse>;
    try {
      normalized = normalizeFromSubscriberResponse(subscriber);
    } catch (err) {
      const rcMessage = err instanceof Error ? err.message : String(err);
      console.error("[sync-entitlement]", {
        step: "normalize_revenuecat_entitlement",
        userId: user.id,
        appUserId: user.id,
        rcStatus: rcRes.status,
        reason: `Failed to normalize subscriber payload: ${rcMessage.slice(0, 200)}`,
      });
      return freeResponse({
        step: "normalize_revenuecat_entitlement",
        rcStatus: rcRes.status,
        reason: "Failed to normalize RevenueCat subscriber payload",
      });
    }

    console.log(
      `[sync-entitlement] user=${user.id} status=${normalized.status} is_active=${normalized.is_active}`
    );

    // ── 5. Upsert subscription_state ─────────────────────────────────────────
    const verifiedAt = new Date().toISOString();
    await upsertSubscriptionState(admin, user.id, normalized, verifiedAt);

    return json({
      ok: true,
      cached: false,
      isPro: normalized.is_active,
      is_active: normalized.is_active,
      status: toClientStatus(normalized.status, normalized.is_active),
      expiresAt: normalized.expires_at,
      productId: normalized.product_id,
      lastServerVerifiedAt: verifiedAt,
      last_server_verified_at: verifiedAt,
      source: "revenuecat_sync",
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[sync-entitlement]", {
      step: "unexpected_error",
      userId: null,
      appUserId: null,
      rcStatus: null,
      reason: reason.slice(0, 200),
    });
    return freeResponse({ reason: "unexpected_error" });
  }
});

// ── Helpers ─────────────────────────────────────────────────────────────────

async function upsertSubscriptionState(
  admin: ReturnType<typeof createClient>,
  userId: string,
  normalized: {
    status: string;
    is_active: boolean;
    entitlement_id: string | null;
    product_id: string | null;
    store: string | null;
    expires_at: string | null;
    will_renew: boolean;
  },
  verifiedAt: string
) {
  try {
    const { error } = await admin.from("subscription_state").upsert(
      {
        user_id: userId,
        app_user_id: userId, // Supabase user_id is the RC app_user_id
        status: normalized.status,
        is_active: normalized.is_active,
        entitlement_id: normalized.entitlement_id,
        product_id: normalized.product_id,
        store: normalized.store,
        expires_at: normalized.expires_at,
        will_renew: normalized.will_renew,
        last_server_verified_at: verifiedAt,
        source: "sync_entitlement",
        updated_at: verifiedAt,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("[sync-entitlement]", {
        step: "upsert_subscription_state",
        userId,
        appUserId: userId,
        rcStatus: null,
        reason: `Upsert failed: ${error.message}`,
      });
    }
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[sync-entitlement]", {
      step: "upsert_subscription_state",
      userId,
      appUserId: userId,
      rcStatus: null,
      reason: `Upsert threw: ${reason.slice(0, 200)}`,
    });
  }
}

function json(
  body: Record<string, unknown>,
  status = 200,
  extraHeaders: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
  });
}
