/**
 * Background Scan Service
 *
 * Owns the entire post-capture lifecycle of an AI camera scan. The camera
 * route is responsible only for capturing pixels — once a job exists in the
 * background-scan store, this service handles every async operation:
 *   1. Initial server row create (`pending_meal_reviews` row)
 *   2. Parallel image upload to Supabase Storage (private bucket)
 *   3. Entitlement recheck (only if not already known-allowed)
 *   4. Local credit decrement
 *   5. Multi-stage image pipeline → MealDraft
 *   6. Final server row update with draft + image_path
 *
 * Strict rules:
 *   - This module MUST NOT call the router.
 *   - It is safe to call from anywhere (including outside React).
 *   - All work is fire-and-forget; failures land on the job's `error` state
 *     for the Home queue card to surface.
 *   - It is idempotent for a given jobId — calling `runScan(jobId)` twice
 *     for the same job is safe; the stale-jobId guards in the store will
 *     drop late writes from the older invocation.
 *   - Image upload failures do NOT fail the scan — the user can still review
 *     using the local URI optimistically. Telemetry captures the failure.
 */

import { addFoodLoggingBreadcrumb } from "../../infrastructure/errorReporting/foodLoggingErrors";
import { reportError } from "../../infrastructure/errorReporting";
import { getSupabaseClient } from "../../lib/supabase/client";
import { useBackgroundScanStore } from "../camera/background-scan.store";
import {
  type ScanStage,
  SCAN_STAGE_PROGRESS,
} from "../camera/background-scan.store";
import { runImagePipeline } from "../camera/image-pipeline.service";
import { useScanCreditsStore } from "../subscription/scanCredits.store";
import { useSubscriptionStore } from "../subscription/subscription.store";
import {
  deleteDurableImage,
  uploadMealReviewImage,
} from "./meal-image-upload.service";
import {
  markServerReviewDismissed,
  pushPendingReview,
} from "./pending-review.service";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getJob(jobId: string) {
  return useBackgroundScanStore.getState().jobs[jobId];
}

function isJobActive(jobId: string): boolean {
  const job = getJob(jobId);
  if (!job) return false;
  return (
    job.status === "queued" ||
    job.status === "analyzing" ||
    job.status === "complete" ||
    job.status === "error"
  );
}

function setStage(jobId: string, stage: ScanStage): void {
  if (!isJobActive(jobId)) return;
  useBackgroundScanStore
    .getState()
    .setStage(jobId, stage, SCAN_STAGE_PROGRESS[stage]);
  addFoodLoggingBreadcrumb("food_logging.background_scan_stage_changed", {
    job_id: jobId,
    stage,
  });
}

/**
 * One-shot entitlement recheck against the server.
 * Returns true if the user is allowed to scan, false if denied,
 * undefined if the call could not be completed (network/transient).
 */
async function rechecKEntitlement(): Promise<boolean | undefined> {
  try {
    const { data, error } = await getSupabaseClient().functions.invoke(
      "sync-entitlement"
    );
    if (error || !data?.ok) return undefined;
    useSubscriptionStore.getState().syncFromServer({
      isPro: data.isPro as boolean,
      status: data.status as string,
      expiresAt: (data.expiresAt as string | null) ?? null,
      lastServerVerifiedAt: data.lastServerVerifiedAt as string,
    });
    if (data.isPro) return true;
    return useScanCreditsStore.getState().hasCredits();
  } catch {
    return undefined;
  }
}

/**
 * Parallel image upload. Updates the local job's upload status as it
 * progresses. Failures are non-fatal — the local URI remains the
 * fallback for rendering.
 */
