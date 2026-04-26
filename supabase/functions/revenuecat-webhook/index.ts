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
 *   - Verified via shared Authorization header (REVENUECAT_WEBHOOK_SECRET)
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

serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    // ── Verify webhook secret ──
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    if (webhookSecret) {
      const authHeader = req.headers.get("Authorization") ?? "";
      // Accept: "Bearer <secret>", or just "<secret>" (RC sends the value as-is)
      const token = authHeader.startsWith("Bearer ")
        ? authHeader.slice(7)
        : authHeader;
      if (!token || token !== webhookSecret) {
        console.error(
          "[rc-webhook] Invalid auth header, got:",
          authHeader.slice(0, 20)
        );
        return json({ error: "Unauthorized" }, 401);
      }
    }

    // ── Parse event ──
    const body = await req.json();
    const event = body?.event;

    if (!event) {
      return json({ error: "Missing event payload" }, 400);
    }

    const eventType = event.type as string;
    const appUserId = event.app_user_id as string;
    const eventId = event.id as string | undefined;

    if (!appUserId) {
      console.error("[rc-webhook] Missing app_user_id in event");
      return json({ error: "Missing app_user_id" }, 400);
    }

    console.log(
      `[rc-webhook] event=${eventType} id=${eventId ?? "none"} user=${appUserId}`
    );

    // ── Handle TEST events ──
    if (eventType === "TEST") {
      console.log("[rc-webhook] TEST event received, acknowledging");
      return json({ ok: true, test: true });
    }

    // ── Resolve Supabase user_id ──
    // Since we use Supabase user_id as RevenueCat app_user_id,
    // app_user_id IS the user_id (UUID format).
    const userId = appUserId;

    // Validate it looks like a UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      // Anon RC ID ($RCAnonymousID:...) — skip webhook, pull-sync handles this
      // on next login via sync-entitlement function.
      console.warn(`[rc-webhook] Non-UUID app_user_id: ${appUserId}, skipping`);
      return json({ ok: true, skipped: true });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    // ── Idempotency: insert event record first ──
    // If event_id already exists (RC retry), return immediately without mutating state.
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
        // Postgres unique violation = duplicate event
        if (insertErr.code === "23505") {
          console.log(`[rc-webhook] Duplicate event_id=${eventId}, skipping`);
          return json({ ok: true, duplicate: true });
        }
        // Non-fatal: log but continue processing
        console.warn(
          "[rc-webhook] Event log insert failed:",
          insertErr.message
        );
      }
    }

    // ── Normalize using shared rules (same logic as sync-entitlement) ──
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

    // For TRANSFER events, capture the previous identity for the audit trail
    const originalAppUserId =
      eventType === "TRANSFER"
        ? ((event.transferred_from as string[] | undefined)?.[0] ?? null)
        : null;

    // ── Upsert subscription_state ──
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
      // FK constraint = user doesn't exist in auth.users yet — not an error
      if (upsertError.message?.includes("violates foreign key constraint")) {
        console.warn(`[rc-webhook] User ${userId} not in auth.users, skipping`);
        return json({ ok: true, skipped: true, reason: "user_not_found" });
      }
      console.error("[rc-webhook] Upsert failed:", upsertError.message);
      return json({ error: "Failed to update subscription state" }, 500);
    }

    // ── Ensure billing_identity_map is populated ──
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
        if (error)
          console.warn(
            "[rc-webhook] billing_identity_map upsert:",
            error.message
          );
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
      "Access-Control-Allow-Origin": "*",
    },
  });
}
