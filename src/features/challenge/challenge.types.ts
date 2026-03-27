// ── Challenge Types ──────────────────────────────────────────

export type ChallengeStatus =
  | "not_started"
  | "active"
  | "completed"
  | "expired"
  | "converted";

export type OfferType = "mid_challenge" | "completion" | "re_engagement";

export interface UserChallenge {
  id: string;
  userId: string;
  startedAt: string; // ISO timestamp
  challengeDays: number; // default 21
  status: ChallengeStatus;
  offerUnlocked: boolean;
  offerSeenAt: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Computed progress — derived from daily_log_dates, never stored.
 */
export interface ChallengeProgress {
  currentDay: number; // 1–challengeDays (calendar day)
  completedDays: number; // distinct logged days inside the window
  windowStart: string; // YYYY-MM-DD
  windowEnd: string; // YYYY-MM-DD
}

/**
 * Full challenge state combining record + computed progress.
 */
export interface ActiveChallengeState {
  challenge: UserChallenge;
  progress: ChallengeProgress;
  offerEligible: boolean;
  offerType: OfferType | null;
}