async function uploadImageInBackground(jobId: string): Promise<void> {
  const job = getJob(jobId);
  if (!job) return;
  if (!job.userId || job.userId === "anon") return;
  if (!job.imageUri) return;
  if (job.imageUploadStatus === "uploaded") return;

  useBackgroundScanStore
    .getState()
    .setImageUploadStatus(jobId, "uploading");

  const result = await uploadMealReviewImage({
    localUri: job.imageUri,
    userId: job.userId,
    scanId: job.id,
  });

  if (result.ok) {
    useBackgroundScanStore
      .getState()
      .setImageUploadStatus(jobId, "uploaded", result.imagePath);
    // Push the freshly minted image_path to the server row.
    void pushPendingReview(jobId);
  } else {
    useBackgroundScanStore
      .getState()
      .setImageUploadStatus(jobId, "failed");
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface RunBackgroundScanOptions {
  /** Free-text description from the camera retry flow (optional). */
  description?: string;
  /**
   * Whether the calling code already proved entitlement at capture time.
   * - "allowed" → skip the network recheck entirely (fast path)
   * - "needs_recheck" → run a one-shot recheck before the pipeline
   * - "premium_stale" → assume allowed but recheck in parallel
   */
  entitlement?: "allowed" | "needs_recheck" | "premium_stale";
  /** Whether a credit must be consumed (free tier path). */
  consumeCredit?: boolean;
}

/**
 * Drive a background scan to completion.
 * Reads the active job from the store and walks it through analyzing →
 * complete (or error). Safe to invoke from anywhere.
 */
export async function runBackgroundScan(
  jobId: string,
  options: RunBackgroundScanOptions = {}
): Promise<void> {
  const {
    description,
    entitlement = "allowed",
    consumeCredit = false,
  } = options;

  const job = getJob(jobId);
  if (!job) return;

  addFoodLoggingBreadcrumb("food_logging.background_scan_started", {
    job_id: jobId,
    entitlement,
    consume_credit: consumeCredit,
  });

  // ── 0. Server row create (fire-and-forget) ─────────────────────────
  // We push the queued row immediately so other devices can see the
  // "Recently uploaded / Analyzing" item even if the analysis later
  // fails or the device goes offline.
  void pushPendingReview(jobId);

  // ── 0b. Image upload (parallel with pipeline) ──────────────────────
  // Don't `await` this — runs alongside the AI work.
  void uploadImageInBackground(jobId);

  useBackgroundScanStore.getState().beginAnalyzing(jobId);
  setStage(jobId, "uploading");
  void pushPendingReview(jobId);

  try {
    // ── Entitlement gate (deferred network) ─────────────────────────
    if (entitlement === "needs_recheck") {
      const allowed = await rechecKEntitlement();
      if (allowed === false) {
        useBackgroundScanStore
          .getState()
          .failScan(jobId, "Out of free scans");
        addFoodLoggingBreadcrumb("food_logging.background_scan_failed", {
          job_id: jobId,
          reason: "entitlement_denied",
        });
        void pushPendingReview(jobId);
        return;
      }
      if (allowed === undefined) {
        useBackgroundScanStore
          .getState()
          .failScan(jobId, "Couldn't verify subscription");
        addFoodLoggingBreadcrumb("food_logging.background_scan_failed", {
          job_id: jobId,
          reason: "entitlement_unreachable",
        });
        void pushPendingReview(jobId);
        return;
      }
    } else if (entitlement === "premium_stale") {
      // Run alongside, do not block on result.
      void rechecKEntitlement();
    }

    // ── Credit decrement (local, fast) ─────────────────────────────
    if (consumeCredit) {
      try {
        await useScanCreditsStore.getState().consumeCredit();
      } catch {
        // Non-fatal — credit math is local; pipeline still proceeds.
      }
    }

    if (!isJobActive(jobId)) return;
    setStage(jobId, "identifying");

    // ── AI pipeline ────────────────────────────────────────────────
    // The existing image pipeline emits its own setStage updates and
    // calls `completeScan(jobId, draft)` / `failScan(jobId, ...)` on
    // the store directly.
    await runImagePipeline(jobId, job.imageUri, description);

    // After the pipeline, attach a final breadcrumb and push the
    // terminal row state (with draft + image_path if uploaded by now).
    const finalJob = getJob(jobId);
    if (finalJob) {
      if (finalJob.status === "complete") {
        addFoodLoggingBreadcrumb("food_logging.background_scan_success", {
          job_id: jobId,
          calories: finalJob.resultDraft?.calories,
        });
      } else if (finalJob.status === "error") {
        addFoodLoggingBreadcrumb("food_logging.background_scan_failed", {
          job_id: jobId,
          reason: "pipeline_error",
        });
      }
      void pushPendingReview(jobId);
    }
  } catch (e) {
    if (!isJobActive(jobId)) return;
    reportError(e, {
      area: "scan",
      action: "background_scan_service",
      extra: { jobId },
    });
    useBackgroundScanStore
      .getState()
      .failScan(jobId, "Unexpected error");
    addFoodLoggingBreadcrumb("food_logging.background_scan_failed", {
      job_id: jobId,
      reason: "unexpected_throw",
    });
    void pushPendingReview(jobId);
  }
}

/**
 * Re-run analysis for a specific failed job. Called from the Home card's
 * Retry button after an error. Resets the job to analyzing and walks it
 * through the pipeline again with the same image URI.
 */
export async function retryBackgroundScan(jobId?: string): Promise<void> {
  // Allow legacy callers that pass no id — pick the most recent error job.
  let targetId = jobId;
  if (!targetId) {
    const jobs = Object.values(useBackgroundScanStore.getState().jobs);
    const latestError = jobs
      .filter((j) => j.status === "error")
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
    if (!latestError) return;
    targetId = latestError.id;
  }
  const job = getJob(targetId);
  if (!job) return;
  addFoodLoggingBreadcrumb("food_logging.background_scan_retry", {
    job_id: targetId,
  });
  await runBackgroundScan(targetId, {
    entitlement: "allowed",
    consumeCredit: false,
  });
}

/**
 * User swiped to dismiss a pending review card. Marks the local job as
 * dismissed (filtered from UI) and pushes the soft-delete to the server.
 */
export function dismissPendingReview(jobId: string): void {
  const job = getJob(jobId);
  if (!job) return;
  addFoodLoggingBreadcrumb("food_logging.background_scan_dismissed", {
    job_id: jobId,
    status: job.status,
  });
  useBackgroundScanStore.getState().dismissScan(jobId);
  // Best-effort server soft-delete + image cleanup.
  void markServerReviewDismissed(jobId);
  // Best-effort durable local copy cleanup. The thumbnail is gone the
  // moment the card is filtered out so we don't need to keep the bytes.
  deleteDurableImage(jobId);
}
