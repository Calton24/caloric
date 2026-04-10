/**
 * Insight Trigger Service — detects "wait, really?" moments.
 *
 * Pure function. Behaviour only — time never triggers alone.
 * Any single hard trigger = insightTriggered.
 */

import type { InsightInput } from "./challenge-monetisation.types";

// ── Thresholds ───────────────────────────────────────────────────────────

/** Minimum scans before insight can fire (engagement threshold). */
const SCAN_COUNT_THRESHOLD = 3;

/** Calorie deviation from target that triggers insight (kcal). */
const CALORIE_DEVIATION_THRESHOLD = 300;

/** Protein ratio below target that triggers insight (0–1 scale). */
const PROTEIN_RATIO_THRESHOLD = 0.5;

/** Daily intake percent consumed threshold. */
const DAILY_INTAKE_PERCENT_THRESHOLD = 0.7;

/** Hour-of-day ceiling for the "most calories by lunch" trigger. */
const TIME_OF_DAY_CEILING = 14;

// ── Detector ─────────────────────────────────────────────────────────────

/**
 * Evaluate whether the user's current session data contains
 * a behaviour-based insight moment.
 *
 * Hard triggers (any one = true), ordered by emotional weight:
 *   1. calorieDeviation > 300 — strongest pain signal
 *   2. proteinRatio < 0.5 — consequence-driven
 *   3. dailyIntakePercent > 0.7 && timeOfDay < 14 — behavioural pattern
 *   4. scanCount >= 3 — weakest signal, fallback only
 *
 * Returns true for the first matching trigger. Idempotent — calling
 * multiple times with the same input returns the same result.
 */
export function isInsightMoment(input: InsightInput): boolean {
  // Calorie deviation: significant gap between expected and actual (strongest)
  if (input.calorieDeviation > CALORIE_DEVIATION_THRESHOLD) {
    return true;
  }

  // Protein deficit: well below target
  if (input.proteinRatio < PROTEIN_RATIO_THRESHOLD) {
    return true;
  }

  // Front-loaded eating: most calories consumed before 2pm
  if (
    input.dailyIntakePercent > DAILY_INTAKE_PERCENT_THRESHOLD &&
    input.timeOfDay < TIME_OF_DAY_CEILING
  ) {
    return true;
  }

  // Engagement threshold: enough scans to have real data (fallback)
  if (input.scanCount >= SCAN_COUNT_THRESHOLD) {
    return true;
  }

  return false;
}

/**
 * Get a human-readable insight message for the first matching trigger.
 * Returns null if no trigger matched.
 *
 * Priority: calorie > protein > front-loaded > scan (fallback).
 * Always show the most painful insight available.
 */
export function getInsightMessage(input: InsightInput): string | null {
  if (input.calorieDeviation > CALORIE_DEVIATION_THRESHOLD) {
    return `You're ${Math.round(input.calorieDeviation)} calories off your target — this is likely affecting your results.`;
  }

  if (input.proteinRatio < PROTEIN_RATIO_THRESHOLD) {
    return `Your protein is ${Math.round((1 - input.proteinRatio) * 100)}% below target — this is limiting your progress.`;
  }

  if (
    input.dailyIntakePercent > DAILY_INTAKE_PERCENT_THRESHOLD &&
    input.timeOfDay < TIME_OF_DAY_CEILING
  ) {
    return `${Math.round(input.dailyIntakePercent * 100)}% of your calories are before lunch — this can throw off your energy and hunger balance.`;
  }

  if (input.scanCount >= SCAN_COUNT_THRESHOLD) {
    return "A pattern is already forming in how you eat — and it's affecting your results.";
  }

  return null;
}
