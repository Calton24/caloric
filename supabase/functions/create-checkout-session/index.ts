/// <reference lib="deno.ns" />
/**
 * Supabase Edge Function: Create Stripe Checkout Session
 *
 * Called by mobile client to initiate subscription purchase.
 * Returns checkout URL for user to complete payment.
 *
 * Environment variables required:
 * - STRIPE_SECRET_KEY (sk_...)
 */

import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";
import Stripe from "stripe";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface CheckoutRequest {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  // userId is always extracted from JWT - never trust client-provided user ID
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
      });
    }

    // Parse request body
    const body: CheckoutRequest = await req.json();
    const { priceId, successUrl, cancelUrl } = body;

    if (!priceId || !successUrl || !cancelUrl) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: priceId, successUrl, cancelUrl",
        }),
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    let customerId: string;

    // Check if user already has a customer ID (stored in user metadata or separate table)
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (existingSub?.stripe_customer_id) {
      customerId = existingSub.stripe_customer_id;
    } else {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id, // Store user ID for webhook processing
      metadata: {
        user_id: user.id,
        price_id: priceId,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    console.error("Checkout session error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
});
