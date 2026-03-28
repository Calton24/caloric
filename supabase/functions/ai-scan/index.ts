/// <reference lib="deno.ns" />
/**
 * Supabase Edge Function: ai-scan
 *
 * THE SINGLE CHOKE POINT for all AI spend.
 *
 * What this function does (in order):
 *   1. Verify user auth (JWT)
 *   2. Load profile + block status
 *   3. Load subscription state (from RevenueCat webhook mirror)
 *   4. Load / reset daily quota
 *   5. Decide if scan is allowed
 *   6. If allowed, decrement quota (free users only)
 *   7. Call AI vendor (gpt-4o-mini)
 *   8. Write audit event
 *   9. Return result
 *
 * Security:
 *   - OpenAI key stays server-side (NEVER in client)
 *   - Credits are decremented server-side with optimistic concurrency
 *   - service_role client bypasses RLS for writes (as intended by Supabase)
 *   - Client can NEVER call OpenAI directly
 *
 * Abuse protections:
 *   - Max image size: 4MB
 *   - Rate limit: 10 req/min per user (in-memory)
 *   - Image SHA-256 hash for replay detection
 *   - Per-user cooldown: 10s between scans
 *   - Blocked user rejection
 *   - Unauthenticated rejection
 */

import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB
const OPENAI_TIMEOUT_MS = 30_000;
const RATE_LIMIT_PER_MINUTE = 10;
const COOLDOWN_MS = 10_000; // 10 seconds between scans

// In-memory rate limiter (per-instance, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const lastScanMap = new Map<string, number>();

// ─── Types ──────────────────────────────────────────────────────────────────

type ScanResponse = {
  ok: boolean;
  code?: string;
  message?: string;
  data?: unknown;
};

// ─── Structured Output Schema (same as analyze-meal) ────────────────────────

const MEAL_DECOMPOSITION_SCHEMA = {
  type: "object",
  properties: {
    mealSummary: {
      type: "string",
      description: "One-sentence description of the overall meal",
    },
    containerType: {
      type: "string",
      enum: ["bowl", "plate", "container", "cup", "unknown"],
    },
    containerSize: {
      type: "string",
      enum: ["small", "medium", "large", "unknown"],
    },
    foods: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: {
            type: "string",
            description:
              "Canonical, singular food name. E.g. 'spaghetti', 'meatball', 'tomato sauce'.",
          },
          visualDescription: {
            type: "string",
            description: "Brief description of what this component looks like",
          },
          portion: {
            type: "object",
            properties: {
              grams: {
                type: "number",
                description:
                  "Estimated weight in grams. Be conservative. Tennis ball of rice ~150g, deck-of-cards meat ~85g, tablespoon sauce ~15g.",
              },
              humanReadable: {
                type: "string",
                description:
                  "Human-friendly portion: 'about 1.5 cups', '3 medium meatballs'",
              },
              reasoning: {
                type: "string",
                description: "What visual evidence informed this estimate",
              },
            },
            required: ["grams", "humanReadable", "reasoning"],
            additionalProperties: false,
          },
          count: {
            type: "number",
            description:
              "Number of discrete items if countable. 0 if not countable.",
          },
          itemSize: {
            type: "string",
            enum: ["small", "medium", "large", "unknown"],
          },
          confidence: {
            type: "number",
            description: "Detection confidence 0.0-1.0.",
          },
          isAmbiguous: { type: "boolean" },
          alternatives: {
            type: "array",
            items: { type: "string" },
          },
          relativeArea: {
            type: "number",
            description: "Fraction of plate/bowl this food occupies, 0.0-1.0",
          },
        },
        required: [
          "label",
          "visualDescription",
          "portion",
          "count",
          "itemSize",
          "confidence",
          "isAmbiguous",
          "alternatives",
          "relativeArea",
        ],
        additionalProperties: false,
      },
    },
    sceneConfidence: {
      type: "number",
      description: "Overall confidence 0.0-1.0",
    },
    isMultiItem: { type: "boolean" },
    caveats: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "mealSummary",
    "containerType",
    "containerSize",
    "foods",
    "sceneConfidence",
    "isMultiItem",
    "caveats",
  ],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `You are a food analysis system for a calorie tracking app. Analyze the meal image and identify all distinct visible food components.

CRITICAL RULES:
1. DECOMPOSE — do NOT collapse a mixed dish into one label. Spaghetti with meatballs = THREE items: "spaghetti", "meatball", "tomato sauce".
2. SEPARATE sauces, dressings, toppings as distinct items.
3. USE SIMPLE INGREDIENT NAMES — "tomato sauce" not "ketchup" when it's pasta sauce.
4. COUNT VISIBLE ITEMS — for discrete countable foods, always provide an exact count.
5. DO NOT HALLUCINATE — only report foods you can see.
6. BE CONSERVATIVE with portions.
7. ESTIMATE GRAMS: dinner plate ~25cm, bowl ~350ml, fist ~150g dense food, palm meat ~85-100g.
8. FLAG AMBIGUITY honestly.

PORTION FORMAT:
- Countable: "3 medium meatballs", "2 large eggs"
- Non-countable: "about 1.5 cups", "2 tablespoons"`;

