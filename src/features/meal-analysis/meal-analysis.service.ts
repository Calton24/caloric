/**
 * Meal Analysis Service
 *
 * Client-side orchestrator for the AI food image analysis pipeline.
 *
 * End-to-end flow:
 *   1. Capture image → compress to JPEG
 *   2. Encode to base64
 *   3. Call analyze-meal Edge Function (gpt-4o-mini on server)
 *   4. Receive food decomposition
 *   5. Resolve each component against local nutrition DB
 *   6. Return structured, editable MealAnalysisResult
 *
 * All OpenAI interaction happens server-side. Only the image leaves the device.
 */

import { File } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { getSupabaseClient } from "../../lib/supabase/client";
import type {
  AnalyzeMealResponse,
  MealAnalysisResult,
  MealDecomposition,
} from "./meal-analysis.types";
import { resolveDecomposition } from "./nutrition-resolver.service";

// ─── Configuration ──────────────────────────────────────────────────────────

/** Max image dimension before compression (pixels) */
const MAX_IMAGE_DIMENSION = 1024;
/** JPEG compression quality (0–1) */
const JPEG_QUALITY = 0.8;
/** Maximum base64 payload size (4MB raw ≈ 5.3MB base64) */
const MAX_BASE64_LENGTH = 5_600_000;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Analyze a food photo end-to-end.
 *
 * @param imageUri - Local file URI of the captured/picked image
 * @param userHint - Optional context: "this is my lunch", "leftover pizza"
 * @param accessToken - JWT access token from the authenticated session
 * @returns Full analysis result with resolved nutrition, or throws on failure
 */
export async function analyzeMealImage(
  imageUri: string,
  userHint?: string,
  accessToken?: string
): Promise<MealAnalysisResult> {
  const pipelineStart = Date.now();

  // ── Step 1: Compress and encode image ──
  const compressedUri = await compressImage(imageUri);
  const base64 = await readImageAsBase64(compressedUri);

  if (base64.length > MAX_BASE64_LENGTH) {
    throw new MealAnalysisError(
      "Image is too large. Please try a smaller photo.",
      "image_too_large"
    );
  }

  // ── Step 2: Call Edge Function ──
  const client = getSupabaseClient();
  if (!client) {
    throw new MealAnalysisError(
      "Not connected to server. Please check your connection.",
      "no_client"
    );
  }

  // The SDK's fetchWithAuth calls getSession() internally, which can return
  // null on React Native due to SecureStore async gaps. We need to pass the
  // token explicitly via headers. If not provided by caller, try getSession()
  // as a fallback.
  let token = accessToken;
  if (!token) {
    const {
      data: { session },
    } = await client.auth.getSession();
    token = session?.access_token ?? undefined;
  }

  if (!token) {
    throw new MealAnalysisError(
      "Not signed in. Please sign in to analyze meals.",
      "no_client"
    );
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  const { data, error } = await client.functions.invoke("analyze-meal", {
    headers,
    body: {
      imageBase64: base64,
      userHint: userHint || undefined,
    },
  });

  if (error) {
    // Try to extract detail from the Edge Function response
    let detail = "";
    try {
      if (error.context && typeof error.context.json === "function") {
        const body = await error.context.json();
        detail = body?.detail || body?.error || "";
      }
    } catch {
      // ignore parse errors
    }
    const msg = detail || error.message || "Analysis failed. Please try again.";
    console.error("[MealAnalysis] Edge Function error:", msg);
    throw new MealAnalysisError(msg, "edge_function_error");
  }

  const response = data as AnalyzeMealResponse;

  if (!response.success || !response.decomposition) {
    throw new MealAnalysisError(
      response.error || "Could not identify food in the image.",
      "analysis_failed"
    );
  }

  // ── Step 3: Resolve nutrition locally ──
  const decomposition = response.decomposition as MealDecomposition;
  const result = resolveDecomposition(
    decomposition,
    imageUri,
    response.modelLatencyMs
  );

  // Add total pipeline time and server metadata
  result.totalLatencyMs = Date.now() - pipelineStart;

  // Attach scan event ID and token usage for telemetry
  if (response.scanEventId) {
    (result as MealAnalysisResultWithMeta).scanEventId = response.scanEventId;
  }
  if (response.tokensUsed) {
    (result as MealAnalysisResultWithMeta).tokensUsed = response.tokensUsed;
  }

  return result;
}

// ─── Image Processing ───────────────────────────────────────────────────────

/** Extended result type with server metadata */
export interface MealAnalysisResultWithMeta extends MealAnalysisResult {
  scanEventId?: string;
  tokensUsed?: number;
}

async function compressImage(uri: string): Promise<string> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_IMAGE_DIMENSION } }],
    { compress: JPEG_QUALITY, format: SaveFormat.JPEG }
  );
  return result.uri;
}

async function readImageAsBase64(uri: string): Promise<string> {
  const file = new File(uri);
  return file.base64();
}

// ─── Error Class ────────────────────────────────────────────────────────────

export type MealAnalysisErrorCode =
  | "image_too_large"
  | "no_client"
  | "edge_function_error"
  | "analysis_failed"
  | "timeout"
  | "unknown";

export class MealAnalysisError extends Error {
  code: MealAnalysisErrorCode;

  constructor(message: string, code: MealAnalysisErrorCode) {
    super(message);
    this.name = "MealAnalysisError";
    this.code = code;
  }
}
