/// <reference lib="deno.ns" />
/**
 * Supabase Edge Function: milestone-insight
 *
 * Generates AI-powered coaching copy for the milestone insight card.
 * Uses OpenAI gpt-4o-mini with structured output.
 *
 * Security:
 *   - OpenAI key stays server-side
 *   - Auth required (JWT)
 *   - Response validated before returning
 *   - Rate limited per user
 */

import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";

// ── Constants ───────────────────────────────────────────────

const OPENAI_TIMEOUT_MS = 15_000;
const RATE_LIMIT_PER_HOUR = 12;

// In-memory rate limiter (per-instance)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// ── CORS headers ────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ── System prompt ───────────────────────────────────────────

const SYSTEM_PROMPT = `You generate short premium in-app coaching copy for a calorie tracking app.
Return only valid JSON matching the supplied schema.
No markdown. No explanation. No extra keys.
Do not use generic motivational garbage.
Do not use clichés like: keep going, you've got this, stay strong, crush your goals, don't give up, believe in yourself.
Title must be concise and mobile-friendly (under 42 characters preferred).
Subtitle must be concise, useful, and grounded in the provided context (under 90 characters preferred).
Do not invent facts not present in the input.
State guidance:
- risk: urgent but calm; user needs a clear protective action. Reference their actual streak count.
- recovery: empathetic and forward-looking; acknowledge the lost streak but motivate restart.
- momentum: user is building consistency; reference actual progress toward next milestone.
- milestone_preview: user is close to a meaningful milestone; make it feel tangible and close.
- milestone_achieved: user hit a meaningful milestone; reward without being sycophantic.`;

const JSON_SCHEMA = {
  name: "milestone_insight_copy",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string" },
      subtitle: { type: "string" },
      chip: { type: ["string", "null"] },
      ctaLabel: { type: ["string", "null"] },
    },
    required: ["title", "subtitle", "chip", "ctaLabel"],
  },
};

// ── Rate limiter ────────────────────────────────────────────

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 3600_000 });
    return true;
  }

  if (entry.count >= RATE_LIMIT_PER_HOUR) return false;
  entry.count++;
  return true;
}

// ── Main handler ────────────────────────────────────────────

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Rate limit
    if (!checkRateLimit(user.id)) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const context = await req.json();

    // Call OpenAI
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "ai_unavailable" }), {
        status: 503,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    const openaiRes = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "developer", content: SYSTEM_PROMPT },
            { role: "user", content: JSON.stringify(context) },
          ],
          response_format: {
            type: "json_schema",
            json_schema: JSON_SCHEMA,
          },
          temperature: 0.7,
          max_tokens: 200,
        }),
      }
    );

    clearTimeout(timeout);

    if (!openaiRes.ok) {
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "empty_response" }), {
        status: 502,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // Parse and return the structured copy
    const parsed = JSON.parse(content);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return new Response(
      JSON.stringify({ error: "internal", detail: message }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }
});
