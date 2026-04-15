/**
 * Challenge Service — pure domain logic, no React, no IO.
 *
 * All functions take plain data and return plain data.
 * This makes the entire challenge rule-set trivially testable.
 */

import type {
    ActiveChallengeState,
    ChallengeProgress,
    ChallengeStatus,
    OfferType,
    UserChallenge,
} from "./challenge.types";

const OFFER_UNLOCK_DAYS = 14; // offer available from this completed-day count
const DEFAULT_CHALLENGE_DAYS = 21;

// ── Date helpers ─────────────────────────────────────────────

/** Returns YYYY-MM-DD in the device's local timezone. */
function toLocalDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Days between two YYYY-MM-DD strings (end - start, always >= 0). */
function daysBetween(startIso: string, endIso: string): number {
  const start = new Date(startIso + "T12:00:00").getTime();
  const end = new Date(endIso + "T12:00:00").getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

// ── Core domain logic ────────────────────────────────────────

/**
 * Create a new challenge record (id and timestamps set by caller / server).
 * Returns a partial record ready to be inserted.
 */
export function buildNewChallenge(
  userId: string
): Omit<UserChallenge, "id" | "createdAt" | "updatedAt"> {
  const now = new Date().toISOString();
  return {
    userId,
    startedAt: now,
    challengeDays: DEFAULT_CHALLENGE_DAYS,
    status: "active",
    offerUnlocked: false,
    offerSeenAt: null,
    convertedAt: null,
  };
}

/**
 * Compute the window boundaries for a challenge.
 */
export function computeWindow(
  challenge: Pick<UserChallenge, "startedAt" | "challengeDays">
): {
  windowStart: string;
  windowEnd: string;
} {
  // startedAt is a full ISO timestamp — parse it directly
  const start = new Date(challenge.startedAt);
  const windowStart = toLocalDate(start);

  const end = new Date(start);
  end.setDate(start.getDate() + challenge.challengeDays - 1);
  const windowEnd = toLocalDate(end);

  return { windowStart, windowEnd };
}

/**
 * Compute challenge progress from an array of logged dates.
 * loggedDates: array of YYYY-MM-DD strings (from daily_log_dates).
 * Only dates inside the challenge window are counted.
 */
export function computeProgress(
  challenge: Pick<UserChallenge, "startedAt" | "challengeDays">,
  loggedDates: string[],
  today: string = toLocalDate()
): ChallengeProgress {
  const { windowStart, windowEnd } = computeWindow(challenge);

  // Count distinct logged days inside window
  const inside = new Set(
    loggedDates.filter((d) => d >= windowStart && d <= windowEnd)
  );

  // Current calendar day: how many days have elapsed since start (1-indexed)
  const elapsed = daysBetween(windowStart, today);
  const currentDay = Math.max(
    1,
    Math.min(elapsed + 1, challenge.challengeDays)
  );

  return {
    currentDay,
    completedDays: inside.size,
    windowStart,
    windowEnd,
  };
}

/**
 * Determine what status the challenge SHOULD be in given current progress.
 * Does not mutate — returns the new status.
 */
export function computeStatus(
  challenge: Pick<
    UserChallenge,
    "startedAt" | "challengeDays" | "status" | "convertedAt"
  >,
  progress: ChallengeProgress,
  today: string = toLocalDate()
): ChallengeStatus {
  // Already terminal — conversion wins unconditionally
  if (challenge.convertedAt) return "converted";
  if (challenge.status === "converted") return "converted";

  // Completed: enough days logged inside the window
  if (progress.completedDays >= challenge.challengeDays) return "completed";

  // Expired: the calendar window has fully elapsed without enough logs
  if (
    today > progress.windowEnd &&
    progress.completedDays < challenge.challengeDays
  ) {
    return "expired";
  }

  return "active";
}

/**
 * Whether the early-user offer should be shown to this user.
 */
export function isOfferEligible(
  challenge: Pick<UserChallenge, "status" | "convertedAt">,
  progress: ChallengeProgress
): boolean {
  if (challenge.convertedAt) return false;
  if (challenge.status === "converted") return false;
  return progress.completedDays >= OFFER_UNLOCK_DAYS;
}

/**
 * Which framing variant the offer should use.
 */
export function getOfferType(
  challenge: Pick<UserChallenge, "status" | "convertedAt">,
  progress: ChallengeProgress
): OfferType | null {
  if (!isOfferEligible(challenge, progress)) return null;
  if (challenge.status === "completed") return "completion";
  if (challenge.status === "expired") return "re_engagement";
  // Active, but past mid-challenge threshold
  if (progress.completedDays >= OFFER_UNLOCK_DAYS) return "mid_challenge";
  return null;
}

/**
 * Compose the full ActiveChallengeState for UI consumption.
 */
export function buildActiveChallengeState(
  challenge: UserChallenge,
  loggedDates: string[],
  today: string = toLocalDate()
): ActiveChallengeState {
  const progress = computeProgress(challenge, loggedDates, today);
  const status = computeStatus(challenge, progress, today);
  // Use the derived status so offer framing matches the actual state
  const derived = { ...challenge, status };
  const offerEligible = isOfferEligible(derived, progress);
  const offerType = getOfferType(derived, progress);

  return {
    challenge: derived,
    progress,
    offerEligible,
    offerType,
  };
}

/**
 * Returns true if the challenge is in a terminal state.
 */
export function isChallengeTerminal(status: ChallengeStatus): boolean {
  return (
    status === "completed" || status === "expired" || status === "converted"
  );
}
