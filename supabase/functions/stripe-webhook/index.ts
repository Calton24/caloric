/// <reference lib="deno.ns" />
/**
 * Supabase Edge Function: Stripe Webhook Handler
 *
 * Receives webhooks from Stripe and updates subscription state in database.
 * This is the ONLY way subscriptions should be updated (not from client).
 *
 * Security:
 * - Signature verification uses raw body (NEVER parsed JSON)
 * - Service role key bypasses RLS for database writes
 * - Returns 200 for unhandled events to prevent Stripe retries
 *
 * Environment variables required:
 * - STRIPE_SECRET_KEY (sk_...)
 * - STRIPE_WEBHOOK_SECRET (whsec_...)
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";
import Stripe from "stripe";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");

  // Validate required headers and config separately for better error messages
  if (!signature) {
    console.error("[Webhook] Missing stripe-signature header");
    return new Response(
      JSON.stringify({ error: "Missing stripe-signature header" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!webhookSecret) {
    console.error(
      "[Webhook] Missing STRIPE_WEBHOOK_SECRET environment variable"
    );
    return new Response(JSON.stringify({ error: "Webhook not configured" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    // CRITICAL: Use raw body text for signature verification (never JSON.parse first)
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );

    console.log(`[Webhook] Processing event: ${event.type} (${event.id})`);

    // Create Supabase client with service role (bypasses RLS)
    // Using 'any' type due to Deno's SupabaseClient generic resolution issues
    // deno-lint-ignore no-explicit-any
    const supabase: any = createClient(supabaseUrl, supabaseServiceKey);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription" && session.subscription) {
          // Fetch full subscription details
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          );
          await upsertSubscription(supabase, subscription);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscription(supabase, subscription);
        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );
          await upsertSubscription(supabase, subscription);
        } else {
          console.log("[Webhook] Invoice without subscription, skipping");
        }
        break;
      }

      default:
        // Log unhandled events but return 200 to prevent Stripe retries
        console.log(`[Webhook] Unhandled event type: ${event.type}`);
    }

    // Always return 200 for successfully parsed events
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Webhook] Error:", error);

    // Determine appropriate status code
    const isMissingDataError =
      error instanceof Error &&
      (error.message.includes("Missing user ID") ||
        error.message.includes("Missing price ID") ||
        error.message.includes("Missing subscription ID"));

    // Return 200 for missing metadata (acknowledge but skip - don't retry forever)
    // Return 400 for signature/other errors (Stripe will retry)
    const status = isMissingDataError ? 200 : 400;

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Webhook handler failed",
        skipped: isMissingDataError,
      }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
});

/**
 * Upsert subscription data into Supabase
 *
 * Validates required metadata before writing. If supabase_user_id is missing,
 * logs error and throws (webhook will return 200 to acknowledge receipt but
 * skip database write - prevents Stripe retry loops for misconfigured subscriptions).
 *
 * @param supabase - Supabase client (typed as 'any' due to Deno generic issues)
 * @param subscription - Stripe Subscription object
 */
// deno-lint-ignore no-explicit-any
async function upsertSubscription(
  supabase: any,
  subscription: Stripe.Subscription
): Promise<void> {
  // Validate subscription ID exists
  if (!subscription.id) {
    console.error("[Webhook] Subscription missing ID, skipping");
    throw new Error("Missing subscription ID");
  }

  // Validate user ID in metadata (REQUIRED for linking to Supabase user)
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) {
    console.error(
      `[Webhook] Missing supabase_user_id in subscription metadata for ${subscription.id}. ` +
        "Ensure your checkout session sets metadata.supabase_user_id"
    );
    throw new Error("Missing user ID in subscription metadata");
  }

  // Validate price ID exists
  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (!priceId) {
    console.error(
      `[Webhook] Missing price ID in subscription ${subscription.id}`
    );
    throw new Error("Missing price ID");
  }

  const subscriptionData = {
    user_id: userId,
    stripe_customer_id: subscription.customer as string,
    stripe_subscription_id: subscription.id,
    stripe_price_id: priceId,
    status: subscription.status,
    current_period_start: new Date(
      subscription.current_period_start * 1000
    ).toISOString(),
    current_period_end: new Date(
      subscription.current_period_end * 1000
    ).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  };

  const { error } = await supabase
    .from("subscriptions")
    .upsert(subscriptionData, {
      onConflict: "stripe_subscription_id",
    });

  if (error) {
    console.error("[Webhook] Database error:", error);
    throw error;
  }

  console.log(
    `[Webhook] Upserted subscription ${subscription.id} for user ${userId} (status: ${subscription.status})`
  );
}
