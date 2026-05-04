/**
 * Pending Meal Review — Server Sync
 *
 * Owns the request/response contract between the local pending-review
 * Zustand store (`useBackgroundScanStore`) and the `pending_meal_reviews`
 * Supabase table.
 *
 * Public surface:
 *   - `pushPendingReview(jobId)`        — upsert one local job → server
 *   - `pullPendingReviews()`            — fetch active rows for current user
 *   - `markServerReviewSaved(jobId, mealId)` — `status='saved'` + link
 *   - `markServerReviewDismissed(jobId)` — `status='dismissed'`
 *   - `restorePendingReviewsFromSupabase()` — bulk pull on auth
 *   - `replayPendingReviewOutbox(userId)` — retry queued offline mutations
 *
 * Strict rules:
 *   - All writes are fire-and-forget. Failures are surfaced as breadcrumbs
 *     and bubble through `reportError`. The local store keeps the user's
 *     state intact regardless of server outcome.
 *   - We never overwrite a local optimistic mutation with a stale server
 *     row. The store's `upsertJob` reconciler chooses the freshest data
 *     by `updated_at` and preserves local image/upload fields.
 *   - Failed writes set `pendingServerSync` on the job so the outbox replay
 *     (login / foreground / next manual restore) can retry.
 */

import {
  reportBreadcrumb,
  reportError,
} from "../../infrastructure/errorReporting";
import { addFoodLoggingBreadcrumb } from "../../infrastructure/errorReporting/foodLoggingErrors";
import { getCurrentUser, getSupabaseClient } from "../../lib/supabase/client";
import {
  type BackgroundScanJob,
  type ScanJobStatus,
  type ScanStage,
  selectJobsWithPendingSync,
  useBackgroundScanStore,
} from "../camera/background-scan.store";
import type { MealDraft } from "../nutrition/nutrition.draft.types";
import { deleteMealReviewImage } from "./meal-image-upload.service";

const TABLE = "pending_meal_reviews";

