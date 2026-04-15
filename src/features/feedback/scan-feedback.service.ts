/**
 * Scan Feedback Service
 *
 * Human-in-the-loop feedback loop for the food recognition pipeline.
 *
 * Three responsibilities:
 *   1. Record every scan event (inference layer)
 *   2. Accept structured issue reports (learning layer)
 *   3. Store corrections as ground-truth (training data)
 *
 * All writes are fire-and-forget — failures never block the main UX.
 * Falls back gracefully when Supabase isn't configured (dev/offline).
 */

import {
    PIPELINE_VERSION,
    TAXONOMY_VERSION,
} from "../nutrition/pipeline-version";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ScanSource = "camera" | "barcode" | "voice" | "text";

export type ReportReasonCode =
  | "wrong_food"
  | "wrong_macros"
  | "wrong_quantity"
  | "label_mismatch"
  | "barcode_mismatch"
  | "missing_item"
  | "image_unclear"
  | "duplicate"
  | "other";

export interface ScanEventPayload {
  source: ScanSource;
  rawInput?: string;
  imageQuality?: Record<string, unknown>;
  ocrResult?: Record<string, unknown>;
  barcodeResult?: Record<string, unknown>;
  classifierResult?: Record<string, unknown>;
  candidateResult?: Record<string, unknown>;
  matchedResult?: Record<string, unknown>;
  finalFoodName?: string;
  finalCalories?: number;
  finalProtein?: number;
  finalCarbs?: number;
  finalFat?: number;
  confidence?: number;
}

export interface ReportPayload {
  scanEventId?: string;
  reasonCode: ReportReasonCode;
  reasonText?: string;
}

export interface CorrectionPayload {
  scanEventId?: string;
  originalFoodName?: string;
  originalMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  originalServing?: string;
  correctedFoodName?: string;
  correctedMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  correctedServing?: string;
}

// ─── Supabase Client ────────────────────────────────────────────────────────

function getSupabaseClientSafe() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getSupabaseClient } = require("../../lib/supabase/client");
    return getSupabaseClient();
  } catch {
    return null;
  }
}

let _client: ReturnType<typeof getSupabaseClientSafe>;
function getClient() {
  if (!_client) _client = getSupabaseClientSafe();
  return _client;
}

// ─── In-Memory Fallback ─────────────────────────────────────────────────────
// When Supabase isn't configured (dev, offline), we still keep the last
// scan event ID in memory so report/correction can reference it.

let lastScanEventId: string | null = null;
let localScanEvents: ScanEventPayload[] = [];
let localReports: ReportPayload[] = [];

/** Get the ID of the most recent scan event (for linking reports) */
export function getLastScanEventId(): string | null {
  return lastScanEventId;
}

// ─── Record Scan Event ──────────────────────────────────────────────────────

/**
 * Record a scan event. Fire-and-forget — never blocks UX.
 * Returns the event ID if Supabase is available, null otherwise.
 */
export async function recordScanEvent(
  payload: ScanEventPayload
): Promise<string | null> {
  // Always keep locally for report linking
  localScanEvents.push(payload);
  if (localScanEvents.length > 50) localScanEvents.shift();

  const client = getClient();
  if (!client) {
    lastScanEventId = null;
    return null;
  }

  try {
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) {
      lastScanEventId = null;
      return null;
    }

    const { data, error } = await client
      .from("food_scan_events")
      .insert({
        user_id: userData.user.id,
        pipeline_version: PIPELINE_VERSION,
        taxonomy_version: TAXONOMY_VERSION,
        source: payload.source,
        raw_input: payload.rawInput,
        image_quality: payload.imageQuality ?? null,
        ocr_result: payload.ocrResult ?? null,
        barcode_result: payload.barcodeResult ?? null,
        classifier_result: payload.classifierResult ?? null,
        candidate_result: payload.candidateResult ?? null,
        matched_result: payload.matchedResult ?? null,
        final_food_name: payload.finalFoodName ?? null,
        final_calories: payload.finalCalories ?? null,
        final_protein: payload.finalProtein ?? null,
        final_carbs: payload.finalCarbs ?? null,
        final_fat: payload.finalFat ?? null,
        confidence: payload.confidence ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.warn("[ScanFeedback] Failed to record event:", error.message);
      lastScanEventId = null;
      return null;
    }

    lastScanEventId = data.id;
    return data.id;
  } catch (e) {
    console.warn("[ScanFeedback] recordScanEvent error:", e);
    lastScanEventId = null;
    return null;
  }
}

/**
 * Mark the current scan event as confirmed/edited by the user.
 * Called when user presses "Confirm & Log".
 */
export async function markScanConfirmed(
  scanEventId: string,
  edited: boolean,
  finalValues?: {
    foodName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }
): Promise<void> {
  const client = getClient();
  if (!client || !scanEventId) return;

  try {
    const updates: Record<string, unknown> = {
      confirmed_by_user: true,
      edited_by_user: edited,
    };
    if (finalValues) {
      updates.final_food_name = finalValues.foodName;
      updates.final_calories = finalValues.calories;
      updates.final_protein = finalValues.protein;
      updates.final_carbs = finalValues.carbs;
      updates.final_fat = finalValues.fat;
    }
    await client.from("food_scan_events").update(updates).eq("id", scanEventId);
  } catch (e) {
    console.warn("[ScanFeedback] markScanConfirmed error:", e);
  }
}

// ─── Submit Report ──────────────────────────────────────────────────────────

/**
 * Submit a structured issue report.
 * Links to the current scan event if available.
 */
export async function submitScanReport(
  payload: ReportPayload
): Promise<boolean> {
  // Keep locally regardless
  localReports.push(payload);
  if (localReports.length > 50) localReports.shift();

  const client = getClient();
  if (!client) return false;

  try {
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return false;

    const { error } = await client.from("food_scan_reports").insert({
      scan_event_id: payload.scanEventId ?? lastScanEventId ?? null,
      user_id: userData.user.id,
      reason_code: payload.reasonCode,
      reason_text: payload.reasonText?.slice(0, 500) ?? null,
      status: "new",
    });

    if (error) {
      console.warn("[ScanFeedback] submitReport error:", error.message);
      return false;
    }

    // Mark the scan event as reported
    if (payload.scanEventId ?? lastScanEventId) {
      await client
        .from("food_scan_events")
        .update({ reported_by_user: true })
        .eq("id", payload.scanEventId ?? lastScanEventId);
    }

    return true;
  } catch (e) {
    console.warn("[ScanFeedback] submitReport error:", e);
    return false;
  }
}

// ─── Submit Correction ──────────────────────────────────────────────────────

/**
 * Store a user correction as ground truth.
 * This is the gold data — original prediction vs user-corrected values.
 */
export async function submitScanCorrection(
  payload: CorrectionPayload
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;

  try {
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) return false;

    const { error } = await client.from("food_scan_corrections").insert({
      scan_event_id: payload.scanEventId ?? lastScanEventId ?? null,
      user_id: userData.user.id,
      original_food_name: payload.originalFoodName ?? null,
      original_macros: payload.originalMacros ?? null,
      original_serving: payload.originalServing ?? null,
      corrected_food_name: payload.correctedFoodName ?? null,
      corrected_macros: payload.correctedMacros ?? null,
      corrected_serving: payload.correctedServing ?? null,
    });

    if (error) {
      console.warn("[ScanFeedback] submitCorrection error:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[ScanFeedback] submitCorrection error:", e);
    return false;
  }
}