// ─── Handler ────────────────────────────────────────────────────────────────

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

  if (req.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    // ── 1. Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ ok: false, code: "UNAUTHENTICATED" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User-scoped client for identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser();

    if (userErr || !user) {
      return json({ ok: false, code: "UNAUTHENTICATED" }, 401);
    }

    // ── Rate limit (in-memory, per instance) ──
    const now = Date.now();
    const userLimit = rateLimitMap.get(user.id);
    if (userLimit && now < userLimit.resetAt) {
      if (userLimit.count >= RATE_LIMIT_PER_MINUTE) {
        return json(
          { ok: false, code: "RATE_LIMITED", message: "Too many requests" },
          429
        );
      }
      userLimit.count++;
    } else {
      rateLimitMap.set(user.id, { count: 1, resetAt: now + 60_000 });
    }

    // ── Per-user cooldown (10s between scans) ──
    const lastScan = lastScanMap.get(user.id) ?? 0;
    if (now - lastScan < COOLDOWN_MS) {
      return json(
        {
          ok: false,
          code: "COOLDOWN",
          message: "Please wait before scanning again",
        },
        429
      );
    }
    lastScanMap.set(user.id, now);

    // ── Service-role client for protected reads/writes ──
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);

    // ── 2-3. Load profile, subscription, usage in parallel ──
    const [profileRes, subRes, usageRes] = await Promise.all([
      admin
        .from("profiles")
        .select("user_id, is_blocked")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("subscription_state")
        .select("status, entitlement_id, expires_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      admin
        .from("usage_state")
        .select(
          "user_id, ai_scan_credits_remaining, ai_scan_daily_count, ai_scan_daily_reset_at, total_ai_scans_used"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    if (profileRes.error || subRes.error || usageRes.error) {
      console.error(
        "[ai-scan] State read failed:",
        profileRes.error?.message,
        subRes.error?.message,
        usageRes.error?.message
      );
      return json({ ok: false, code: "STATE_READ_FAILED" }, 500);
    }

    const profile = profileRes.data;
    const subscription = subRes.data;
    let usage = usageRes.data;

    // Bootstrap missing rows
    if (!profile) {
      await admin.from("profiles").insert({ user_id: user.id });
    }
    if (!usage) {
      const insertRes = await admin
        .from("usage_state")
        .insert({ user_id: user.id, ai_scan_credits_remaining: 3 })
        .select()
        .single();
      if (insertRes.error) {
        return json({ ok: false, code: "USAGE_BOOTSTRAP_FAILED" }, 500);
      }
      usage = insertRes.data;
    }

    // ── Blocked check ──
    if (profile?.is_blocked) {
      await logUsage(
        admin,
        user.id,
        "scan_denied_blocked",
        usage.ai_scan_credits_remaining,
        usage.ai_scan_credits_remaining,
        {
          reason: "blocked_user",
        }
      );
      return json(
        { ok: false, code: "BLOCKED", message: "Account blocked" },
        403
      );
    }

    // ── Determine premium status from subscription_state (webhook source of truth) ──
    const isPro =
      subscription?.status === "active" ||
      subscription?.status === "trialing" ||
      subscription?.status === "grace_period";

    // ── 4. Reset daily counter if date changed ──
    const today = new Date().toISOString().slice(0, 10);
    if (usage.ai_scan_daily_reset_at !== today) {
      const resetRes = await admin
        .from("usage_state")
        .update({
          ai_scan_daily_count: 0,
          ai_scan_daily_reset_at: today,
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (resetRes.error) {
        return json({ ok: false, code: "DAILY_RESET_FAILED" }, 500);
      }
      usage = resetRes.data;
    }

    // ── 5. Check if scan is allowed ──
    if (!isPro && usage.ai_scan_credits_remaining <= 0) {
      await logUsage(admin, user.id, "scan_denied_limit", 0, 0, {
        reason: "free_credits_exhausted",
      });
      return json(
        {
          ok: false,
          code: "LIMIT_REACHED",
          message: "Free AI scan limit reached. Upgrade for unlimited scans.",
        },
        402
      );
    }

    // ── Parse request body ──
    const body = await req.json();
    const imageBase64 = body?.imageBase64 as string | undefined;
    const userHint = body?.userHint as string | undefined;

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return json(
        { ok: false, code: "BAD_REQUEST", message: "Missing imageBase64" },
        400
      );
    }

    // ── Abuse: image size check ──
    const estimatedBytes = (imageBase64.length * 3) / 4;
    if (estimatedBytes > MAX_IMAGE_BYTES) {
      return json(
        {
          ok: false,
          code: "IMAGE_TOO_LARGE",
          message: `Max ${MAX_IMAGE_BYTES / 1024 / 1024}MB`,
        },
        400
      );
    }

    // ── Abuse: compute image hash for replay detection ──
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      encoder.encode(imageBase64.slice(0, 10000))
    );
    const imageSha256 = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // ── 6. Decrement credits (before vendor call, for free users) ──
    const creditsBefore = usage.ai_scan_credits_remaining;
    let creditsAfter = usage.ai_scan_credits_remaining;

    if (!isPro) {
      creditsAfter = creditsBefore - 1;

      const decRes = await admin
        .from("usage_state")
        .update({
          ai_scan_credits_remaining: creditsAfter,
          ai_scan_daily_count: usage.ai_scan_daily_count + 1,
          total_ai_scans_used: usage.total_ai_scans_used + 1,
        })
        .eq("user_id", user.id)
        .eq("ai_scan_credits_remaining", creditsBefore) // optimistic concurrency
        .select()
        .single();

      if (decRes.error) {
        return json({ ok: false, code: "CREDIT_DECREMENT_FAILED" }, 409);
      }
    } else {
      // Pro users: just increment counters
      await admin
        .from("usage_state")
        .update({
          ai_scan_daily_count: usage.ai_scan_daily_count + 1,
          total_ai_scans_used: usage.total_ai_scans_used + 1,
        })
        .eq("user_id", user.id);
    }

    await logUsage(
      admin,
      user.id,
      "scan_allowed",
      creditsBefore,
      creditsAfter,
      {
        isPro,
        imageSha256,
      }
    );

    // ── 7. Call AI vendor ──
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return json({ ok: false, code: "AI_NOT_CONFIGURED" }, 500);
    }

    const sanitizedHint = userHint
      ? userHint.slice(0, 200).replace(/[\n\r]/g, " ")
      : null;

    const userMessage = sanitizedHint
      ? `Analyze this meal photo. User context: "${sanitizedHint}"`
      : "Analyze this meal photo. Decompose it into individual food components with estimated portions.";

    const modelStart = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    let openaiResponse: Response;
    try {
      openaiResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              {
                role: "user",
                content: [
                  { type: "text", text: userMessage },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/jpeg;base64,${imageBase64}`,
                      detail: "high",
                    },
                  },
                ],
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "meal_decomposition",
                strict: true,
                schema: MEAL_DECOMPOSITION_SCHEMA,
              },
            },
            max_tokens: 1500,
            temperature: 0.2,
          }),
          signal: controller.signal,
        }
      );
    } finally {
      clearTimeout(timeoutId);
    }

    const modelLatencyMs = Date.now() - modelStart;

    if (!openaiResponse.ok) {
      const statusCode = openaiResponse.status;
      console.error(`[ai-scan] OpenAI error: status=${statusCode}`);
      await logUsage(
        admin,
        user.id,
        "scan_error_vendor",
        creditsBefore,
        creditsAfter,
        {
          isPro,
          vendor: "openai",
          statusCode,
          imageSha256,
        }
      );
      return json(
        { ok: false, code: "AI_VENDOR_ERROR", message: "AI analysis failed" },
        502
      );
    }

    const openaiResult = await openaiResponse.json();
    const content = openaiResult.choices?.[0]?.message?.content;

    if (!content) {
      return json({ ok: false, code: "EMPTY_AI_RESPONSE" }, 502);
    }

    let decomposition: Record<string, unknown>;
    try {
      decomposition = JSON.parse(content);
    } catch {
      console.error("[ai-scan] Failed to parse model JSON:", content);
      return json({ ok: false, code: "MALFORMED_AI_RESPONSE" }, 502);
    }

    if (
      !decomposition.foods ||
      !Array.isArray(decomposition.foods) ||
      decomposition.foods.length === 0
    ) {
      return json(
        {
          ok: false,
          code: "NO_FOOD_DETECTED",
          message: "No food items detected in image",
        },
        422
      );
    }

    // Clamp confidence values
    if (typeof decomposition.sceneConfidence === "number") {
      decomposition.sceneConfidence = Math.max(
        0,
        Math.min(1, decomposition.sceneConfidence)
      );
    }
    for (const food of decomposition.foods as Array<Record<string, unknown>>) {
      if (typeof food.confidence === "number") {
        food.confidence = Math.max(0, Math.min(1, food.confidence));
      }
      if (typeof food.relativeArea === "number") {
        food.relativeArea = Math.max(0, Math.min(1, food.relativeArea));
      }
      if (!Array.isArray(food.alternatives)) {
        food.alternatives = [];
      }
    }

    // ── 8. Write audit event ──
    const tokenUsage = openaiResult.usage;
    await logUsage(
      admin,
      user.id,
      "scan_success",
      creditsBefore,
      creditsAfter,
      {
        isPro,
        vendor: "openai",
        model: "gpt-4o-mini",
        imageSha256,
        latencyMs: modelLatencyMs,
        inputTokens: tokenUsage?.prompt_tokens,
        outputTokens: tokenUsage?.completion_tokens,
        foodCount: (decomposition.foods as unknown[]).length,
      }
    );

    // Also persist to food_scan_events for backward compatibility
    let scanEventId: string | undefined;
    admin
      .from("food_scan_events")
      .insert({
        user_id: user.id,
        pipeline_version: "3.0.0-ai-scan",
        taxonomy_version: "vision",
        source: "camera",
        raw_input: userHint ?? null,
        classifier_result: {
          model: "gpt-4o-mini",
          latencyMs: modelLatencyMs,
          tokensUsed: tokenUsage?.total_tokens ?? null,
          foodCount: (decomposition.foods as unknown[]).length,
        },
        candidate_result: decomposition,
        confidence: decomposition.sceneConfidence ?? null,
        vision_model: "gpt-4o-mini",
        vision_latency_ms: modelLatencyMs,
        vision_tokens_used: tokenUsage?.total_tokens ?? null,
        decomposition: decomposition,
        confidence_band:
          (decomposition.sceneConfidence as number) >= 0.75
            ? "high"
            : (decomposition.sceneConfidence as number) >= 0.5
              ? "medium"
              : "low",
      })
      .select("id")
      .single()
      .then(({ data, error }) => {
        if (error) {
          console.warn(
            "[ai-scan] food_scan_events insert error:",
            error.message
          );
        } else if (data) {
          scanEventId = data.id;
        }
      });

    // Small delay to allow DB insert
    await new Promise((resolve) => setTimeout(resolve, 50));

    if (tokenUsage) {
      console.log(
        `[ai-scan] user=${user.id} pro=${isPro} credits=${creditsAfter} tokens=${tokenUsage.total_tokens} latency=${modelLatencyMs}ms`
      );
    }

    // ── 9. Return result ──
    return json({
      ok: true,
      data: {
        success: true,
        decomposition,
        modelLatencyMs,
        scanEventId: scanEventId ?? undefined,
        tokensUsed: tokenUsage?.total_tokens ?? undefined,
        remainingFreeCredits: isPro ? null : creditsAfter,
        isPro,
      },
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return json(
        { ok: false, code: "TIMEOUT", message: "Analysis timed out" },
        504
      );
    }
    console.error("[ai-scan] Unexpected error:", err);
    return json({ ok: false, code: "INTERNAL_ERROR" }, 500);
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function json(body: ScanResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

async function logUsage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  userId: string,
  eventType: string,
  creditsBefore: number,
  creditsAfter: number,
  meta: Record<string, unknown>
) {
  try {
    await admin.from("ai_usage_events").insert({
      user_id: userId,
      event_type: eventType,
      credits_before: creditsBefore,
      credits_after: creditsAfter,
      image_sha256: (meta.imageSha256 as string) ?? null,
      vendor: (meta.vendor as string) ?? null,
      model: (meta.model as string) ?? null,
      estimated_input_tokens: (meta.inputTokens as number) ?? null,
      estimated_output_tokens: (meta.outputTokens as number) ?? null,
      meta,
    });
  } catch (err) {
    // Fire-and-forget — don't fail the scan because logging failed
    console.warn("[ai-scan] logUsage error:", err);
  }
}