// Active statuses we care about pulling. `saved` and `dismissed` are kept
// server-side as audit but filtered out of the active queue.
const ACTIVE_STATUSES: readonly ScanJobStatus[] = [
  "queued",
  "analyzing",
  "complete",
  "error",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getUserId(): Promise<string | null> {
  try {
    const user = await getCurrentUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

function logSyncError(context: string, error: unknown): void {
  if (__DEV__) {
    console.warn(`[PendingReviewSync] ${context}:`, error);
  }
  reportBreadcrumb(`[PendingReviewSync] ${context} failed`, {
    area: "sync",
    action: context,
    provider: "supabase",
    level: "warning",
    extra: {
      errorMessage: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : undefined,
    },
  });
}

/**
 * Best-effort classifier — Supabase / fetch surfaces network errors as
 * `TypeError: Network request failed` or `AbortError`. We pessimistically
 * map anything that smells like "transport down" into the `offline` bucket
 * so the outbox keeps the row armed instead of giving up.
 */
function classifyPullError(
  error: unknown
): "offline" | "auth" | "server" | "unknown" {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const name = error instanceof Error ? error.name : "";
  const lower = msg.toLowerCase();
  if (
    name === "AbortError" ||
    lower.includes("network request failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("offline") ||
    lower.includes("timed out") ||
    lower.includes("timeout")
  ) {
    return "offline";
  }
  // Supabase returns 401/403 for auth issues.
  if (lower.includes("jwt") || lower.includes("unauthorized") || lower.includes("forbidden")) {
    return "auth";
  }
  // Anything with a 5xx-ish flavor → server.
  if (lower.match(/\b5\d\d\b/)) return "server";
  return "unknown";
}

// ─── Row mapping ─────────────────────────────────────────────────────────────

interface PendingReviewRow {
  id: string;
  user_id: string;
  status: ScanJobStatus;
  source: string;
  stage: ScanStage | null;
  progress: number | null;
  title: string | null;
  calories: number | null;
  draft_json: MealDraft | null;
  image_path: string | null;
  image_uri: string | null;
  error_message: string | null;
  saved_meal_id: string | null;
  created_at: string;
  updated_at: string;
}

function jobToRow(job: BackgroundScanJob): Record<string, unknown> {
  return {
    id: job.id,
    user_id: job.userId,
    status: job.status,
    source: "ai_camera",
    stage: job.stage ?? null,
    progress: job.progress ?? 0,
    title: job.resultDraft?.title ?? null,
    calories: job.resultDraft?.calories ?? null,
    draft_json: job.resultDraft ?? null,
    image_path: job.imagePath ?? null,
    // We intentionally do NOT push the raw local URI to the server —
    // it's a `file://…` path that is meaningless to other devices and
    // can leak filesystem layout.
    image_uri: null,
    error_message: job.errorMessage ?? null,
    saved_meal_id: job.savedMealId ?? null,
    updated_at: new Date().toISOString(),
  };
}

function rowToJob(row: PendingReviewRow): BackgroundScanJob {
  return {
    id: row.id,
    userId: row.user_id,
    imageUri: row.image_uri ?? "",
    imagePath: row.image_path ?? undefined,
    imageUploadStatus: row.image_path ? "uploaded" : "pending",
    status: row.status,
    stage: (row.stage ?? "preparing") as ScanStage,
    progress: row.progress ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    resultDraft: row.draft_json ?? undefined,
    savedMealId: row.saved_meal_id ?? undefined,
    errorMessage: row.error_message ?? undefined,
    syncedAt: row.updated_at,
  };
}

// ─── Push ────────────────────────────────────────────────────────────────────

/**
 * Push a single job upsert to Supabase. Idempotent on `id`.
 * Best-effort. Marks the job as synced on success; on failure, marks the
 * job's outbox entry so the next replay tries again.
 */
export async function pushPendingReview(jobId: string): Promise<void> {
  const job = useBackgroundScanStore.getState().jobs[jobId];
  if (!job) return;

  // We can't sync anonymous captures.
  if (!job.userId || job.userId === "anon") return;

  // Hidden statuses use dedicated endpoints (markServerReviewSaved /
  // markServerReviewDismissed) so we don't accidentally upsert a row that
  // already represents a resolved local mutation.
  if (job.status === "saved" || job.status === "dismissed") {
    return;
  }

  try {
    const client = getSupabaseClient();
    const { error } = await client
      .from(TABLE)
      .upsert(jobToRow(job), { onConflict: "id" });
    if (error) throw error;

    useBackgroundScanStore.getState().markSynced(jobId);
    addFoodLoggingBreadcrumb("food_logging.pending_review_pushed", {
      job_id: jobId,
      status: job.status,
    });
  } catch (e) {
    logSyncError("pushPendingReview", e);
    // Re-arm the outbox so a future replay retries.
    const prev = useBackgroundScanStore.getState().jobs[jobId]?.pendingServerSync;
    useBackgroundScanStore.getState().markServerSyncPending(jobId, {
      type: "upsert",
      attempts: (prev?.attempts ?? 0) + 1,
      lastAttemptAt: new Date().toISOString(),
      reason: e instanceof Error ? e.message : String(e),
    });
    addFoodLoggingBreadcrumb("[PendingReviewOutbox] queued", {
      job_id: jobId,
      type: "upsert",
    });
    reportError(e, {
      area: "sync",
      action: "push_pending_review",
      extra: { jobId },
    });
  }
}

/** Mark the server row as `saved` and link it to a meal_entries id. */
export async function markServerReviewSaved(
  jobId: string,
  savedMealId: string
): Promise<void> {
  const job = useBackgroundScanStore.getState().jobs[jobId];
  if (!job || !job.userId || job.userId === "anon") return;

  try {
    const client = getSupabaseClient();
    // Upsert (not update) so an offline-only `save` for a row whose initial
    // upsert never landed still creates the canonical server record on
    // first connect. The id is namespaced by (id, user_id) via RLS, so an
    // upsert with full row data is safe and idempotent.
    const payload = {
      ...jobToRow({ ...job, status: "saved", savedMealId }),
      saved_meal_id: savedMealId,
    };
    const { error } = await client
      .from(TABLE)
      .upsert(payload, { onConflict: "id" });
    if (error) throw error;

    useBackgroundScanStore.getState().clearServerSyncPending(jobId);
    addFoodLoggingBreadcrumb("food_logging.pending_review_saved", {
      job_id: jobId,
      saved_meal_id: savedMealId,
    });
  } catch (e) {
    logSyncError("markServerReviewSaved", e);
    const prev =
      useBackgroundScanStore.getState().jobs[jobId]?.pendingServerSync;
    useBackgroundScanStore.getState().markServerSyncPending(jobId, {
      type: "save",
      attempts: (prev?.attempts ?? 0) + 1,
      lastAttemptAt: new Date().toISOString(),
      reason: e instanceof Error ? e.message : String(e),
    });
    addFoodLoggingBreadcrumb("[PendingReviewOutbox] queued", {
      job_id: jobId,
      type: "save",
    });
    reportError(e, {
      area: "sync",
      action: "mark_pending_review_saved",
      extra: { jobId, savedMealId },
    });
  }
}

/**
 * Soft-dismiss the server row. Best-effort image cleanup runs in parallel
 * so a dismissed scan does not leave a blob behind.
 */
export async function markServerReviewDismissed(
  jobId: string
): Promise<void> {
  const job = useBackgroundScanStore.getState().jobs[jobId];
  if (!job || !job.userId || job.userId === "anon") return;

  // Best-effort image delete — fire and forget.
  if (job.imagePath) {
    void deleteMealReviewImage(job.imagePath);
  }

  try {
    const client = getSupabaseClient();
    // Upsert so an offline-only dismiss for a never-synced row still
    // creates the canonical server record (status=dismissed).
    const payload = jobToRow({ ...job, status: "dismissed" });
    const { error } = await client
      .from(TABLE)
      .upsert(payload, { onConflict: "id" });
    if (error) throw error;

    useBackgroundScanStore.getState().clearServerSyncPending(jobId);
    addFoodLoggingBreadcrumb("food_logging.pending_review_dismissed_synced", {
      job_id: jobId,
    });
  } catch (e) {
    logSyncError("markServerReviewDismissed", e);
    const prev =
      useBackgroundScanStore.getState().jobs[jobId]?.pendingServerSync;
    useBackgroundScanStore.getState().markServerSyncPending(jobId, {
      type: "dismiss",
      attempts: (prev?.attempts ?? 0) + 1,
      lastAttemptAt: new Date().toISOString(),
      reason: e instanceof Error ? e.message : String(e),
    });
    addFoodLoggingBreadcrumb("[PendingReviewOutbox] queued", {
      job_id: jobId,
      type: "dismiss",
    });
    reportError(e, {
      area: "sync",
      action: "mark_pending_review_dismissed",
      extra: { jobId },
    });
  }
}

// ─── Pull ────────────────────────────────────────────────────────────────────

/**
 * Discriminated result of a server pull. Callers MUST distinguish "server
 * said zero rows" (`ok: true, rows: []`) from "we never reached the
 * server" (`ok: false, ...`) — silently merging the empty-array shape on
 * failure is what caused offline cold-starts to wipe the local queue.
 */
export type PullPendingReviewsResult =
  | { ok: true; rows: BackgroundScanJob[] }
  | {
      ok: false;
      reason: "offline" | "auth" | "server" | "unknown";
      error?: unknown;
    };

/**
 * Fetch all active pending review rows for the current user. Sorted
 * newest-first server-side.
 */
export async function pullPendingReviews(
  knownUserId?: string
): Promise<PullPendingReviewsResult> {
  const userId = knownUserId ?? (await getUserId());
  if (!userId) return { ok: false, reason: "auth" };

  addFoodLoggingBreadcrumb("[PendingReviewRestore] remote_pull_started", {
    user_present: true,
  });

  try {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(TABLE)
      .select("*")
      .eq("user_id", userId)
      .in("status", ACTIVE_STATUSES as unknown as string[])
      .order("created_at", { ascending: false });

    if (error) throw error;
    const rows = ((data ?? []) as PendingReviewRow[]).map(rowToJob);
    return { ok: true, rows };
  } catch (e) {
    const reason = classifyPullError(e);
    logSyncError("pullPendingReviews", e);
    addFoodLoggingBreadcrumb("[PendingReviewRestore] remote_pull_failed", {
      reason,
    });
    return { ok: false, reason, error: e };
  }
}

/**
 * Bulk pull on auth + reconcile into the local store. Adds new rows,
 * refreshes existing ones with the server snapshot. Local-only optimistic
 * jobs (still queued, not yet pushed) are untouched.
 *
 * IMPORTANT: when the pull fails (offline, auth, server), the local store
 * is left untouched. We only merge from the server when we *got* a real
 * answer — even if that answer is "zero rows".
 */
export async function restorePendingReviewsFromSupabase(
  knownUserId?: string
): Promise<void> {
  const result = await pullPendingReviews(knownUserId);

  if (!result.ok) {
    // Offline or transient — keep local cards, don't clear, don't merge.
    addFoodLoggingBreadcrumb("food_logging.pending_review_restore_skipped", {
      reason: result.reason,
    });
    // Best-effort: still try to drain the outbox. Most sync ops will fail
    // for the same underlying reason, but this is cheap and harmless.
    if (knownUserId) {
      void replayPendingReviewOutbox(knownUserId);
    }
    return;
  }

  const remote = result.rows;
  if (remote.length === 0) {
    addFoodLoggingBreadcrumb("food_logging.pending_review_restore_empty", {});
    addFoodLoggingBreadcrumb("[PendingReviewRestore] merge_complete", {
      count: 0,
    });
    if (knownUserId) {
      void replayPendingReviewOutbox(knownUserId);
    }
    return;
  }

  const store = useBackgroundScanStore.getState();
  for (const job of remote) {
    store.upsertJob(job);
  }
  addFoodLoggingBreadcrumb("food_logging.pending_review_restore_completed", {
    count: remote.length,
  });
  addFoodLoggingBreadcrumb("[PendingReviewRestore] merge_complete", {
    count: remote.length,
  });

  // After reconciliation, replay any local mutations that the server
  // hasn't seen yet. Order matters: pull → merge → push. If we replayed
  // first the outbound `dismiss` could overwrite the server's `complete`,
  // which is what we actually want — but doing it after the pull ensures
  // the outbox sees the freshest local state (the merge above may have
  // promoted some pending rows we didn't have visibility into).
  if (knownUserId) {
    void replayPendingReviewOutbox(knownUserId);
  }
}

// ─── Outbox replay ───────────────────────────────────────────────────────────

/**
 * Maximum retries before we surface the failure as an error and stop
 * spinning. The job stays armed; the user can reconnect / restart and we
 * try again from a clean attempt counter on the next `markScanSaved` /
 * `dismissScan` mutation.
 */
const MAX_OUTBOX_ATTEMPTS = 6;

/**
 * Walk the local jobs map and replay any outstanding mutation that hasn't
 * been confirmed by Supabase. Triggered after login restore, on app
 * foreground, and after any successful pull.
 *
 * Idempotent — each replay calls the same server endpoint as the original
 * mutation. Each successful endpoint clears `pendingServerSync` via
 * `markSynced` / `clearServerSyncPending`. Failures re-arm the entry with
 * a higher attempt counter via the same fail-path used at first call.
 */
export async function replayPendingReviewOutbox(
  userId: string
): Promise<void> {
  if (!userId || userId === "anon") return;

  const store = useBackgroundScanStore.getState();
  const jobs = selectJobsWithPendingSync(store as never).filter(
    (j) => j.userId === userId
  );
  if (jobs.length === 0) return;

  addFoodLoggingBreadcrumb("[PendingReviewOutbox] replayed", {
    count: jobs.length,
  });

  for (const job of jobs) {
    const sync = job.pendingServerSync;
    if (!sync) continue;
    if (sync.attempts >= MAX_OUTBOX_ATTEMPTS) {
      addFoodLoggingBreadcrumb("[PendingReviewOutbox] failed", {
        job_id: job.id,
        type: sync.type,
        attempts: sync.attempts,
      });
      continue;
    }

    try {
      switch (sync.type) {
        case "save":
          if (job.savedMealId) {
            await markServerReviewSaved(job.id, job.savedMealId);
          } else {
            // Saved without a linked meal id — this should not happen, but
            // we shouldn't keep retrying forever. Drop to dismiss-equivalent
            // upsert so the row at least reaches the server as `saved`.
            await pushPendingReview(job.id);
          }
          break;
        case "dismiss":
          await markServerReviewDismissed(job.id);
          break;
        case "upsert":
        default:
          await pushPendingReview(job.id);
          break;
      }
    } catch (e) {
      // The individual sync calls already report their own failures and
      // re-arm the outbox. Catch-all here only protects the loop.
      logSyncError("replayPendingReviewOutbox.iteration", e);
    }
  }
}
