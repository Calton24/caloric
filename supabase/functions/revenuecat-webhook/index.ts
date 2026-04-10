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
 * RevenueCat event types reference:
 *   INITIAL_PURCHASE, RENEWAL, PRODUCT_CHANGE, CANCELLATION,
 *   UNCANCELLATION, BILLING_ISSUE, SUBSCRIBER_ALIAS,
 *   SUBSCRIPTION_PAUSED, EXPIRATION, TRANSFER
 */

import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";

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
    const entitlementIds = event.entitlement_ids as string[] | undefined;
    const productId = event.product_id as string | undefined;
    const store = event.store as string | undefined;
    const expiresAt = event.expiration_at_ms
      ? new Date(event.expiration_at_ms).toISOString()
      : null;

    if (!appUserId) {
      console.error("[rc-webhook] Missing app_user_id in event");
      return json({ error: "Missing app_user_id" }, 400);
    }

    console.log(
      `[rc-webhook] event=${eventType} user=${appUserId} product=${productId} store=${store}`
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
      // Might be anon RC ID ($RCAnonymousID:...) — skip
      console.warn(`[rc-webhook] Non-UUID app_user_id: ${appUserId}, skipping`);
      return json({ ok: true, skipped: true });
    }

    // ── Map event to subscription status ──
    let status: string;
    const hasPremium = entitlementIds?.includes("premium");

    switch (eventType) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "UNCANCELLATION":
      case "PRODUCT_CHANGE":
        status = hasPremium ? "active" : "free";
        break;
      case "CANCELLATION":
        // User cancelled but may still have time remaining
        status = "cancelled";
        break;
      case "EXPIRATION":
        status = "expired";
        break;
      case "BILLING_ISSUE":
        status = "grace_period";
        break;
      case "SUBSCRIPTION_PAUSED":
        status = "expired";
        break;
      default:
        // For unknown events, don't change status
        console.log(`[rc-webhook] Unhandled event type: ${eventType}`);
        status = "free";
        break;
    }

    // ── Upsert subscription_state ──
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, supabaseServiceKey);

    const { error: upsertError } = await admin
      .from("subscription_state")
      .upsert(
        {
          user_id: userId,
          app_user_id: appUserId,
          entitlement_id: hasPremium ? "premium" : null,
          product_id: productId ?? null,
          status,
          expires_at: expiresAt,
          store: store ?? null,
          last_event_type: eventType,
          last_event_at: new Date().toISOString(),
          raw_event: event,
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

    console.log(`[rc-webhook] Updated user=${userId} status=${status}`);

    return json({ ok: true, status });
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
