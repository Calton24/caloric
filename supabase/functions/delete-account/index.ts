/// <reference lib="deno.ns" />
/**
 * Supabase Edge Function: delete-account
 *
 * Security model:
 * - Requires valid caller JWT (user identity comes from token, not request body)
 * - Uses service role key ONLY server-side
 * - Deletes user-owned application data first, then auth user
 */

import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

type DeleteResult = { ok: true } | { ok: false; table: string; message: string };

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function isMissingTableError(error: unknown): boolean {
  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message: unknown }).message).toLowerCase()
      : "";
  return message.includes("could not find the table") || message.includes("does not exist");
}

async function deleteRowsByUserId(
  adminClient: ReturnType<typeof createClient>,
  table: string,
  userId: string
): Promise<DeleteResult> {
  const { error } = await adminClient.from(table).delete().eq("user_id", userId);
  if (!error) return { ok: true };
  if (isMissingTableError(error)) {
    console.warn("[DeleteAccount] missing table skipped", { table });
    return { ok: true };
  }
  return { ok: false, table, message: error.message };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ ok: false, error: "UNAUTHORIZED" }, 401);

  try {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return json({ ok: false, error: "UNAUTHORIZED" }, 401);
    }

    // Delete app-owned user data first (avoid partial state where auth user is
    // removed while rows remain). Order is child -> parent where relevant.
    const deleteOrder = [
      "vision_item_corrections",
      "food_scan_corrections",
      "food_scan_reports",
      "food_scan_events",
      "ai_usage_events",
      "billing_identity_map",
      "usage_state",
      "subscription_state",
      "subscriptions",
      "profiles",
      "user_challenges",
      "daily_log_dates",
      "user_streaks",
      "user_goals",
      "weight_logs",
      "meal_entries",
      "user_profiles",
      "notes",
      "food_cache",
      "scan_feedback",
    ] as const;

    for (const table of deleteOrder) {
      const result = await deleteRowsByUserId(adminClient, table, user.id);
      if (!result.ok) {
        console.error("[DeleteAccount] table delete failed", {
          userId: user.id,
          table: result.table,
          message: result.message,
        });
        return json(
          { ok: false, error: "DATA_DELETE_FAILED", table: result.table },
          500
        );
      }
    }

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(
      user.id,
      false
    );
    if (authDeleteError) {
      console.error("[DeleteAccount] auth delete failed", {
        userId: user.id,
        message: authDeleteError.message,
      });
      return json({ ok: false, error: "AUTH_DELETE_FAILED" }, 500);
    }

    return json({ ok: true }, 200);
  } catch (error) {
    console.error("[DeleteAccount] unexpected failure", {
      message: error instanceof Error ? error.message : String(error),
    });
    return json({ ok: false, error: "INTERNAL_SERVER_ERROR" }, 500);
  }
});
