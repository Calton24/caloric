/**
 * Milestone Insight Types
 *
 * Shared types for the unified coaching insight system.
 * Used by context builder, AI copy layer, fallback, and UI.
 */

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
