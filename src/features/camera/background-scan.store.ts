/**
 * Background Scan Store — Pending Review Queue
 *
 * Single-source-of-truth for the "Recently uploaded" Home stack. Lives at
 * root scope so the Home screen owns the full analysis lifecycle, not the
 * camera modal.
 *
 * Multi-item queue: this store holds a *map* of jobs keyed by id. The
 * camera modal can fire-and-forget multiple captures in a row and each
 * one gets its own row. The Home screen renders them newest-first.
 *
 * Lifecycle (per job):
 *   queued     — captured, scan id minted, pipeline not started yet
 *   analyzing  — pipeline running, stage updates flow into the store
 *   complete   — pipeline produced a draft; user can press Review
 *   error      — pipeline failed; user can press Retry or Dismiss
 *   saved      — user reviewed + saved (kept for sync only, filtered from UI)
 *   dismissed  — user swiped to delete (kept for sync only, filtered from UI)
 *
 * Persistence:
 *   The map is persisted via AsyncStorage so jobs survive:
 *     - background → foreground transitions
 *     - app restarts (within TTL)
 *     - route changes
 *
 * TTL:
 *   24 hours from `createdAt`. Jobs older than that are purged on rehydrate
 *   and on Home mount.
 *
 * Stale-write guard:
 *   Every mutation looks up the job by id. If the id is missing (purged,
 *   dismissed, or never existed), the mutation is silently dropped — so a
 *   late pipeline write from a job the user already deleted can't resurrect
 *   it.
 *
 * Server reconciliation:
 *   `pending-review.service.ts` calls `upsertJob(...)` with rows pulled
 *   from `pending_meal_reviews`. The local optimistic copy stays the
 *   source of truth between push and pull.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { MealDraft } from "../nutrition/nutrition.draft.types";
import { getStorage } from "../../infrastructure/storage";
import { addFoodLoggingBreadcrumb } from "../../infrastructure/errorReporting/foodLoggingErrors";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScanJobStatus =
  | "queued"
  | "analyzing"
  | "complete"
  | "error"
  | "saved"
  | "dismissed";

export type ScanStage =
  | "uploading"
  | "identifying"
  | "estimating"
  | "preparing";

/** Status of the (decoupled) image upload to Supabase Storage. */
export type ImageUploadStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "failed";

/**
 * Per-job pending server sync record. When set, the job has a local mutation
 * that has NOT yet been confirmed by Supabase. The outbox replay walks this
 * field on login + foreground and retries the corresponding server call.
 *
 *   - "upsert"  — active job (queued/analyzing/complete/error) was never
 *                 successfully pushed to `pending_meal_reviews`.
 *   - "save"    — local job was marked `saved` but the server PATCH didn't
 *                 land yet. We must replay before any pull, otherwise the
 *                 server's stale `complete` row would resurrect the card.
 *   - "dismiss" — local job was swiped to `dismissed`; same risk as `save`.
 */
export interface PendingServerSync {
  type: "upsert" | "save" | "dismiss";
  attempts: number;
  lastAttemptAt?: string;
  reason?: string;
}

export interface BackgroundScanJob {
  /** Unique ID for this capture — used as stale-write guard everywhere. */
  id: string;
  /** Owning user id, or "anon" for unauthenticated capture. */
  userId: string;

  /** Local file URI (file://…). Optimistic; may not survive OS cleanup. */
  imageUri: string;
  /** Storage object path inside `meal-review-images`. Set after upload. */
  imagePath?: string;
  /** Status of the parallel storage upload. */
  imageUploadStatus: ImageUploadStatus;

  status: ScanJobStatus;
  /** Coarse stage indicator for the analyzing UI. */
  stage: ScanStage;
  /** 0..1 progress fraction reflecting real pipeline progress. */
  progress: number;

  createdAt: string;
  updatedAt: string;

  /** Successful result. Only set when status === "complete" / "saved". */
  resultDraft?: MealDraft;

  /** When the user has pressed Save and a `meal_entries` row was created. */
  savedMealId?: string;

  /** Reason if status === "error". Safe to surface to the user. */
  errorMessage?: string;

  /** True if the row has been pushed to Supabase at least once. */
  syncedAt?: string;

