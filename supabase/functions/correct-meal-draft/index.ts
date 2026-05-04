/// <reference lib="deno.ns" />
/**
 * Supabase Edge Function: correct-meal-draft
 *
 * "Fix with AI" — refines an existing meal draft using a free-text user
 * correction. The user has already gone through `ai-scan` (or another
 * pipeline) and is looking at an imperfect result on the confirm-meal
 * screen. They describe what's wrong in natural language; this function
 * returns a revised draft.
 *
 * Why a separate function from `ai-scan`:
 *   - This is text-only — we never re-upload the image. The original AI
 *     pipeline already produced a structured draft; we only need to revise
 *     it with the user's correction text.
 *   - Different rate-limit and pricing characteristics. `ai-scan` is the
 *     entitlement-controlled choke point for vision; this is a cheap text
 *     refinement that we expect to be paywalled later.
 *   - Smaller prompt + structured-output surface keeps latency low.
 *
 * Security:
 *   - Requires a valid Supabase Auth JWT.
 *   - OpenAI / Gemini keys never reach the client.
 *   - User correction text is logged truncated (≤120 chars) and only via
 *     Sentry-style breadcrumbs, never in the function's stdout.
 *   - Validation rejects unreasonable values (calories outside 1–5000,
 *     negative macros, NaN/Infinity, empty title).
 *
 * Request body:
 *   {
 *     draft: {
 *       title, calories, protein, carbs, fat,
 *       estimatedItems?: [{ matchedName, parsed?: { name? }, ... }]
 *     },
 *     userCorrection: string,        // ≤ 1000 chars (truncated otherwise)
 *     imagePath?: string             // not used today; kept for future
 *   }
 *
 * Response (200):
 *   {
 *     ok: true,
 *     data: {
 *       title: string,
 *       calories: number,
 *       protein: number,
 *       carbs: number,
 *       fat: number,
 *       estimatedItems?: [{ name, calories, protein, carbs, fat }],
 *       confidence?: number,         // 0..1
 *       explanation?: string,        // short natural-language reason
 *       vendor: "openai" | "google",
 *       model: string,
 *       latencyMs: number
 *     }
 *   }
 *
 * Error envelope (non-200):
 *   { ok: false, code: string, message: string, detail?: string }
 */

import { createClient } from "@supabase/supabase-js";
import { serve } from "std/http/server.ts";

// ── Constants ───────────────────────────────────────────────

const AI_TIMEOUT_MS = 15_000;
/** Per-user, per-hour rate limit. Manual UX action; modest. */
const RATE_LIMIT_PER_HOUR = 20;
/** Hard cap on user correction text we send to the model. */
const MAX_CORRECTION_LEN = 1000;
/** Hard cap on serialised draft we send to the model (defence in depth). */
const MAX_DRAFT_JSON_LEN = 8_000;

/** Calorie / macro bounds. Mirrors `food-validator.service.ts` on the client. */
const MIN_CALORIES = 1;
const MAX_CALORIES = 5000;
const MAX_MACRO_GRAMS = 700;

// In-memory rate limiter (per-instance — best-effort, not strict).
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// ── CORS ────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-auth-token",
};

// ── Prompt + JSON schema ────────────────────────────────────

const SYSTEM_PROMPT = `You are a nutrition correction assistant for a calorie tracking app.
The user just analyzed a meal photo and got a structured result they want to fix.
Apply the user's correction to the original draft and return a clean, revised draft.

Rules:
- Return ONLY valid JSON matching the supplied schema. No markdown. No commentary.
- Preserve the spirit of the original draft when the user only changes one detail.
- If the user clarifies portion size, scale calories AND all macros proportionally.
- If the user lists ingredients, write a concise, human-friendly title that lists
  the dominant components (e.g. "Spaghetti with meatballs and mixed peppers").
- Deduplicate redundant tokens in the title (e.g. "Medium Bell Pepper, Medium Bell Pepper").
- Keep calories between ${MIN_CALORIES} and ${MAX_CALORIES}. Round to integers.
- Keep protein/carbs/fat as non-negative numbers. Use one decimal place.
- Keep macros consistent with calories: 4*P + 4*C + 9*F should be within ±35% of calories.
- If the correction is ambiguous, prefer reasonable defaults; do NOT invent ingredients.
- explanation: <= 90 characters, plain text, no emoji, no exclamation marks.
- estimatedItems: optional. Up to 8 items. Each item's macros must be non-negative.
- Do not include any user PII.`;

