/**
 * Milestone Insight Types
 *
 * Shared types for the unified coaching insight system.
 * Used by context builder, AI copy layer, fallback, and UI.
 */

// ── Identity tier system ─────────────────────────────────────

export interface IdentityTier {
  label: string;
  min: number;
  max: number;
}

export const IDENTITY_TIERS: IdentityTier[] = [
  { min: 1, max: 3, label: "Starting out" },
  { min: 4, max: 6, label: "Getting consistent" },
  { min: 7, max: 13, label: "Building momentum" },
  { min: 14, max: 29, label: "Locked in" },
  { min: 30, max: 59, label: "Disciplined" },
  { min: 60, max: 119, label: "Relentless" },
  { min: 120, max: Infinity, label: "Elite" },
];

export function getIdentityTier(streak: number): IdentityTier {
  return (
    IDENTITY_TIERS.find((t) => streak >= t.min && streak <= t.max) ??
    IDENTITY_TIERS[0]
  );
}

// ── Day quality scoring ──────────────────────────────────────

export type DayQuality = "not_started" | "secured" | "optimized" | "perfect";

export interface DayScore {
  quality: DayQuality;
  loggedMeals: number;
  withinCalorieRange: boolean;
  proteinTargetHit: boolean;
}

export function getDayScore(input: {
  loggedMeals: number;
  consumedCalories: number;
  targetCalories: number;
  consumedProtein: number;
  targetProtein: number;
}): DayScore {
  const {
    loggedMeals,
    consumedCalories,
    targetCalories,
    consumedProtein,
    targetProtein,
  } = input;

  const withinCalorieRange =
    targetCalories > 0 &&
    consumedCalories >= targetCalories * 0.85 &&
    consumedCalories <= targetCalories * 1.1;

  const proteinTargetHit =
    targetProtein > 0 && consumedProtein >= targetProtein * 0.85;

  let quality: DayQuality = "not_started";
  if (loggedMeals > 0) quality = "secured";
  if (withinCalorieRange || proteinTargetHit) quality = "optimized";
  if (withinCalorieRange && proteinTargetHit) quality = "perfect";

  return { quality, loggedMeals, withinCalorieRange, proteinTargetHit };
}

// ── Enums / unions ──────────────────────────────────────────

export type MilestoneInsightState =
  | "risk"
  | "recovery"
  | "milestone_achieved"
  | "milestone_preview"
  | "momentum";

export type MilestoneInsightTone =
  | "urgent"
  | "supportive"
  | "celebratory"
  | "grounded";

export type MilestoneInsightAccent =
  | "warning"
  | "success"
  | "neutral"
  | "highlight";

export type MilestoneInsightAction = "track_meal" | "open_streak" | "none";

export type MilestoneInsightIcon =
  | "shield"
  | "flame"
  | "target"
  | "trophy"
  | "refresh";

// ── Model (what the UI renders) ─────────────────────────────

export interface MilestoneInsightModel {
  state: MilestoneInsightState;
  tone: MilestoneInsightTone;
  accent: MilestoneInsightAccent;
  icon: MilestoneInsightIcon;
  action: MilestoneInsightAction;

  title: string;
  subtitle: string;
  chip?: string;
  ctaLabel?: string;

  progress?: {
    current: number;
    target: number;
  };

  streakCount: number;

  /** Identity tier derived from streak length */
  tier: IdentityTier;
  /** Day quality score for today */
  dayScore?: DayScore;

  /** Daily coaching insight — the actionable guidance layer */
  coachingInsight?: {
    states: string[];
    label: string;
    text: string;
  };
}

// ── Deterministic context (input to AI / fallback) ──────────

export interface MilestoneInsightContext {
  state: MilestoneInsightState;
  streakCount: number;
  hasLoggedToday: boolean;
  nextMilestone?: number;
  daysToNextMilestone?: number;
  recentTrend: "improving" | "steady" | "declining";
  adherence: "on_track" | "under" | "over" | "unknown";
  timeOfDay: "morning" | "afternoon" | "evening";
  goalType: "lose_weight" | "maintain_weight" | "gain_muscle" | "eat_healthier";
  lastLogHoursAgo: number | null;
  lostStreak?: number;

  /** Coaching states resolved from daily data (passed to AI for context) */
  coachingStates?: string[];
  /** Calories remaining today (passed to AI) */
  caloriesRemaining?: number;
  /** Protein remaining today (passed to AI) */
  proteinRemaining?: number;
  /** Identity tier label (passed to AI) */
  tier?: string;
}

// ── AI response shape (subset of model, text only) ──────────

export interface MilestoneInsightCopy {
  title: string;
  subtitle: string;
  chip?: string;
  ctaLabel?: string;
}

// ── Input to context builder ────────────────────────────────

export interface MilestoneInsightInput {
  currentStreak: number;
  lastLogDate: string | null;
  hasLoggedToday: boolean;
  /** Lost streak count (for recovery state) */
  lostStreak?: number;
  /** Whether recovery is active */
  streakRecoveryActive: boolean;
  /** Calorie summary for today */
  dailySummary?: {
    targetCalories?: number | null;
    consumedCalories?: number | null;
    consumedProtein?: number | null;
    targetProtein?: number | null;
    loggedMeals?: number;
  };
  goalType?:
    | "lose_weight"
    | "maintain_weight"
    | "gain_muscle"
    | "eat_healthier"
    | null;
  now?: Date;
}

// ── Style map entry ─────────────────────────────────────────

export interface MilestoneStyleConfig {
  accent: MilestoneInsightAccent;
  icon: MilestoneInsightIcon;
  defaultChip?: string;
  showProgress: boolean;
  defaultAction: MilestoneInsightAction;
}
