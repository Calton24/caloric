/**
 * Retention Engine — Types
 *
 * Central type system for the 4-layer retention engine:
 * Hook → Loop → Pressure → Reward
 */

// ── Post-log feedback (shown immediately after logging a meal) ──

export interface PostLogFeedback {
  /** Primary message shown after logging */
  message: string;
  /** Secondary supporting message */
  subMessage: string;
  /** Emoji for visual emphasis */
  emoji: string;
  /** Feedback category */
  type: "progress" | "identity" | "pressure" | "celebration";
}

// ── Milestone pressure messages (day-specific) ──

export interface MilestonePressure {
  day: number;
  /** Pressure message — creates urgency */
  pressureMessage: string;
  /** Identity message — shifts self-perception */
  identityMessage: string;
  /** Social proof — comparison to other users */
  socialProof: string;
}

// ── Streak recovery (shown when streak breaks) ──

export interface StreakRecovery {
  /** The streak count that was lost */
  lostStreak: number;
  /** Primary recovery message */
  message: string;
  /** CTA text */
  ctaText: string;
  /** Urgency level */
  urgency: "gentle" | "firm" | "intense";
}

// ── Notification template categories ──

export type NotificationCategory = "reminder" | "pressure" | "identity";

export interface NotificationTemplate {
  category: NotificationCategory;
  title: string;
  body: string;
  /** Minimum streak day to send this template */
  minDay?: number;
  /** Maximum streak day (after which this stops) */
  maxDay?: number;
}

// ── Retention state (persisted) ──

export interface RetentionState {
  /** First meal ever logged timestamp */
  firstMealAt: string | null;
  /** Number of app opens */
  appOpens: number;
  /** Last app open date (YYYY-MM-DD) */
  lastOpenDate: string | null;
  /** Consecutive days the app was opened */
  openStreak: number;
  /** Last streak before it broke (for recovery messaging) */
  lastLostStreak: number;
  /** Whether the user saw the Day 1 auto-camera prompt */
  day1CameraShown: boolean;
  /** Notification template rotation index */
  notificationRotationIndex: number;
  /** Last paywall soft trigger date */
  lastSoftPaywallDate: string | null;
}