const JSON_SCHEMA = {
  name: "meal_draft_correction",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      title: { type: "string", minLength: 1, maxLength: 120 },
      calories: { type: "number", minimum: MIN_CALORIES, maximum: MAX_CALORIES },
      protein: { type: "number", minimum: 0, maximum: MAX_MACRO_GRAMS },
      carbs: { type: "number", minimum: 0, maximum: MAX_MACRO_GRAMS },
      fat: { type: "number", minimum: 0, maximum: MAX_MACRO_GRAMS },
      confidence: { type: ["number", "null"], minimum: 0, maximum: 1 },
      explanation: { type: ["string", "null"], maxLength: 200 },
      estimatedItems: {
        type: ["array", "null"],
        maxItems: 8,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            name: { type: "string", minLength: 1, maxLength: 80 },
            calories: { type: "number", minimum: 0, maximum: MAX_CALORIES },
            protein: { type: "number", minimum: 0, maximum: MAX_MACRO_GRAMS },
            carbs: { type: "number", minimum: 0, maximum: MAX_MACRO_GRAMS },
            fat: { type: "number", minimum: 0, maximum: MAX_MACRO_GRAMS },
          },
          required: ["name", "calories", "protein", "carbs", "fat"],
        },
      },
    },
    required: [
      "title",
      "calories",
      "protein",
      "carbs",
      "fat",
      "confidence",
      "explanation",
      "estimatedItems",
    ],
  },
};

// ── Helpers ─────────────────────────────────────────────────

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

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

function clampNumber(n: unknown, min: number, max: number): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (n < min || n > max) return null;
  return n;
}

interface CorrectedDraft {
  title: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence?: number;
  explanation?: string;
  estimatedItems?: Array<{
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
}

/**
 * Server-side validation of the structured output. The model is constrained
 * by JSON schema, but we never trust an LLM unconditionally.
 */
function validateCorrected(raw: unknown): CorrectedDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const title =
    typeof r.title === "string" && r.title.trim().length >= 1
      ? r.title.trim().slice(0, 120)
      : null;
  if (!title) return null;

  const calories = clampNumber(r.calories, MIN_CALORIES, MAX_CALORIES);
  const protein = clampNumber(r.protein, 0, MAX_MACRO_GRAMS);
  const carbs = clampNumber(r.carbs, 0, MAX_MACRO_GRAMS);
  const fat = clampNumber(r.fat, 0, MAX_MACRO_GRAMS);
  if (
    calories === null ||
    protein === null ||
    carbs === null ||
    fat === null
  ) {
    return null;
  }

  // Macro/calorie sanity. Be permissive — the validator on the client will
  // do its own bounds check; we only reject obvious nonsense here.
  const macroKcal = 4 * protein + 4 * carbs + 9 * fat;
  if (macroKcal > calories * 3 || (calories > 0 && macroKcal < calories * 0.2)) {
    return null;
  }

  const out: CorrectedDraft = {
    title,
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
  };

  const confidence = clampNumber(r.confidence ?? null, 0, 1);
  if (confidence !== null) out.confidence = confidence;

  if (typeof r.explanation === "string" && r.explanation.trim().length > 0) {
    out.explanation = r.explanation.trim().slice(0, 200);
  }