  /**
   * Outstanding server sync, if any. `undefined` means the local row matches
   * the last known server state. See {@link PendingServerSync}.
   */
  pendingServerSync?: PendingServerSync;
}

export interface StartScanInput {
  imageUri: string;
  userId?: string;
}

interface BackgroundScanStore {
  /** Full map of jobs — UI selects newest-first via `selectVisibleJobs`. */
  jobs: Record<string, BackgroundScanJob>;

  // ── Mutations ──────────────────────────────────────────────────────────

  /** Create a new scan job. Returns the new id. */
  startScan(input: StartScanInput): string;

  /** Mark the scan as actively analyzing. */
  beginAnalyzing(jobId: string): void;

  /** Update the visible stage + progress fraction. */
  setStage(jobId: string, stage: ScanStage, progress: number): void;

  /** Mark complete with a draft. */
  completeScan(jobId: string, draft: MealDraft): void;

  /** Mark failed with a friendly reason. */
  failScan(jobId: string, errorMessage: string): void;

  /** Soft delete — user swiped to dismiss. */
  dismissScan(jobId: string): void;

  /** Mark as saved — user reviewed and saved into meal_entries. */
  markScanSaved(jobId: string, savedMealId: string): void;

  /** Update image upload progress / status. */
  setImageUploadStatus(
    jobId: string,
    status: ImageUploadStatus,
    imagePath?: string
  ): void;

  /**
   * Replace the optimistic local URI with a durable copy (e.g. document
   * directory) so the thumbnail survives app restarts.
   */
  setLocalImageUri(jobId: string, imageUri: string): void;

  /** Mark the row as synced to the server. */
  markSynced(jobId: string): void;

  /**
   * Record an outstanding server sync. Called after a server write fails,
   * after `markScanSaved`/`dismissScan` (until confirmed), or when an active
   * job has not yet been pushed.
   */
  markServerSyncPending(jobId: string, sync: PendingServerSync): void;

  /** Clear the outstanding server sync once Supabase has confirmed it. */
  clearServerSyncPending(jobId: string): void;

  /** Upsert a row pulled from the server (reconciliation). */
  upsertJob(job: BackgroundScanJob): void;

  /** Hard remove a job from the local map (e.g. after server delete). */
  removeJob(jobId: string): void;

  /** Clear all jobs in terminal states. Use sparingly. */
  resetScan(): void;

