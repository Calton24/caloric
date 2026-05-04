import type { MealDraft } from "./nutrition.draft.types";

/**
 * Single persisted “scan finished but not saved” meal for Home recovery.
 * Not synced to Supabase; not counted as logged until confirm-meal save succeeds.
 */
export type PendingMealReviewSource =
  | "ai_camera"
  | "barcode"
  | "manual"
  | "voice";

export type PendingMealReview = {
  id: string;
  createdAt: string;
  expiresAt: string;
  source: PendingMealReviewSource;
  title: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  imageUri?: string;
  confidence?: number;
  /** Mirrors nutrition draft store `logDate` (non-today logging). */
  logDate: string | null;
  draft: MealDraft;
  status: "pending_review";
};
