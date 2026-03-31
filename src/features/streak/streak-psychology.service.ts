/**
 * Streak Psychology Service
 *
 * Pure functions for identity labels, progression messages,
 * streak-at-risk detection, streak freeze logic, and streak
 * break recovery. Part of the 4-layer retention engine.
 */

// ── Identity Labels ──────────────────────────────────────────

export interface StreakLabel {
  label: string;
  emoji: string;
  tier: "starter" | "building" | "strong" | "champion";
}

const STREAK_LABELS: { minDays: number; label: StreakLabel }[] = [
  {
    minDays: 90,
    label: { label: "Unstoppable", emoji: "👑", tier: "champion" },
  },
  {
    minDays: 60,
    label: { label: "Elite tracker", emoji: "💫", tier: "champion" },
  },
  {
    minDays: 30,
    label: { label: "Habit locked in", emoji: "🔒", tier: "champion" },
  },
  {
    minDays: 21,
    label: { label: "Challenge completed", emoji: "🏆", tier: "champion" },
  },
  { minDays: 14, label: { label: "Disciplined", emoji: "💎", tier: "strong" } },
  {
    minDays: 7,
    label: { label: "On a streak", emoji: "🔥", tier: "building" },
  },
  {
    minDays: 3,
    label: { label: "Getting consistent", emoji: "⚡", tier: "starter" },
  },
];

/** Get the identity label for a given streak length */
export function getStreakLabel(currentStreak: number): StreakLabel | null {
  for (const entry of STREAK_LABELS) {
    if (currentStreak >= entry.minDays) return entry.label;
  }
  return null;
}

// ── Progression Messages ─────────────────────────────────────

const PROGRESSION_MESSAGES: { minDays: number; message: string }[] = [
  { minDays: 90, message: "90 days. You're not tracking — you're living it." },
  { minDays: 60, message: "60 days of showing up. That's elite." },
  { minDays: 30, message: "A full month. This is permanent now." },
  { minDays: 21, message: "You've built a real habit. Keep it forever." },
  { minDays: 14, message: "Two weeks strong — this is who you are now." },
  { minDays: 7, message: "One week in. Most people quit by now. You didn't." },
  { minDays: 3, message: "Three days in — the hardest part is over." },
  { minDays: 1, message: "Day one done. Come back tomorrow." },
];

/** Get a motivational message based on streak progression */
export function getProgressionMessage(currentStreak: number): string | null {
  for (const entry of PROGRESSION_MESSAGES) {
    if (currentStreak >= entry.minDays) return entry.message;
  }
  return null;
}

// ── Streak At Risk Detection ─────────────────────────────────

/**
 * Returns true if the user has an active streak but hasn't logged
 * today and it's past the risk threshold (default: 6pm / 18:00).
 */
export function isStreakAtRisk(
  lastLogDate: string | null,
  currentStreak: number,
  now: Date = new Date()
): boolean {
  if (currentStreak === 0 || !lastLogDate) return false;

  const todayISO = toDateString(now);

  // Already logged today — not at risk
  if (lastLogDate === todayISO) return false;

  // Check it's past 6pm local time
  return now.getHours() >= 18;
}

/**
 * Returns an urgency level for streak risk messaging.
 * null = not at risk, "warning" = 6-9pm, "critical" = 9pm+
 */
export function getStreakUrgency(
  lastLogDate: string | null,
  currentStreak: number,
  now: Date = new Date()
): "warning" | "critical" | null {
  if (!isStreakAtRisk(lastLogDate, currentStreak, now)) return null;
  return now.getHours() >= 21 ? "critical" : "warning";
}

// ── Streak Freeze Logic ──────────────────────────────────────

/**
 * Determines if a streak freeze should activate.
 * A freeze is available once per streak cycle for pro users.
 * Returns true if the streak would have broken but can be saved.
 */
export function shouldActivateFreeze(
  lastLogDate: string | null,
  currentStreak: number,
  freezeAvailable: boolean,
  today: string = toDateString(new Date())
): boolean {
  if (!freezeAvailable || currentStreak === 0 || !lastLogDate) return false;

  const yesterday = subtractDays(today, 1);

  // If last log was before yesterday, the streak would break
  // and freeze should activate to save it
  return lastLogDate < yesterday;
}

// ── Next Milestone ───────────────────────────────────────────

const MILESTONE_DAYS = [3, 7, 14, 21, 30, 60, 90, 100, 365];

/** Returns the next milestone day count and days remaining */
export function getNextMilestone(currentStreak: number): {
  target: number;
  remaining: number;
} | null {
  for (const target of MILESTONE_DAYS) {
    if (currentStreak < target) {
      return { target, remaining: target - currentStreak };
    }
  }
  return null;
}

// ── Streak Break Detection ───────────────────────────────────

/**
 * Detects if a streak was recently broken (user had a streak yesterday
 * or earlier but it has now reset to 0). Returns the lost streak count
 * for recovery messaging.
 */
export function detectStreakBreak(
  currentStreak: number,
  lastLogDate: string | null,
  previousStreak: number,
  today: string = toDateString(new Date())
): number {
  // If current streak is 0 and we had a previous streak, it broke
  if (currentStreak === 0 && previousStreak > 0 && lastLogDate) {
    const yesterday = subtractDays(today, 1);
    if (lastLogDate < yesterday) {
      return previousStreak;
    }
  }
  return 0;
}

// ── Helpers ──────────────────────────────────────────────────

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function subtractDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() - days);
  return toDateString(d);
}
