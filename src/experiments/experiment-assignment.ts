/**
 * Experiment Assignment — Stable Per-User Bucketing
 *
 * Rules:
 * - Assign once per device/user
 * - Store in AsyncStorage via infrastructure abstraction
 * - Never re-roll unless experiment version changes
 *
 * The key includes version (e.g., "welcome_cta_v1") so bumping
 * version forces re-assignment for new test iterations.
 */

import { getStorage } from "../infrastructure/storage";
import type {
    ExperimentAssignments,
    ExperimentKey,
    Variant,
} from "./experiments";

const STORAGE_KEY = "ab_assignments_v1";
const FORCED_KEY = "ab_forced_variants_v1";

// In-memory cache to avoid async lookup on every render
let cachedAssignments: ExperimentAssignments | null = null;
let forcedVariants: Set<ExperimentKey> = new Set();

/**
 * 50/50 random split
 */
function randomVariant(): Variant {
  return Math.random() < 0.5 ? "A" : "B";
}

/**
 * Preload assignments into memory cache.
 * Call this early in app startup to avoid async delays in components.
 */
export async function preloadExperimentAssignments(): Promise<void> {
  try {
    const storage = getStorage();
    const [rawAssignments, rawForced] = await Promise.all([
      storage.getItem(STORAGE_KEY),
      storage.getItem(FORCED_KEY),
    ]);
    cachedAssignments = rawAssignments ? JSON.parse(rawAssignments) : {};
    forcedVariants = rawForced ? new Set(JSON.parse(rawForced)) : new Set();
  } catch (error) {
    console.warn("[Experiments] Preload failed:", error);
    cachedAssignments = {};
    forcedVariants = new Set();
  }
}

/**
 * Get variant synchronously from cache (returns null if not preloaded).
 * Use this in render to avoid flicker.
 */
export function getExperimentVariantSync(
  experiment: ExperimentKey
): Variant | null {
  return cachedAssignments?.[experiment] ?? null;
}

/**
 * Check if a variant was debug-forced (for analytics tagging).
 */
export function isVariantForced(experiment: ExperimentKey): boolean {
  return forcedVariants.has(experiment);
}

/**
 * Get or assign a stable variant for an experiment.
 * Assignment is persisted — same user always sees same variant.
 */
export async function getExperimentVariant(
  experiment: ExperimentKey
): Promise<Variant> {
  try {
    // Check memory cache first
    if (cachedAssignments?.[experiment]) {
      return cachedAssignments[experiment]!;
    }

    const storage = getStorage();
    const raw = await storage.getItem(STORAGE_KEY);
    const assignments: ExperimentAssignments = raw ? JSON.parse(raw) : {};

    // Already assigned — return cached variant
    if (assignments[experiment]) {
      // Update memory cache
      cachedAssignments = assignments;
      return assignments[experiment]!;
    }

    // First exposure — assign and persist
    const variant = randomVariant();
    const next: ExperimentAssignments = {
      ...assignments,
      [experiment]: variant,
    };
    await storage.setItem(STORAGE_KEY, JSON.stringify(next));

    // Update memory cache
    cachedAssignments = next;
    return variant;
  } catch (error) {
    // Storage failure — default to A (control) to avoid breaking UX
    console.warn("[Experiments] Assignment failed, defaulting to A:", error);
    return "A";
  }
}

/**
 * Get all current assignments (for debugging/analytics)
 */
export async function getAllAssignments(): Promise<ExperimentAssignments> {
  try {
    const raw = await getStorage().getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Force a specific variant (for testing/debugging only).
 * Forced variants are tagged so analytics can filter them out.
 */
export async function forceVariant(
  experiment: ExperimentKey,
  variant: Variant
): Promise<void> {
  try {
    const storage = getStorage();
    const raw = await storage.getItem(STORAGE_KEY);
    const assignments: ExperimentAssignments = raw ? JSON.parse(raw) : {};
    const next = { ...assignments, [experiment]: variant };
    await storage.setItem(STORAGE_KEY, JSON.stringify(next));

    // Track that this variant was forced
    forcedVariants.add(experiment);
    await storage.setItem(
      FORCED_KEY,
      JSON.stringify(Array.from(forcedVariants))
    );

    // Update memory cache
    cachedAssignments = next;
  } catch (error) {
    console.warn("[Experiments] Force variant failed:", error);
  }
}

/**
 * Clear all assignments and forced flags (for testing/reset)
 */
export async function clearAllAssignments(): Promise<void> {
  try {
    const storage = getStorage();
    await Promise.all([
      storage.removeItem(STORAGE_KEY),
      storage.removeItem(FORCED_KEY),
    ]);
    cachedAssignments = null;
    forcedVariants.clear();
  } catch (error) {
    console.warn("[Experiments] Clear assignments failed:", error);
  }
}
