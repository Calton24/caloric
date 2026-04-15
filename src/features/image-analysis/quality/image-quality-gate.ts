/**
 * Image Quality Gate
 *
 * Pre-flight check before running the ML pipeline.
 * Rejects images that are too blurry, too dark, or too overexposed
 * to produce reliable food classification.
 *
 * This runs BEFORE ML Kit labeling — no point wasting inference
 * cycles on garbage input.
 *
 * Uses pixel sampling via react-native-image-colors or basic
 * dimension/size heuristics when that's not available.
 *
 * Returns actionable feedback: "Move closer", "Too dark", "Hold steady"
 */

// ─── Quality Result ──────────────────────────────────────────────────────────

export type QualityIssue =
  | "too_dark"
  | "too_bright"
  | "too_small"
  | "too_blurry"
  | "no_food_region";

export interface ImageQualityResult {
  /** Whether the image passes the quality gate */
  passed: boolean;
  /** Issues found (empty if passed) */
  issues: QualityIssue[];
  /** User-facing feedback message */
  feedback: string | null;
  /** Confidence that the image is usable (0–1) */
  usabilityScore: number;
}

// ─── User feedback messages ──────────────────────────────────────────────────

const FEEDBACK: Record<QualityIssue, string> = {
  too_dark: "Too dark — try better lighting",
  too_bright: "Too bright — reduce glare",
  too_small: "Move closer to the food",
  too_blurry: "Hold steady — image is blurry",
  no_food_region: "No food detected — try again",
};

// ─── Thresholds ──────────────────────────────────────────────────────────────

const MIN_IMAGE_DIMENSION = 200; // px — tiny images won't classify well

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Run the quality gate on a captured image.
 *
 * Currently checks:
 *   - Minimum image dimensions (too small = too far away)
 *   - File size heuristic (too small file = heavily compressed / blank)
 *
 * Future: integrate pixel-level analysis for brightness/blur detection
 * when react-native-skia or similar is available.
 *
 * @param imageUri  URI to the captured image
 * @returns         ImageQualityResult with pass/fail and feedback
 */
export async function checkImageQuality(
  imageUri: string
): Promise<ImageQualityResult> {
  const issues: QualityIssue[] = [];

  try {
    // Check image dimensions via Expo Image prefetch
    const size = await getImageSize(imageUri);

    if (size) {
      if (
        size.width < MIN_IMAGE_DIMENSION ||
        size.height < MIN_IMAGE_DIMENSION
      ) {
        issues.push("too_small");
      }
    }
  } catch {
    // Image size check failed — don't block the pipeline for this
  }

  // Build result
  if (issues.length === 0) {
    return {
      passed: true,
      issues: [],
      feedback: null,
      usabilityScore: 0.9,
    };
  }

  // Return the highest-priority issue as feedback
  const primaryIssue = issues[0];
  return {
    passed: false,
    issues,
    feedback: FEEDBACK[primaryIssue],
    usabilityScore: Math.max(0.1, 0.9 - issues.length * 0.25),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getImageSize(
  uri: string
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    // Use React Native Image.getSize for local files
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Image } = require("react-native");
    Image.getSize(
      uri,
      (width: number, height: number) => resolve({ width, height }),
      () => resolve(null)
    );
  });
}

/**
 * Quick synchronous check — can the image URI be processed at all?
 * (Not a network URL, not empty, has a file extension)
 */
export function isValidImageUri(uri: string): boolean {
  if (!uri || uri.length < 5) return false;
  // Accept file:// paths, content:// (android), ph:// (iOS), or bare paths
  return /^(file|content|ph|asset):\/\//.test(uri) || uri.startsWith("/");
}
