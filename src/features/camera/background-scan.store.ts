import { create } from "zustand";
import type { MealDraft } from "../nutrition/nutrition.draft.types";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ScanJobStatus = "analyzing" | "complete" | "error";

export interface BackgroundScanJob {
  /** Unique ID for this capture — used as stale-write guard in the pipeline */
  id: string;
  createdAt: string;
  imageUri: string;
  status: ScanJobStatus;
  /** 0-based pipeline stage index (0..3) */
  stageIndex: number;
  /**
   * Tracks whether AnalyzingCard has already auto-opened the scan-result modal.
   * Kept on the store (not a component ref) so it survives home remounts and
   * background/foreground app cycles.
   */
  hasAutoOpened: boolean;
  draft?: MealDraft;
  error?: string;
}

interface BackgroundScanStore {
  /** The currently active job (only one at a time). */
  activeJobId: string | null;
  job: BackgroundScanJob | null;

  /**
   * Start a new scan job. Always replaces the existing job — previous job's
   * in-flight pipeline writes will be silently discarded via the stale-guard.
   * Returns the new jobId so the caller can pass it to runImagePipeline.
   */
  startScan(imageUri: string): string;

  /** Advance the pipeline stage. No-op if jobId is stale. */
  setStage(jobId: string, stage: number): void;

  /** Mark the scan complete with the resulting draft. No-op if jobId is stale. */
  completeScan(jobId: string, draft: MealDraft): void;

  /** Mark the scan as failed. No-op if jobId is stale. */
  failScan(jobId: string, error: string): void;

  /**
   * Mark that the auto-open gesture has been performed for this job.
   * Prevents the modal from re-opening on home remount. No-op if jobId is stale.
   */
  markAutoOpened(jobId: string): void;

  /** Clear the current job entirely (called after confirm or dismiss). */
  resetScan(): void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useBackgroundScanStore = create<BackgroundScanStore>(
  (set, get) => ({
    activeJobId: null,
    job: null,

    startScan(imageUri) {
      const id = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const job: BackgroundScanJob = {
        id,
        createdAt: new Date().toISOString(),
        imageUri,
        status: "analyzing",
        stageIndex: 0,
        hasAutoOpened: false,
      };
      set({ activeJobId: id, job });
      return id;
    },

    setStage(jobId, stage) {
      if (get().activeJobId !== jobId) return;
      set((s) => (s.job ? { job: { ...s.job, stageIndex: stage } } : {}));
    },

    completeScan(jobId, draft) {
      if (get().activeJobId !== jobId) return;
      set((s) =>
        s.job ? { job: { ...s.job, status: "complete", draft } } : {}
      );
    },

    failScan(jobId, error) {
      if (get().activeJobId !== jobId) return;
      set((s) => (s.job ? { job: { ...s.job, status: "error", error } } : {}));
    },

    markAutoOpened(jobId) {
      if (get().activeJobId !== jobId) return;
      set((s) => (s.job ? { job: { ...s.job, hasAutoOpened: true } } : {}));
    },

    resetScan() {
      set({ activeJobId: null, job: null });
    },
  })
);
