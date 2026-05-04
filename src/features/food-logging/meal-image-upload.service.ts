/**
 * Meal Image Upload Service
 *
 * Owns the lifecycle of a captured food photo from the local file system to
 * server-authoritative storage:
 *
 *   1. Compress the captured image (resize ≤ 1024px, JPEG q≈0.8). The same
 *      compression contract is used by `meal-analysis.service.ts`, so we
 *      keep the constants centralised there to avoid drift.
 *   2. Upload to the private Supabase Storage bucket `meal-review-images`
 *      under the path `<user_id>/<scan_id>.jpg`.
 *   3. Return the storage object path on success. The caller persists it on
 *      the corresponding `pending_meal_reviews` row.
 *
 * Read-side: `getMealImageSignedUrl(path)` returns a short-lived signed URL
 * the client uses when rendering an image (Home card, confirm-meal preview).
 *
 * Why a private bucket + signed URL:
 *   - Permanent public URLs leak meal photos to anyone with the link.
 *   - Signed URLs scope visibility per-session and rotate on demand.
 *
 * Failure semantics:
 *   - `uploadMealReviewImage` never throws synchronously. It resolves with
 *     `{ ok: false, reason }` so callers can distinguish "no upload yet"
 *     from a hard failure. The pending review row stays alive either way;
 *     UI falls back to the local URI until the next successful upload.
 */

import { Directory, File, Paths } from "expo-file-system";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

import { addFoodLoggingBreadcrumb } from "../../infrastructure/errorReporting/foodLoggingErrors";
import { reportError } from "../../infrastructure/errorReporting";
import { getSupabaseClient } from "../../lib/supabase/client";

export const MEAL_REVIEW_IMAGES_BUCKET = "meal-review-images";

/**
 * Subdirectory inside the app's document directory used to hold durable
 * copies of captured photos. VisionCamera writes the original frame into a
 * temp/cache path that the OS may evict between sessions, so we copy each
 * capture here under a deterministic `<jobId>.jpg` filename. The Home
 * stack's thumbnail falls back to this URI when the signed URL isn't
 * available offline.
 */
const DURABLE_IMAGES_DIR_NAME = "meal-review-images-local";

/** Same constants as meal-analysis to keep image budgets aligned. */
const MAX_IMAGE_DIMENSION = 1024;
const JPEG_QUALITY = 0.8;

/** Default signed URL TTL — long enough for a quick review session. */
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

// ─── Public API ──────────────────────────────────────────────────────────────

export type UploadResult =
  | { ok: true; imagePath: string }
  | {
      ok: false;
      reason:
        | "no_user"
        | "compress_failed"
        | "read_failed"
        | "upload_failed"
        | "unexpected";
      error?: unknown;
    };

export interface UploadMealReviewImageInput {
  /** Local file URI (e.g. file:///…/photo.jpg) */
  localUri: string;
  /** Authenticated user id; the storage path is namespaced by it. */
  userId: string;
  /** Stable id for this scan (used as filename). */
  scanId: string;
}

/**
 * Compress, upload, and return the storage object path.
 *
 * Path convention: `<userId>/<scanId>.jpg`. The leading folder must equal
 * `auth.uid()::text` for the storage RLS policy to allow the write.
 */
export async function uploadMealReviewImage(
  input: UploadMealReviewImageInput
): Promise<UploadResult> {
  const { localUri, userId, scanId } = input;

  if (!userId || userId === "anon") {
    addFoodLoggingBreadcrumb("food_logging.meal_image_upload_skipped", {
      scan_id: scanId,
      reason: "no_user",
    });
    return { ok: false, reason: "no_user" };
  }

  addFoodLoggingBreadcrumb("food_logging.meal_image_upload_started", {
    scan_id: scanId,
  });

  // ── 1. Compress ─────────────────────────────────────────────────────────
  let compressedUri: string;
  try {
    const result = await manipulateAsync(
      localUri,
      [{ resize: { width: MAX_IMAGE_DIMENSION } }],
      { compress: JPEG_QUALITY, format: SaveFormat.JPEG }
    );
    compressedUri = result.uri;
  } catch (e) {
    reportError(e, {
      area: "scan",
      action: "meal_image_compress",
      extra: { scanId, step: "compress" },
    });
    addFoodLoggingBreadcrumb("food_logging.meal_image_upload_failed", {
      scan_id: scanId,
      reason: "compress_failed",
    });
    return { ok: false, reason: "compress_failed", error: e };
  }

  // ── 2. Read bytes ───────────────────────────────────────────────────────
  let bytes: Uint8Array;
  try {
    const file = new File(compressedUri);
    bytes = await file.bytes();
  } catch (e) {
    reportError(e, {
      area: "scan",
      action: "meal_image_read_bytes",
      extra: { scanId, step: "read_bytes" },
    });
    addFoodLoggingBreadcrumb("food_logging.meal_image_upload_failed", {
      scan_id: scanId,
      reason: "read_failed",
    });
    return { ok: false, reason: "read_failed", error: e };
  }

  // ── 3. Upload ───────────────────────────────────────────────────────────
  const objectPath = `${userId}/${scanId}.jpg`;
  try {
    const { error } = await getSupabaseClient()
      .storage.from(MEAL_REVIEW_IMAGES_BUCKET)
      .upload(objectPath, bytes, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "3600",
      });

    if (error) {
      reportError(error, {
        area: "scan",
        action: "meal_image_storage_upload",
        extra: { scanId, step: "upload", path: objectPath },
      });
      addFoodLoggingBreadcrumb("food_logging.meal_image_upload_failed", {
        scan_id: scanId,
        reason: "upload_failed",
      });
      return { ok: false, reason: "upload_failed", error };
    }

    addFoodLoggingBreadcrumb("food_logging.meal_image_upload_succeeded", {
      scan_id: scanId,
      path: objectPath,
      bytes: bytes.byteLength,
    });
    return { ok: true, imagePath: objectPath };
  } catch (e) {
    reportError(e, {
      area: "scan",
      action: "meal_image_storage_upload_throw",
      extra: { scanId, step: "upload" },
    });
    addFoodLoggingBreadcrumb("food_logging.meal_image_upload_failed", {
      scan_id: scanId,
      reason: "unexpected",
    });
    return { ok: false, reason: "unexpected", error: e };
  }
}

