/// <reference lib="deno.ns" />
/**
 * Supabase Edge Function: Analyze Meal
 *
 * Receives a base64 food image from the mobile client, sends it to
 * gpt-4o-mini with structured output, and returns decomposed food
 * components with estimated portions.
 *
 * Security:
 *   - OpenAI API key stays server-side (never in client)
 *   - Authenticated via Supabase JWT
 *   - Rate limited per user
 *   - Image size capped at 4MB
 *
 * Architecture:
 *   Client → this function → gpt-4o-mini (vision) → structured JSON → client
 *   Nutrition resolution happens client-side using existing DB lookup pipeline.
 */

import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB
const OPENAI_TIMEOUT_MS = 30_000;
const RATE_LIMIT_PER_MINUTE = 10;

// In-memory rate limiter (per-instance, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// ─── Structured Output Schema ───────────────────────────────────────────────

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
              "Canonical, singular food name. E.g. 'spaghetti', 'meatball', 'tomato sauce'. Do not collapse distinct components into one generic label.",
          },
          visualDescription: {
            type: "string",
            description:
              "Brief description of what this component looks like in the image",
          },
          portion: {
            type: "object",
            properties: {
              grams: {
                type: "number",
                description:
                  "Estimated weight in grams. Be conservative. For reference: a tennis ball of rice is ~150g, a deck-of-cards portion of meat is ~85g, a tablespoon of sauce is ~15g.",
              },
              humanReadable: {
                type: "string",
                description:
                  "Human-friendly portion: 'about 1.5 cups', '3 medium meatballs', '2 tablespoons'",
              },
              reasoning: {
                type: "string",
                description:
                  "What visual evidence informed this estimate: container size, relative area, count, comparison to known-size objects",
              },
            },
            required: ["grams", "humanReadable", "reasoning"],
            additionalProperties: false,
          },
          count: {
            type: "number",
            description:
              "Number of discrete items if countable (e.g. 5 meatballs, 2 eggs, 3 slices). Use 0 if the food is not countable (e.g. rice, sauce, soup).",
          },
          itemSize: {
            type: "string",
            enum: ["small", "medium", "large", "unknown"],
            description:
              "Size of each individual item if countable. Use 'unknown' for non-countable foods.",
          },
          confidence: {
            type: "number",
            description:
              "Detection confidence 0.0-1.0. Lower if partially occluded or ambiguous.",
          },
          isAmbiguous: { type: "boolean" },
          alternatives: {
            type: "array",
            items: { type: "string" },
            description:
              "Alternative food names if ambiguous. Empty array if certain.",
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
      description: "Overall confidence in the scene understanding, 0.0-1.0",
    },
    isMultiItem: { type: "boolean" },
    caveats: {
      type: "array",
      items: { type: "string" },
      description:
        "Any important caveats: 'sauce may be hidden under pasta', 'portion hard to judge from angle'",
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

// ─── System Prompt ──────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a food analysis system for a calorie tracking app. Analyze the meal image and identify all distinct visible food components.

CRITICAL RULES:
1. DECOMPOSE — do NOT collapse a mixed dish into one label. If you see spaghetti with meatballs and sauce, that is THREE items: "spaghetti", "meatball", "tomato sauce". Not "pasta dish".
2. SEPARATE sauces, dressings, toppings, and condiments as distinct items. They have significant calories.
3. USE SIMPLE INGREDIENT NAMES — prefer basic food names that map to a nutrition database: "tomato sauce" not "ketchup" when it's clearly pasta sauce. "chicken breast" not "grilled herb-crusted chicken". Use the most specific accurate name.
4. IDENTIFY SAUCES CORRECTLY — distinguish between: tomato sauce / marinara (on pasta/dishes), ketchup (condiment, in bottle/packet), salsa (chunky, Mexican), hot sauce. Context matters: red sauce on pasta = "tomato sauce", not "ketchup".
5. COUNT VISIBLE ITEMS — for discrete countable foods (meatballs, eggs, nuggets, slices, pieces), always provide an exact count. This is more reliable than guessing total weight.
6. DO NOT HALLUCINATE — only report foods you can actually see. If you're guessing there might be an ingredient, don't include it.
7. BE CONSERVATIVE with portions. Overestimating is worse than underestimating for a calorie tracker.
8. ESTIMATE GRAMS using visual reference cues:
   - A standard dinner plate is ~25cm diameter
   - A standard bowl holds ~350ml
   - A fist-sized portion is ~150g of dense food
   - A palm-sized portion of meat is ~85-100g
   - A tablespoon is ~15ml/15g
   - For countable items: estimate per-unit weight, then multiply by count
9. CONFIDENCE reflects certainty of identification. Partially occluded = lower. Clear and unambiguous = higher.
10. FLAG AMBIGUITY honestly. If uncertain, set isAmbiguous: true and list alternatives.

PORTION FORMAT:
- For countable items: humanReadable should be "N size foodname" e.g. "3 medium meatballs", "2 large eggs"
- For non-countable: use volume/weight descriptions e.g. "about 1.5 cups", "2 tablespoons"
- Always provide your reasoning for the estimate`;

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
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const _startTime = Date.now();

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing authorization header" }, 401);
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create an admin client with the service role key.
    // Pass the user's JWT explicitly to getUser() rather than via global
    // headers — the latter doesn't work reliably with ES256 tokens in
    // the Edge Runtime.
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error("Auth failed:", authError?.message ?? "No user returned");
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    // ── Rate limit ──
    const now = Date.now();
    const userLimit = rateLimitMap.get(user.id);
    if (userLimit && now < userLimit.resetAt) {
      if (userLimit.count >= RATE_LIMIT_PER_MINUTE) {
        return jsonResponse(
          { error: "Rate limit exceeded. Try again shortly." },
          429
        );
      }
      userLimit.count++;
    } else {
      rateLimitMap.set(user.id, { count: 1, resetAt: now + 60_000 });
    }

    // ── Parse request ──
    const body = await req.json();
    const { imageBase64, userHint } = body as {
      imageBase64?: string;
      userHint?: string;
    };

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return jsonResponse({ error: "Missing imageBase64 field" }, 400);
    }

    // Validate image size (base64 is ~33% larger than binary)
    const estimatedBytes = (imageBase64.length * 3) / 4;
    if (estimatedBytes > MAX_IMAGE_BYTES) {
      return jsonResponse(
        {
          error: `Image too large. Maximum size is ${MAX_IMAGE_BYTES / 1024 / 1024}MB.`,
        },
        400
      );
    }

    // ── OpenAI call ──
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return jsonResponse({ error: "OpenAI API key not configured" }, 500);
    }

    // Sanitize userHint to prevent prompt injection
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
      console.error(`[analyze-meal] OpenAI error: status=${statusCode}`);
      return jsonResponse(
        {
          error: `AI analysis failed (${statusCode}). Please try again.`,
        },
        502
      );
    }

    const openaiResult = await openaiResponse.json();
    const content = openaiResult.choices?.[0]?.message?.content;

    if (!content) {
      return jsonResponse({ error: "Empty response from AI model" }, 502);
    }

    // ── Parse and validate ──
    let decomposition: Record<string, unknown>;
    try {
      decomposition = JSON.parse(content);
    } catch {
      console.error("[analyze-meal] Failed to parse model JSON:", content);
      return jsonResponse({ error: "Malformed AI response" }, 502);
    }

    // Basic validation
    if (
      !decomposition.foods ||
      !Array.isArray(decomposition.foods) ||
      decomposition.foods.length === 0
    ) {
      return jsonResponse(
        { error: "AI could not identify any food items in the image" },
        422
      );
    }

    // Clamp confidence values to 0–1 range
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
      // Ensure alternatives is always an array
      if (!Array.isArray(food.alternatives)) {
        food.alternatives = [];
      }
    }

    // ── Log usage for cost tracking ──
    const usage = openaiResult.usage;
    if (usage) {
      console.log(
        `[analyze-meal] tokens: prompt=${usage.prompt_tokens} completion=${usage.completion_tokens} total=${usage.total_tokens} latency=${modelLatencyMs}ms`
      );
    }

    // ── Persist scan event (fire-and-forget) ──
    const supabaseService = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let scanEventId: string | undefined;
    supabaseService
      .from("food_scan_events")
      .insert({
        user_id: user.id,
        pipeline_version: "2.0.0-vision",
        taxonomy_version: "vision",
        source: "camera",
        raw_input: userHint ?? null,
        classifier_result: {
          model: "gpt-4o-mini",
          latencyMs: modelLatencyMs,
          tokensUsed: usage?.total_tokens ?? null,
          foodCount: (decomposition.foods as unknown[]).length,
        },
        candidate_result: decomposition,
        confidence: decomposition.sceneConfidence ?? null,
        // Vision-specific columns
        vision_model: "gpt-4o-mini",
        vision_latency_ms: modelLatencyMs,
        vision_tokens_used: usage?.total_tokens ?? null,
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
          console.warn("[analyze-meal] DB insert error:", error.message);
        } else if (data) {
          scanEventId = data.id;
        }
      });

    // Small delay to allow the insert to complete so we can return the ID
    await new Promise((resolve) => setTimeout(resolve, 50));

    return jsonResponse({
      success: true,
      decomposition,
      modelLatencyMs,
      scanEventId: scanEventId ?? undefined,
      tokensUsed: usage?.total_tokens ?? undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return jsonResponse(
        { error: "Analysis timed out. Please try again with a clearer photo." },
        504
      );
    }
    console.error("[analyze-meal] Unexpected error:", err);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