  if (Array.isArray(r.estimatedItems)) {
    const items: CorrectedDraft["estimatedItems"] = [];
    for (const i of r.estimatedItems.slice(0, 8)) {
      if (!i || typeof i !== "object") continue;
      const ii = i as Record<string, unknown>;
      const iName =
        typeof ii.name === "string" && ii.name.trim().length >= 1
          ? ii.name.trim().slice(0, 80)
          : null;
      const iCal = clampNumber(ii.calories, 0, MAX_CALORIES);
      const iProt = clampNumber(ii.protein, 0, MAX_MACRO_GRAMS);
      const iCarbs = clampNumber(ii.carbs, 0, MAX_MACRO_GRAMS);
      const iFat = clampNumber(ii.fat, 0, MAX_MACRO_GRAMS);
      if (!iName || iCal === null || iProt === null || iCarbs === null || iFat === null) {
        continue;
      }
      items.push({
        name: iName,
        calories: Math.round(iCal),
        protein: Math.round(iProt * 10) / 10,
        carbs: Math.round(iCarbs * 10) / 10,
        fat: Math.round(iFat * 10) / 10,
      });
    }
    if (items.length > 0) out.estimatedItems = items;
  }

  return out;
}

/** Clean structural copy of the draft we forward to the LLM. */
function safeDraftForPrompt(draft: unknown): Record<string, unknown> {
  if (!draft || typeof draft !== "object") return {};
  const d = draft as Record<string, unknown>;
  const items = Array.isArray(d.estimatedItems)
    ? d.estimatedItems.slice(0, 8).map((it) => {
        if (!it || typeof it !== "object") return null;
        const item = it as Record<string, unknown>;
        const nutrients = (item.nutrients ?? {}) as Record<string, unknown>;
        return {
          name:
            typeof item.matchedName === "string"
              ? item.matchedName
              : typeof (item.parsed as Record<string, unknown> | undefined)?.name ===
                  "string"
                ? ((item.parsed as Record<string, unknown>).name as string)
                : "item",
          calories: typeof nutrients.calories === "number" ? nutrients.calories : null,
          protein: typeof nutrients.protein === "number" ? nutrients.protein : null,
          carbs: typeof nutrients.carbs === "number" ? nutrients.carbs : null,
          fat: typeof nutrients.fat === "number" ? nutrients.fat : null,
        };
      })
    : [];
  return {
    title: typeof d.title === "string" ? d.title.slice(0, 200) : "",
    calories: typeof d.calories === "number" ? d.calories : 0,
    protein: typeof d.protein === "number" ? d.protein : 0,
    carbs: typeof d.carbs === "number" ? d.carbs : 0,
    fat: typeof d.fat === "number" ? d.fat : 0,
    estimatedItems: items.filter(Boolean),
  };
}

// ── Vendor calls ────────────────────────────────────────────

interface AiResult {
  content: string;
  vendor: "openai" | "google";
  model: string;
  latencyMs: number;
}

async function callOpenAI(
  apiKey: string,
  userMessage: string,
  signal: AbortSignal
): Promise<AiResult> {
  const start = Date.now();
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "developer", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      response_format: { type: "json_schema", json_schema: JSON_SCHEMA },
      temperature: 0.2,
      max_tokens: 600,
    }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const result = await res.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty OpenAI response");
  return {
    content,
    vendor: "openai",
    model: "gpt-4o-mini",
    latencyMs: Date.now() - start,
  };
}

/**
 * Recursively strip `additionalProperties` from a JSON schema. Gemini's
 * `responseSchema` rejects schemas containing it.
 */
function stripAdditionalProperties(schema: unknown): unknown {
  if (!schema || typeof schema !== "object") return schema;
  if (Array.isArray(schema)) return schema.map(stripAdditionalProperties);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    if (k === "additionalProperties") continue;
    out[k] = stripAdditionalProperties(v);
  }
  return out;
}

