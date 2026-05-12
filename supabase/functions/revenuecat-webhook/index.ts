/// <reference lib="deno.ns" />
/**
 * Supabase Edge Function: revenuecat-webhook
 *
 * Keeps subscription_state in sync with RevenueCat.
 * RevenueCat fires webhooks for purchases, renewals, cancellations, expirations.
 *
 * Identity:
 *   We use Supabase user_id as the RevenueCat app_user_id.
 *   On app sign-in: Purchases.logIn(supabaseUser.id)
 *   So webhook payload.app_user_id maps directly to subscription_state.user_id.
 *
 * Security:
 *   - This function MUST be deployed with JWT verification OFF for the
 *     **remote** function (RevenueCat sends a shared secret, not a Supabase JWT).
 *     Run: `npm run supabase:deploy:revenuecat-webhook` (see package.json).
 *     `supabase/config.toml` sets verify_jwt = false; the CLI flag is still
 *     required so Supabase Gateway updates an already-published function.
 *   - Verified via REVENUECAT_WEBHOOK_SECRET or REVENUECAT_WEBHOOK_AUTH (alias).
 *   - service_role client bypasses RLS for writes
 *   - Client has NO write access to subscription_state
 *
 * Idempotency:
 *   Inserts event_id into revenuecat_webhook_events first.
 *   Duplicate event_id (RC retry) → returns 200 immediately, no DB mutation.
 *
 * RevenueCat event types reference:
 *   INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE, CANCELLATION,
 *   UNCANCELLATION, BILLING_ISSUE, SUBSCRIBER_ALIAS,
 *   SUBSCRIPTION_PAUSED, EXPIRATION, TRANSFER
 */

import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";
import { normalizeFromWebhookEvent } from "../_shared/entitlement-normalizer.ts";

/** Strip optional "Bearer " prefix for comparison (RC may send either form). */
function normalizeBearerToken(value: string | null | undefined): string {
  const v = (value ?? "").trim();
  if (!v) return "";
  return v.toLowerCase().startsWith("bearer ") ? v.slice(7).trim() : v;
}

function getExpectedWebhookToken(): string {
  const secret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
  const auth = Deno.env.get("REVENUECAT_WEBHOOK_AUTH");
  return normalizeBearerToken(secret ?? auth ?? "");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const expectedToken = getExpectedWebhookToken();
  if (!expectedToken) {
    console.error(
      "[rc-webhook] Missing REVENUECAT_WEBHOOK_SECRET (or REVENUECAT_WEBHOOK_AUTH)"
    );
    return json({ error: "server_misconfigured" }, 503);
  }

  const authHeader =
    req.headers.get("Authorization") ?? req.headers.get("authorization") ?? "";
  const receivedToken = normalizeBearerToken(authHeader);
  if (receivedToken !== expectedToken) {
    console.error("[rc-webhook] Invalid Authorization header", {
      hasAuth: Boolean(authHeader),
      prefix: authHeader.slice(0, 16),
    });
    return json({ error: "Unauthorized" }, 401);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch (e) {
    console.error("[rc-webhook] Invalid JSON body", e);
    return json({ error: "invalid_json" }, 400);
  }

  const event = body?.event as Record<string, unknown> | undefined;
  if (!event || typeof event !== "object") {
    return json({ error: "missing_event" }, 400);
  }

  const eventType = event.type as string;
  const eventId = event.id as string | undefined;
  const appUserId =
    (event.app_user_id as string | undefined) ??
    (event.original_app_user_id as string | undefined);

  if (!appUserId) {
    console.warn("[rc-webhook] Missing app_user_id — acknowledge without retry");
    return json({ ok: true, ignored: "missing_app_user_id" }, 200);
  }

  console.log(
    `[rc-webhook] event=${eventType} id=${eventId ?? "none"} user=${appUserId}`
  );

  if (eventType === "TEST") {
    console.log("[rc-webhook] TEST event received, acknowledging");
    return json({ ok: true, test: true });
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const userId = appUserId;
  if (!uuidRegex.test(userId)) {
    console.warn(`[rc-webhook] Non-UUID app_user_id: ${appUserId}, skipping`);
    return json({ ok: true, skipped: true, reason: "non_uuid_app_user_id" }, 200);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("[rc-webhook] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return json({ error: "server_misconfigured" }, 503);
  }

  const admin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    if (eventId) {
      const { error: insertErr } = await admin
        .from("revenuecat_webhook_events")
        .insert({
          event_id: eventId,
          user_id: userId,
          event_type: eventType,
          app_user_id: appUserId,
          raw_payload: event,
        });

      if (insertErr) {
        if (insertErr.code === "23505") {
          console.log(`[rc-webhook] Duplicate event_id=${eventId}, skipping`);
          return json({ ok: true, duplicate: true });
        }
        console.warn("[rc-webhook] Event log insert failed:", insertErr.message);
      }
    }

    const normalized = normalizeFromWebhookEvent({
      type: eventType,
      entitlement_ids: event.entitlement_ids as string[] | undefined,
      product_id: event.product_id as string | undefined,
      store: event.store as string | undefined,
      expiration_at_ms: event.expiration_at_ms as number | undefined,
      grace_period_expiration_at_ms: event.grace_period_expiration_at_ms as
        | number
        | undefined,
      will_renew: event.will_renew as boolean | undefined,
      transferred_from: event.transferred_from as string[] | undefined,
    });

    const originalAppUserId =
      eventType === "TRANSFER"
        ? ((event.transferred_from as string[] | undefined)?.[0] ?? null)
        : null;

    const { error: upsertError } = await admin
      .from("subscription_state")
      .upsert(
        {
          user_id: userId,
          app_user_id: appUserId,
          original_app_user_id: originalAppUserId,
          entitlement_id: normalized.entitlement_id,
          product_id: normalized.product_id,
          status: normalized.status,
          is_active: normalized.is_active,
          expires_at: normalized.expires_at,
          will_renew: normalized.will_renew,
          store: normalized.store,
          last_event_type: eventType,
          last_event_id: eventId ?? null,
          last_event_at: new Date().toISOString(),
          raw_event: event,
          last_server_verified_at: new Date().toISOString(),
          source: "webhook",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (upsertError) {
      if (upsertError.message?.includes("violates foreign key constraint")) {
        console.warn(`[rc-webhook] User ${userId} not in auth.users, skipping`);
        return json({ ok: true, skipped: true, reason: "user_not_found" }, 200);
      }
      console.error("[rc-webhook] Upsert failed:", upsertError.message);
      return json({ error: "Failed to update subscription state" }, 500);
    }

    await admin
      .from("billing_identity_map")
      .upsert(
        {
          user_id: userId,
          revenuecat_app_user_id: appUserId,
        },
        { onConflict: "user_id" }
      )
      .then(({ error }) => {
        if (error) {
          console.warn("[rc-webhook] billing_identity_map upsert:", error.message);
        }
      });

    console.log(
      `[rc-webhook] Updated user=${userId} status=${normalized.status} is_active=${normalized.is_active}`
    );

    return json({
      ok: true,
      status: normalized.status,
      is_active: normalized.is_active,
    });
  } catch (err) {
    console.error("[rc-webhook] Unexpected error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}
