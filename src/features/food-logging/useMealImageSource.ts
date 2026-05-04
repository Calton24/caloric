/**
 * useMealImageSource
 *
 * Single source of truth for resolving "what URI should the <Image>
 * actually point at?" for a pending-review thumbnail or confirm-meal
 * preview. The same priority order applies everywhere:
 *
 *   1. Signed URL derived from the storage `imagePath`. Lazily fetched the
 *      first time the hook sees a path and cached at module scope so
 *      every card sharing a path reuses the same URL until expiry.
 *   2. Local `imageUri` — either the durable copy in
 *      `Paths.document/meal-review-images-local/<jobId>.jpg` or the
 *      original VisionCamera capture URI.
 *   3. `null` — caller renders a placeholder. The card itself MUST stay
 *      visible: missing image is never a reason to hide a pending review.
 *
 * Caching:
 *   - Module-level Map keyed by `imagePath`.
 *   - Each entry remembers `{ url, expiresAt }`. We refresh ~10 minutes
 *     before the underlying signed URL expires (50-minute lifetime out of
 *     a 60-minute server TTL) so cards don't briefly flash a placeholder
 *     during the swap.
 *   - The same in-flight Promise is shared across concurrent callers so
 *     we don't trigger N parallel `createSignedUrl` requests when the
 *     "Recently uploaded" stack first mounts.
 *
 * Network awareness:
 *   - We never *block* on the signed-URL fetch. The hook returns the
 *     local URI synchronously on first paint and replaces it once the
 *     async fetch resolves. Offline boots therefore stay snappy and fall
 *     back gracefully.
 */

import { useEffect, useMemo, useState } from "react";

import { addFoodLoggingBreadcrumb } from "../../infrastructure/errorReporting/foodLoggingErrors";
import { getMealImageSignedUrl } from "./meal-image-upload.service";

/** Refresh the cache this many ms before the underlying URL expires. */
const REFRESH_BUFFER_MS = 10 * 60 * 1000; // 10 minutes
/** Default TTL we assume from the server when caching. Keep in sync with
 *  SIGNED_URL_TTL_SECONDS in meal-image-upload.service.ts. */
const SIGNED_URL_TTL_MS = 60 * 60 * 1000; // 60 minutes

interface CacheEntry {
  url: string;
  expiresAt: number;
}

const signedUrlCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<string | null>>();

function isFresh(entry: CacheEntry): boolean {
  return entry.expiresAt - REFRESH_BUFFER_MS > Date.now();
}

async function resolveSignedUrl(imagePath: string): Promise<string | null> {
  const cached = signedUrlCache.get(imagePath);
  if (cached && isFresh(cached)) return cached.url;

  let pending = inFlight.get(imagePath);
  if (!pending) {
    pending = (async () => {
      try {
        const url = await getMealImageSignedUrl(imagePath);
        if (url) {
          signedUrlCache.set(imagePath, {
            url,
            expiresAt: Date.now() + SIGNED_URL_TTL_MS,
          });
        }
        return url;
      } catch {
        return null;
      } finally {
        inFlight.delete(imagePath);
      }
    })();
    inFlight.set(imagePath, pending);
  }

  return pending;
}

export interface MealImageSourceInput {
  /** Server-authoritative storage path, e.g. `<userId>/<scanId>.jpg`. */
  imagePath?: string | null;
  /** Local file URI fallback. */
  imageUri?: string | null;
}

export interface MealImageSourceResult {
  /** Final URI to pass to `<Image source={{ uri }} />`. */
  uri: string | null;
  /** True when we're fetching a signed URL but already showing a fallback. */
  resolving: boolean;
}

/**
 * Hook returning the best image URI for a meal review card. Renders the
 * local URI immediately, then upgrades to the signed URL when the network
 * fetch resolves. If the signed URL fails (offline, expired path) it
 * sticks to the local URI without making the card disappear.
 */
export function useMealImageSource(
  input: MealImageSourceInput
): MealImageSourceResult {
  const { imagePath, imageUri } = input;
  const cachedSignedUrl = useMemo(() => {
    if (!imagePath) return null;
    const entry = signedUrlCache.get(imagePath);
    return entry && isFresh(entry) ? entry.url : null;
  }, [imagePath]);

  const [signedUrl, setSignedUrl] = useState<string | null>(cachedSignedUrl);
  const [signedFailed, setSignedFailed] = useState(false);
  const [resolving, setResolving] = useState(
    Boolean(imagePath) && !cachedSignedUrl
  );

  useEffect(() => {
    let cancelled = false;
    if (!imagePath) {
      setSignedUrl(null);
      setSignedFailed(false);
      setResolving(false);
      return () => {
        cancelled = true;
      };
    }

    // Sync local state with current cache entry on `imagePath` change.
    const entry = signedUrlCache.get(imagePath);
    if (entry && isFresh(entry)) {
      setSignedUrl(entry.url);
      setSignedFailed(false);
      setResolving(false);
      return () => {
        cancelled = true;
      };
    }

    setResolving(true);
    setSignedFailed(false);
    void resolveSignedUrl(imagePath).then((url) => {
      if (cancelled) return;
      setSignedUrl(url);
      setSignedFailed(!url);
      setResolving(false);
      if (!url) {
        addFoodLoggingBreadcrumb("food_logging.signed_url_unavailable", {
          image_path_hash: simpleHash(imagePath),
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [imagePath]);

  // Decide the active URI. Never return null when *any* fallback exists.
  const uri = signedUrl && !signedFailed
    ? signedUrl
    : imageUri && imageUri.length > 0
      ? imageUri
      : null;

  return { uri, resolving };
}

/**
 * Manually invalidate the cached signed URL for a given path. Called
 * when an `<Image onError>` handler observes that the cached URL no
 * longer resolves (e.g. the underlying object rotated server-side).
 */
export function invalidateSignedUrl(imagePath: string | null | undefined): void {
  if (!imagePath) return;
  signedUrlCache.delete(imagePath);
}

/** Tiny non-cryptographic hash so we can log a path-stable id without
 *  leaking the actual storage layout into breadcrumbs. */
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