  /**
   * Drop jobs older than `ttlMs` (default 24h). Returns number cleared.
   * Called on rehydrate and on Home mount.
   */
  purgeIfExpired(ttlMs?: number): number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const STAGE_PROGRESS: Record<ScanStage, number> = {
  uploading: 0.15,
  identifying: 0.45,
  estimating: 0.75,
  preparing: 0.95,
};

/** Statuses surfaced in the Home "Recently uploaded" stack. */
const VISIBLE_STATUSES: ReadonlySet<ScanJobStatus> = new Set([
  "queued",
  "analyzing",
  "complete",
  "error",
]);

/**
 * Local terminal hidden statuses. Once a job lands on one of these the user
 * has explicitly resolved it — the server must NEVER be allowed to resurrect
 * the card with a stale active status. The merge in {@link upsertJob} keeps
 * these sacred.
 */
const HIDDEN_TERMINAL_STATUSES: ReadonlySet<ScanJobStatus> = new Set([
  "saved",
  "dismissed",
]);

function statusRank(status: ScanJobStatus): number {
  // Higher = "more authoritative for visibility decisions".
  switch (status) {
    case "saved":
    case "dismissed":
      return 4;
    case "complete":
      return 3;
    case "error":
      return 2;
    case "analyzing":
      return 1;
    case "queued":
    default:
      return 0;
  }
}

function olderOrEqual(aIso: string | undefined, bIso: string | undefined): boolean {
  // Returns true when `a` is older than or equal to `b`. Missing dates sort
  // oldest so a remote row without `updatedAt` never wins over local state.
  const aMs = aIso ? new Date(aIso).getTime() : 0;
  const bMs = bIso ? new Date(bIso).getTime() : 0;
  return aMs <= bMs;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

function newId(): string {
  return `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function patchJob(
  jobs: Record<string, BackgroundScanJob>,
  jobId: string,
  patch: Partial<BackgroundScanJob>
): Record<string, BackgroundScanJob> | null {
  const existing = jobs[jobId];
  if (!existing) return null;
  return {
    ...jobs,
    [jobId]: { ...existing, ...patch, updatedAt: now() },
  };
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useBackgroundScanStore = create<BackgroundScanStore>()(
  persist(
    (set, get) => ({
      jobs: {},

      startScan({ imageUri, userId }) {
        const id = newId();
        const ts = now();
        const job: BackgroundScanJob = {
          id,
          userId: userId ?? "anon",
          imageUri,
          imageUploadStatus: "pending",
          status: "queued",
          stage: "uploading",
          progress: STAGE_PROGRESS.uploading,
          createdAt: ts,
          updatedAt: ts,
        };
        set((state) => ({ jobs: { ...state.jobs, [id]: job } }));
        return id;
      },

      beginAnalyzing(jobId) {
        const next = patchJob(get().jobs, jobId, { status: "analyzing" });
        if (next) set({ jobs: next });
      },

      setStage(jobId, stage, progress) {
        const next = patchJob(get().jobs, jobId, {
          stage,
          progress: Math.max(0, Math.min(1, progress)),
        });
        if (next) set({ jobs: next });
      },

      completeScan(jobId, draft) {
        const next = patchJob(get().jobs, jobId, {
          status: "complete",
          stage: "preparing",
          progress: 1,
          resultDraft: draft,
        });
        if (next) set({ jobs: next });
      },

      failScan(jobId, errorMessage) {
        const next = patchJob(get().jobs, jobId, {
          status: "error",
          errorMessage,
        });
        if (next) set({ jobs: next });
      },

      dismissScan(jobId) {
        // Local dismissal must immediately queue a server sync so that even
        // if the PATCH lands later (or after a restart), Supabase ends up
        // tagged `dismissed` and won't resurrect the card via the next pull.
        const next = patchJob(get().jobs, jobId, {
          status: "dismissed",
          pendingServerSync: {
            type: "dismiss",
            attempts: 0,
          },
        });
        if (next) set({ jobs: next });
      },

      markScanSaved(jobId, savedMealId) {
        // Same race protection as `dismissScan` — keep the saved status local
        // until the server confirms, otherwise a stale `complete` row would
        // resurrect the card on the next sync.
        const next = patchJob(get().jobs, jobId, {
          status: "saved",
          savedMealId,
          pendingServerSync: {
            type: "save",
            attempts: 0,
          },
        });
        if (next) set({ jobs: next });
      },

      setImageUploadStatus(jobId, status, imagePath) {
        const patch: Partial<BackgroundScanJob> = {
          imageUploadStatus: status,
        };
        if (imagePath) patch.imagePath = imagePath;
        const next = patchJob(get().jobs, jobId, patch);
        if (next) set({ jobs: next });
      },

      setLocalImageUri(jobId, imageUri) {
        if (!imageUri) return;
        const next = patchJob(get().jobs, jobId, { imageUri });
        if (next) set({ jobs: next });
      },

      markSynced(jobId) {
        const existing = get().jobs[jobId];
        if (!existing) return;
        const next = patchJob(get().jobs, jobId, {
          syncedAt: now(),
          // A successful server write clears the outstanding sync record.
          pendingServerSync: undefined,
        });
        if (next) set({ jobs: next });
      },

      markServerSyncPending(jobId, sync) {
        const existing = get().jobs[jobId];
        if (!existing) return;
        const prev = existing.pendingServerSync;
        const merged: PendingServerSync = {
          type: sync.type,
          attempts: (prev?.attempts ?? 0) + (sync.attempts > 0 ? 0 : 1),
          lastAttemptAt: sync.lastAttemptAt ?? now(),
          reason: sync.reason ?? prev?.reason,
        };
        // Allow callers that pre-compute attempts to override.
        if (sync.attempts > 0) merged.attempts = sync.attempts;
        const next = patchJob(get().jobs, jobId, {
          pendingServerSync: merged,
        });
        if (next) set({ jobs: next });
      },

      clearServerSyncPending(jobId) {
        const existing = get().jobs[jobId];
        if (!existing || !existing.pendingServerSync) return;
        const next = patchJob(get().jobs, jobId, {
          pendingServerSync: undefined,
        });
        if (next) set({ jobs: next });
      },

      upsertJob(job) {
        set((state) => {
          const existing = state.jobs[job.id];

          // ── New row from the server ────────────────────────────────────
          if (!existing) {
            return { jobs: { ...state.jobs, [job.id]: job } };
          }

          // ── 1. Resurrection guard ──────────────────────────────────────
          // Local user-resolved statuses are sacred. The only way the server
          // can override them is by sending the same hidden status back —
          // anything else means our local mutation hasn't synced yet and we
          // re-arm the outbox so the replay closes the gap.
          if (HIDDEN_TERMINAL_STATUSES.has(existing.status)) {
            const remoteIsAlsoHidden = HIDDEN_TERMINAL_STATUSES.has(job.status);
            if (remoteIsAlsoHidden) {
              // Server caught up. Drop the outbox entry, accept the server's
              // metadata for fields the local row doesn't authoritatively
              // own (saved_meal_id may have been set by another device).
              const merged: BackgroundScanJob = {
                ...existing,
                savedMealId: existing.savedMealId ?? job.savedMealId,
                imagePath: existing.imagePath ?? job.imagePath,
                syncedAt: job.updatedAt ?? job.syncedAt ?? existing.syncedAt,
                pendingServerSync: undefined,
              };
              return { jobs: { ...state.jobs, [job.id]: merged } };
            }

            // Remote is still active (queued/analyzing/complete/error).
            // Keep local hidden status. Make sure the outbox replay knows it
            // still owes the server an update.
            try {
              addFoodLoggingBreadcrumb(
                "[PendingReviewRestore] resurrect_prevented",
                {
                  job_id: job.id,
                  local_status: existing.status,
                  remote_status: job.status,
                }
              );
            } catch {
              // breadcrumb is best-effort
            }
            const ensured: BackgroundScanJob = {
              ...existing,
              imagePath: existing.imagePath ?? job.imagePath,
              pendingServerSync: existing.pendingServerSync ?? {
                type: existing.status === "saved" ? "save" : "dismiss",
                attempts: 0,
              },
            };
            return { jobs: { ...state.jobs, [job.id]: ensured } };
          }

          // ── 2. Non-terminal merge by updatedAt ─────────────────────────
          const localNewer = !olderOrEqual(
            existing.updatedAt,
            job.updatedAt ?? job.syncedAt
          );

          if (localNewer) {
            try {
              addFoodLoggingBreadcrumb(
                "[PendingReviewRestore] local_wins",
                {
                  job_id: job.id,
                  local_status: existing.status,
                  remote_status: job.status,
                }
              );
            } catch {
              // breadcrumb is best-effort
            }
            // Local is fresher. Keep everything except patch in remote-only
            // metadata that local couldn't have produced (e.g. server
            // assigned image_path or saved_meal_id).
            const merged: BackgroundScanJob = {
              ...existing,
              imagePath: existing.imagePath ?? job.imagePath,
              savedMealId: existing.savedMealId ?? job.savedMealId,
            };
            // Mark for push if the server snapshot is older than local.
            if (!merged.syncedAt || olderOrEqual(merged.syncedAt, existing.updatedAt)) {
              merged.pendingServerSync = merged.pendingServerSync ?? {
                type: "upsert",
                attempts: 0,
              };
            }
            return { jobs: { ...state.jobs, [job.id]: merged } };
          }

          // Remote is newer (or equal). Take server status/draft/progress
          // but preserve local-only fields the server can't know:
          //   - durable local file URI (local copy survives upload failures)
          //   - imageUploadStatus when local has already uploaded
          //   - imagePath if local has it and remote does not
          //   - in-flight pendingServerSync (still owed mutations)
          try {
            addFoodLoggingBreadcrumb(
              "[PendingReviewRestore] server_wins",
              {
                job_id: job.id,
                local_status: existing.status,
                remote_status: job.status,
              }
            );
          } catch {
            // breadcrumb is best-effort
          }
          // Never roll progress backwards.
          const progress = Math.max(
            job.progress ?? 0,
            // Only keep local progress if local status hasn't been superseded.
            statusRank(existing.status) >= statusRank(job.status)
              ? existing.progress
              : 0
          );
          const merged: BackgroundScanJob = {
            ...existing,
            ...job,
            imageUri: existing.imageUri || job.imageUri,
            imagePath: job.imagePath ?? existing.imagePath,
            imageUploadStatus:
              existing.imageUploadStatus === "uploaded"
                ? existing.imageUploadStatus
                : job.imageUploadStatus,
            progress,
            // The outbox is local-only state — never let the server clear it.
            pendingServerSync: existing.pendingServerSync,
          };
          return { jobs: { ...state.jobs, [job.id]: merged } };
        });
      },

      removeJob(jobId) {
        set((state) => {
          if (!state.jobs[jobId]) return state;
          const next = { ...state.jobs };
          delete next[jobId];
          return { jobs: next };
        });
      },

      resetScan() {
        set((state) => {
          const next: Record<string, BackgroundScanJob> = {};
          for (const [id, job] of Object.entries(state.jobs)) {
            if (VISIBLE_STATUSES.has(job.status)) next[id] = job;
          }
          return { jobs: next };
        });
      },

      purgeIfExpired(ttlMs = TWENTY_FOUR_HOURS_MS) {
        const cutoff = Date.now() - ttlMs;
        let cleared = 0;
        const next: Record<string, BackgroundScanJob> = {};
        for (const [id, job] of Object.entries(get().jobs)) {
          const ageOk = new Date(job.createdAt).getTime() >= cutoff;
          if (ageOk) {
            next[id] = job;
          } else {
            cleared += 1;
          }
        }
        if (cleared > 0) set({ jobs: next });
        return cleared;
      },
    }),
    {
      name: "caloric-background-scan",
      storage: createJSONStorage(() => getStorage()),
      partialize: (state) => ({ jobs: state.jobs }),
      // Migrate the legacy single-item shape (`job: T | null`) into the new
      // map shape. Old persisted state has `{ job: ... }`; new state has
      // `{ jobs: { id: ... } }`.
      migrate: (persisted, version) => {
        if (version < 3 && persisted && typeof persisted === "object") {
          const legacy = persisted as { job?: BackgroundScanJob | null };
          if (legacy.job) {
            return {
              jobs: {
                [legacy.job.id]: {
                  ...legacy.job,
                  imageUploadStatus:
                    (legacy.job as BackgroundScanJob).imageUploadStatus ??
                    "pending",
                },
              },
            };
          }
        }
        return persisted as { jobs: Record<string, BackgroundScanJob> };
      },
      onRehydrateStorage: () => (rehydrated) => {
        rehydrated?.purgeIfExpired();
        try {
          const count = rehydrated
            ? Object.keys(rehydrated.jobs ?? {}).length
            : 0;
          addFoodLoggingBreadcrumb("[PendingReviewRestore] local_loaded", {
            count,
          });
        } catch {
          // breadcrumb is best-effort
        }
      },
      version: 3,
    }
  )
);

// ─── Selectors ───────────────────────────────────────────────────────────────

/**
 * Visible jobs for the Home stack, newest first.
 * Filters out `saved` and `dismissed` (those are kept locally for sync).
 */
export function selectVisibleJobs(
  state: BackgroundScanStore
): BackgroundScanJob[] {
  const all = Object.values(state.jobs);
  const visible = all.filter((j) => VISIBLE_STATUSES.has(j.status));
  visible.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return visible;
}

/**
 * The single most-recent active job (queued or analyzing). Used by callers
 * that historically expected a single in-flight scan (e.g. the camera retry
 * path). Returns null if none.
 */
export function selectActiveJob(
  state: BackgroundScanStore
): BackgroundScanJob | null {
  const all = Object.values(state.jobs);
  const inflight = all.filter(
    (j) => j.status === "queued" || j.status === "analyzing"
  );
  if (inflight.length === 0) return null;
  inflight.sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return inflight[0];
}

/** Look up a single job by id. */
export function selectJob(
  state: BackgroundScanStore,
  jobId: string | null | undefined
): BackgroundScanJob | null {
  if (!jobId) return null;
  return state.jobs[jobId] ?? null;
}

/**
 * All jobs with an outstanding {@link PendingServerSync} entry. The outbox
 * replay walks this list newest-first and retries each one.
 */
export function selectJobsWithPendingSync(
  state: BackgroundScanStore
): BackgroundScanJob[] {
  return Object.values(state.jobs)
    .filter((j) => Boolean(j.pendingServerSync))
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
}

export const SCAN_STAGE_PROGRESS = STAGE_PROGRESS;