async function callGemini(
  apiKey: string,
  userMessage: string,
  signal: AbortSignal
): Promise<AiResult> {
  const start = Date.now();
  const geminiSchema = stripAdditionalProperties(JSON_SCHEMA.schema);
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          { role: "user", parts: [{ text: userMessage }] },
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 800,
          responseMimeType: "application/json",
          responseSchema: geminiSchema,
        },
      }),
    }
  );
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gemini HTTP ${res.status}: ${errBody.slice(0, 200)}`);
  }
  const result = await res.json();
  const content = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!content) throw new Error("Empty Gemini response");
  return {
    content,
    vendor: "google",
    model: "gemini-2.5-flash",
    latencyMs: Date.now() - start,
  };
}

// ── Handler ─────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ ok: false, code: "METHOD_NOT_ALLOWED" }, 405);
  }

  try {
    // ── Auth (Authorization header → anon client → getUser) ────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ ok: false, code: "UNAUTHORIZED" }, 401);
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
      return json({ ok: false, code: "UNAUTHORIZED" }, 401);
    }

    // ── Rate limit ──────────────────────────────────────────────────
    if (!checkRateLimit(user.id)) {
      return json({ ok: false, code: "RATE_LIMITED" }, 429);
    }

    // ── Parse + sanitise body ──────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return json(
        { ok: false, code: "BAD_REQUEST", message: "Invalid JSON" },
        400
      );
    }

    const userCorrectionRaw = body?.userCorrection;
    if (typeof userCorrectionRaw !== "string" || userCorrectionRaw.trim().length === 0) {
      return json(
        { ok: false, code: "BAD_REQUEST", message: "Missing userCorrection" },
        400
      );
    }
    const userCorrection = userCorrectionRaw.trim().slice(0, MAX_CORRECTION_LEN);

    const draft = body?.draft;
    if (!draft || typeof draft !== "object") {
      return json(
        { ok: false, code: "BAD_REQUEST", message: "Missing draft" },
        400
      );
    }
    const safeDraft = safeDraftForPrompt(draft);
    const draftJsonStr = JSON.stringify(safeDraft);
    if (draftJsonStr.length > MAX_DRAFT_JSON_LEN) {
      return json(
        { ok: false, code: "BAD_REQUEST", message: "Draft payload too large" },
        413
      );
    }

    // ── Vendor selection ────────────────────────────────────────────
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!openaiKey && !geminiKey) {
      return json({ ok: false, code: "AI_UNAVAILABLE" }, 503);
    }

    const userMessage = JSON.stringify({
      currentDraft: safeDraft,
      userCorrection,
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let aiResult: AiResult;
    const primary = openaiKey ? "openai" : "google";
    try {
      aiResult = openaiKey
        ? await callOpenAI(openaiKey, userMessage, controller.signal)
        : await callGemini(geminiKey!, userMessage, controller.signal);
    } catch (primaryErr) {
      const fallbackKey = openaiKey ? geminiKey : openaiKey;
      if (!fallbackKey) {
        clearTimeout(timeout);
        return json(
          {
            ok: false,
            code: "AI_VENDOR_ERROR",
            message: "AI correction failed",
            detail: (primaryErr as Error).message,
          },
          502
        );
      }
      try {
        aiResult = openaiKey
          ? await callGemini(fallbackKey, userMessage, controller.signal)
          : await callOpenAI(fallbackKey, userMessage, controller.signal);
      } catch (fallbackErr) {
        clearTimeout(timeout);
        return json(
          {
            ok: false,
            code: "AI_VENDOR_ERROR",
            message: "AI correction failed",
            detail: `Primary(${primary}): ${(primaryErr as Error).message}; Fallback: ${(fallbackErr as Error).message}`,
          },
          502
        );
      }
    } finally {
      clearTimeout(timeout);
    }

    // ── Parse + validate model output ──────────────────────────────
    let parsed: unknown;
    try {
      parsed = JSON.parse(aiResult.content);
    } catch {
      return json(
        {
          ok: false,
          code: "AI_INVALID_JSON",
          message: "AI returned invalid JSON",
        },
        502
      );
    }

    const corrected = validateCorrected(parsed);
    if (!corrected) {
      return json(
        {
          ok: false,
          code: "AI_INVALID_RESULT",
          message: "AI result failed validation",
        },
        502
      );
    }

    return json({
      ok: true,
      data: {
        ...corrected,
        vendor: aiResult.vendor,
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return json(
      { ok: false, code: "INTERNAL", message: "Internal error", detail: message },
      500
    );
  }
});
