/**
 * Milestone Pressure System
 *
 * Now delegates to day-journey.ts for the single source of truth.
 * Keeps the same public API for backward compatibility.
 */

import { getDayBanner, getDayContent, type JourneyPhase } from "./day-journey";
import type { MilestonePressure } from "./retention.types";

/**
 * Get the milestone pressure message for the current streak day.
 * Maps day-journey content into the MilestonePressure shape.
 */
export function getMilestonePressure(
  currentStreak: number
): MilestonePressure | null {
  if (currentStreak <= 0) return null;
  const content = getDayContent(currentStreak);
  return {
    day: content.day,
    pressureMessage: content.header,
    identityMessage: content.afterLogMessage,
    socialProof: content.sub,
  };
}

/**
 * Get pressure message specifically for the exact day.
 * Same as getMilestonePressure since day-journey has content for every day.
 */
export function getExactDayPressure(
  currentStreak: number
): MilestonePressure | null {
  return getMilestonePressure(currentStreak);
}

/**
 * Get the home screen banner for the current journey day.
 * Returns null if the user has already logged today.
 */
export function getDailyMotivation(
  currentStreak: number,
  hasLoggedToday: boolean
): { header: string; sub: string; phase: JourneyPhase; day: number } | null {
  return getDayBanner(currentStreak, hasLoggedToday);
}