/**
 * Return a short-lived signed URL for a stored meal-review image.
 * Returns null on any failure so callers can fall back to the local URI.
 */
export async function getMealImageSignedUrl(
  imagePath: string,
  ttlSeconds: number = SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  if (!imagePath) return null;
  try {
    const { data, error } = await getSupabaseClient()
      .storage.from(MEAL_REVIEW_IMAGES_BUCKET)
      .createSignedUrl(imagePath, ttlSeconds);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

/**
 * Best-effort delete of a stored image. Used when the user dismisses a
 * pending review so we don't leave orphan blobs in storage.
 * Failures are swallowed — the row update is the primary action.
 */
export async function deleteMealReviewImage(
  imagePath: string
): Promise<void> {
  if (!imagePath) return;
  try {
    await getSupabaseClient()
      .storage.from(MEAL_REVIEW_IMAGES_BUCKET)
      .remove([imagePath]);
  } catch {
    // Non-fatal — orphan blob will be cleaned up by future maintenance.
  }
}

// ─── Durable local copy ──────────────────────────────────────────────────────

function getDurableImagesDir(): Directory {
  const dir = new Directory(Paths.document, DURABLE_IMAGES_DIR_NAME);
  if (!dir.exists) {
    try {
      dir.create({ intermediates: true });
    } catch {
      // Best-effort: caller will fall back to the source URI.
    }
  }
  return dir;
}

function uriToFile(uri: string): File | null {
  try {
    return new File(uri);
  } catch {
    return null;
  }
}

/**
 * Copy a captured photo into the app's document directory under a stable,
 * deterministic filename. The resulting URI survives app restarts (unlike
 * the VisionCamera tmp/cache path) so the Home thumbnail keeps working
 * after a force-quit.
 *
 * Returns the durable file URI on success, `null` on any failure (caller
 * should keep using the original URI). Intentionally NEVER throws — the
 * camera UI must not be blocked or crashed by filesystem flakiness.
 */
export function copyImageToDurableLocation(
  srcUri: string,
  jobId: string
): string | null {
  if (!srcUri || !jobId) return null;
  try {
    const src = uriToFile(srcUri);
    if (!src || !src.exists) return null;

    const dir = getDurableImagesDir();
    const dest = new File(dir, `${jobId}.jpg`);

    if (dest.exists) {
      // Re-using a job id (retry path) — drop the previous copy first so
      // `copy` doesn't error on collision.
      try {
        dest.delete();
      } catch {
        // ignore
      }
    }

    src.copy(dest);

    addFoodLoggingBreadcrumb("food_logging.durable_image_copied", {
      job_id: jobId,
      bytes: dest.exists ? dest.info().size : undefined,
    });
    return dest.uri;
  } catch (e) {
    addFoodLoggingBreadcrumb("food_logging.durable_image_copy_failed", {
      job_id: jobId,
      reason: e instanceof Error ? e.message : String(e),
    });
    // Don't surface to Sentry — falling back to the temp URI is graceful.
    return null;
  }
}

/**
 * Resolve the durable file URI that {@link copyImageToDurableLocation}
 * would have produced for `jobId`, if the file actually exists. Returns
 * null otherwise. Used by the Home thumbnail to confirm a local fallback
 * is still on disk before pointing `<Image>` at it.
 */
export function getDurableImageUriIfExists(jobId: string): string | null {
  if (!jobId) return null;
  try {
    const dir = getDurableImagesDir();
    const file = new File(dir, `${jobId}.jpg`);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/**
 * Best-effort cleanup of the durable copy. Called when a job becomes
 * `saved` (and the remote upload exists) or `dismissed`. Swallows all
 * errors — orphan local files are cheap and we'd rather leak a few bytes
 * than crash the save flow on filesystem weirdness.
 */
export function deleteDurableImage(jobId: string): void {
  if (!jobId) return;
  try {
    const dir = getDurableImagesDir();
    const file = new File(dir, `${jobId}.jpg`);
    if (file.exists) {
      file.delete();
      addFoodLoggingBreadcrumb("food_logging.durable_image_deleted", {
        job_id: jobId,
      });
    }
  } catch {
    // Non-fatal.
  }
}
