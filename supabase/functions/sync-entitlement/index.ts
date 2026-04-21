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
      console.error("[sync-entitlement] REVENUECAT_SECRET_KEY not configured");
      return json({ ok: false, code: "SERVER_MISCONFIGURED" }, 500);
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
    const { data: existing } = await admin
      .from("subscription_state")
      .select(
        "is_active, status, expires_at, product_id, updated_at, last_server_verified_at"
      )
      .eq("user_id", user.id)
      .maybeSingle();

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
          status: existing.status,
          expiresAt: existing.expires_at ?? null,
          productId: existing.product_id ?? null,
          // Return the DB-stored server timestamp, not a new Date()
          lastServerVerifiedAt:
            existing.last_server_verified_at ?? new Date().toISOString(),
          source: "sync_entitlement",
        });
      }
    }

    // ── 3. Query RevenueCat REST API ─────────────────────────────────────────
    // Uses Supabase user.id as the RC app_user_id (set via provider.logIn)
    const rcUrl = `${RC_API_BASE}/subscribers/${encodeURIComponent(user.id)}`;
    const rcRes = await fetch(rcUrl, {
      headers: {
        Authorization: `Bearer ${rcSecretKey}`,
        "Content-Type": "application/json",
        "X-Platform": "ios", // required by RC REST API
      },
    });

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
      return json({
        ok: true,
        cached: false,
        isPro: false,
        status: "free",
        expiresAt: null,
        productId: null,
        lastServerVerifiedAt: verifiedAt,
        source: "sync_entitlement",
      });
    }

    if (!rcRes.ok) {
      const errText = await rcRes.text().catch(() => "");
      console.error(
        `[sync-entitlement] RC API error ${rcRes.status}: ${errText}`
      );
      return json(
        { ok: false, code: "RC_API_ERROR", detail: rcRes.status },
        502
      );
    }

    const rcBody = await rcRes.json();
    const subscriber = rcBody?.subscriber as
      | Record<string, unknown>
      | undefined;

    if (!subscriber) {
      return json({ ok: false, code: "RC_BAD_RESPONSE" }, 502);
    }

    // ── 4. Normalize using shared rules ──────────────────────────────────────
    const normalized = normalizeFromSubscriberResponse(subscriber);

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
      status: normalized.status,
      expiresAt: normalized.expires_at,
      productId: normalized.product_id,
      lastServerVerifiedAt: verifiedAt,
      source: "sync_entitlement",
    });
  } catch (err) {
    console.error("[sync-entitlement] Unexpected error:", err);
    return json({ ok: false, code: "INTERNAL_ERROR" }, 500);
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
    console.error("[sync-entitlement] Upsert failed:", error.message);
    throw error;
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
