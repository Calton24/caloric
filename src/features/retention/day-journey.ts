/**
 * Day Journey — The Complete Day 1 → 21+ Psychological System
 *
 * This is the SINGLE source of truth for every message, action, and trigger
 * in the 21-day journey. Not a feature flow — a psychological journey.
 *
 * Phases:
 *   Hook (Day 1-3)      → get them in
 *   Commitment (Day 4-7) → build habit
 *   Identity (Day 8-14)  → shift self-perception
 *   Lock-in (Day 15-21)  → prevent drop-off
 *   Post (Day 22+)       → lifestyle mode
 *
 * Conversion points: Day 3 (soft), Day 7 (hard), Day 14 (hard), Day 21 (strongest)
 */

// ── Types ──

export type JourneyPhase =
  | "hook"
  | "commitment"
  | "identity"
  | "lock-in"
  | "post";

export interface DayContent {
  /** The challenge day number */
  day: number;
  phase: JourneyPhase;
  /** Header shown on the home screen before they log */
  header: string;
  /** Sub-text under the header */
  sub: string;
  /** Primary message shown after logging first meal of the day */
  afterLogMessage: string;
  /** Sub-text for the after-log celebration */
  afterLogSub: string;
  /** Emoji for after-log celebration */
  afterLogEmoji: string;
  /** Push notification to send that evening */
  notification: { title: string; body: string };
  /** Paywall trigger — null means no paywall on this day */
  paywall: PaywallTrigger | null;
}

export interface PaywallTrigger {
  /** soft = dismissible, hard = prominent, strongest = max emotional leverage */
  strength: "soft" | "hard" | "strongest";
  /** Paywall headline */
  headline: string;
  /** Paywall body copy */
  body: string;
}

// ── Day-by-day content map ──

const JOURNEY: DayContent[] = [
  // ────────────────────────── HOOK PHASE (Day 1-3) ──────────────────────────
  {
    day: 1,
    phase: "hook",
    header: "Day 1 starts now",
    sub: "Most people never make it this far",
    afterLogMessage: "Day 1 complete ✅",
    afterLogSub: "You've started something most people don't",
    afterLogEmoji: "✅",
    notification: {
      title: "Day 2 is waiting",
      body: "Come back tomorrow and keep your streak alive.",
    },
    paywall: null,
  },
  {
    day: 2,
    phase: "hook",
    header: "You showed up again. That's rare.",
    sub: "Day 2 — keep the momentum going",
    afterLogMessage: "2-day streak 🔥",
    afterLogSub: "This is how habits start",
    afterLogEmoji: "🔥",
    notification: {
      title: "Keep it going",
      body: "Don't reset now — Day 3 is tomorrow.",
    },
    paywall: null,
  },
  {
    day: 3,
    phase: "hook",
    header: "This is where most people quit",
    sub: "Day 3 is the filter",
    afterLogMessage: "You didn't.",
    afterLogSub: "3 days in. You're building something real.",
    afterLogEmoji: "⚡",
    notification: {
      title: "Don't lose your streak",
      body: "You made it past Day 3. Most don't.",
    },
    paywall: {
      strength: "soft",
      headline: "You're building momentum",
      body: "Unlock full tracking to stay consistent",
    },
  },

  // ────────────────────── COMMITMENT PHASE (Day 4-7) ─────────────────────────
  {
    day: 4,
    phase: "commitment",
    header: "You're becoming consistent",
    sub: "Day 4 — this is how habits form",
    afterLogMessage: "4-day streak",
    afterLogSub: "This is real now",
    afterLogEmoji: "💪",
    notification: {
      title: "Day 5 is waiting",
      body: "You're building a real habit. Don't stop.",
    },
    paywall: null,
  },
  {
    day: 5,
    phase: "commitment",
    header: "You're ahead of most users",
    sub: "Day 5 — that's not common",
    afterLogMessage: "5 days strong",
    afterLogSub: "You're ahead of 60% of users who start",
    afterLogEmoji: "💎",
    notification: {
      title: "Don't break your streak",
      body: "5 days of consistency is real discipline.",
    },
    paywall: null,
  },
  {
    day: 6,
    phase: "commitment",
    header: "Tomorrow is a big milestone",
    sub: "Day 6 — one more day to a full week",
    afterLogMessage: "Day 6 ✓",
    afterLogSub: "Tomorrow is Day 7. A full week. Don't miss it.",
    afterLogEmoji: "🎯",
    notification: {
      title: "Tomorrow is Day 7",
      body: "One more day and you've completed a full week.",
    },
    paywall: null,
  },
  {
    day: 7,
    phase: "commitment",
    header: "7 days complete 🔥",
    sub: "You've made it further than most",
    afterLogMessage: "This isn't luck anymore.",
    afterLogSub: "It's discipline.",
    afterLogEmoji: "🔥",
    notification: { title: "7-day streak", body: "Don't break it now." },
    paywall: {
      strength: "hard",
      headline: "Don't lose your progress now",
      body: "Unlock full insights & tracking",
    },
  },

  // ────────────────────── IDENTITY PHASE (Day 8-14) ──────────────────────────
  {
    day: 8,
    phase: "identity",
    header: "This is who you are now",
    sub: "Day 8 — you're past the hard part",
    afterLogMessage: "You don't rely on motivation anymore",
    afterLogSub: "You're someone who does this",
    afterLogEmoji: "⚡",
    notification: {
      title: "You're building something real",
      body: "8 days of consistency. This is who you are.",
    },
    paywall: null,
  },
  {
    day: 9,
    phase: "identity",
    header: "This is who you are now",
    sub: "Day 9 — consistency over motivation",
    afterLogMessage: "9 days",
    afterLogSub: "You're not trying anymore. You're doing.",
    afterLogEmoji: "💎",
    notification: {
      title: "Day 10 tomorrow",
      body: "Double digits. Don't miss it.",
    },
    paywall: null,
  },
  {
    day: 10,
    phase: "identity",
    header: "10 days in",
    sub: "You're not starting anymore — you're continuing",
    afterLogMessage: "Double digits 🔟",
    afterLogSub: "10 days of showing up. That's identity.",
    afterLogEmoji: "🔥",
    notification: {
      title: "10-day streak",
      body: "You're in the top 20% of users. Keep going.",
    },
    paywall: null,
  },
  {
    day: 11,
    phase: "identity",
    header: "This is your routine now",
    sub: "Day 11 — it's becoming automatic",
    afterLogMessage: "Logged ✓",
    afterLogSub: "This is just what you do now",
    afterLogEmoji: "✓",
    notification: {
      title: "Your streak is at risk",
      body: "Don't let 11 days of work disappear.",
    },
    paywall: null,
  },
  {
    day: 12,
    phase: "identity",
    header: "This is your routine now",
    sub: "Day 12 — steady",
    afterLogMessage: "12 days ✓",
    afterLogSub: "Quiet consistency. The strongest kind.",
    afterLogEmoji: "✓",
    notification: { title: "Day 13 is waiting", body: "Keep the chain going." },
    paywall: null,
  },
  {
    day: 13,
    phase: "identity",
    header: "This is your routine now",
    sub: "Day 13 — almost two weeks",
    afterLogMessage: "13 days ✓",
    afterLogSub: "Tomorrow is a big one. Two full weeks.",
    afterLogEmoji: "🎯",
    notification: {
      title: "Tomorrow is Day 14",
      body: "Two full weeks. You're almost there.",
    },
    paywall: null,
  },
  {
    day: 14,
    phase: "identity",
    header: "14 days complete",
    sub: "You're in the top 10%",
    afterLogMessage: "You've built real momentum",
    afterLogSub: "Two weeks. That's not a phase — it's a pattern.",
    afterLogEmoji: "🏅",
    notification: {
      title: "14-day streak 🔥",
      body: "You're in the top 10%. Don't stop now.",
    },
    paywall: {
      strength: "hard",
      headline: "See your full progress & patterns",
      body: "You've come too far to stop now",
    },
  },

  // ────────────────────── LOCK-IN PHASE (Day 15-21) ──────────────────────────
  {
    day: 15,
    phase: "lock-in",
    header: "This is where discipline matters",
    sub: "Day 15 — the quiet zone",
    afterLogMessage: "You're still here.",
    afterLogSub: "That's different.",
    afterLogEmoji: "💪",
    notification: {
      title: "Your streak is at risk",
      body: "15 days is serious. Don't let it slip.",
    },
    paywall: null,
  },
  {
    day: 16,
    phase: "lock-in",
    header: "This is where discipline matters",
    sub: "Day 16 — people silently drop here",
    afterLogMessage: "Still standing",
    afterLogSub: "Most people quietly quit around now. Not you.",
    afterLogEmoji: "💪",
    notification: {
      title: "Don't break your streak",
      body: "16 days of work. One log keeps it alive.",
    },
    paywall: null,
  },
  {
    day: 17,
    phase: "lock-in",
    header: "This is where discipline matters",
    sub: "Day 17 — persistence wins",
    afterLogMessage: "17 days ✓",
    afterLogSub: "You're still here. That's different.",
    afterLogEmoji: "✓",
    notification: {
      title: "Day 18 is waiting",
      body: "The final push starts tomorrow.",
    },
    paywall: null,
  },
  {
    day: 18,
    phase: "lock-in",
    header: "You're almost there",
    sub: "Day 18 — the final push",
    afterLogMessage: "Don't slow down now",
    afterLogSub: "3 more days. You can see the finish line.",
    afterLogEmoji: "🔥",
    notification: {
      title: "Finish what you started",
      body: "3 days left. Don't quit now.",
    },
    paywall: null,
  },
  {
    day: 19,
    phase: "lock-in",
    header: "You're almost there",
    sub: "Day 19 — so close",
    afterLogMessage: "2 days left",
    afterLogSub: "You didn't come this far to stop here.",
    afterLogEmoji: "🔥",
    notification: {
      title: "Finish what you started",
      body: "2 more days. That's it.",
    },
    paywall: null,
  },
  {
    day: 20,
    phase: "lock-in",
    header: "You're almost there",
    sub: "Day 20 — one more",
    afterLogMessage: "1 day left",
    afterLogSub: "Tomorrow you finish what most people never could.",
    afterLogEmoji: "⚡",
    notification: {
      title: "Tomorrow is Day 21",
      body: "One more day and you've done it.",
    },
    paywall: null,
  },
  {
    day: 21,
    phase: "lock-in",
    header: "You did it. 21 days complete 🏆",
    sub: "Most people never finish this. You did.",
    afterLogMessage: "Most people never finish this",
    afterLogSub: "You did",
    afterLogEmoji: "🏆",
    notification: {
      title: "21 days complete 🏆",
      body: "You built a habit. Now keep it.",
    },
    paywall: {
      strength: "strongest",
      headline: "Don't lose your progress",
      body: "Continue your journey",
    },
  },
];

/**
 * Post-Day-21 content — the journey doesn't stop.
 */
const POST_JOURNEY: DayContent = {
  day: 22,
  phase: "post",
  header: "Now it's a lifestyle",
  sub: "Your streak keeps going",
  afterLogMessage: "Another day logged",
  afterLogSub: "This is just who you are now",
  afterLogEmoji: "👑",
  notification: {
    title: "Your streak continues",
    body: "Keep the lifestyle going.",
  },
  paywall: null,
};

// ── Public API ──

/**
 * Get the journey content for a specific streak day.
 * Days 1-21 have unique content. Day 22+ returns lifestyle mode.
 */
export function getDayContent(streakDay: number): DayContent {
  if (streakDay <= 0) {
    // Day 0 / no streak — treat as Day 1 (they haven't logged yet)
    return JOURNEY[0];
  }
  if (streakDay > 21) {
    return { ...POST_JOURNEY, day: streakDay };
  }
  return JOURNEY[streakDay - 1];
}

/**
 * Get the phase for a given streak day.
 */
export function getPhase(streakDay: number): JourneyPhase {
  return getDayContent(streakDay).phase;
}

/**
 * Get the home screen banner content (header + sub) for the current day.
 * Returns null after the user has already logged today (no nagging needed).
 */
export function getDayBanner(
  streakDay: number,
  hasLoggedToday: boolean
): { header: string; sub: string; phase: JourneyPhase; day: number } | null {
  if (hasLoggedToday) return null;
  const content = getDayContent(streakDay);
  return {
    header: content.header,
    sub: content.sub,
    phase: content.phase,
    day: content.day,
  };
}

/**
 * Get the after-log celebration content for a specific day.
 * This is shown immediately after the user logs their first meal of the day.
 */
export function getAfterLogContent(streakDay: number): {
  message: string;
  sub: string;
  emoji: string;
  phase: JourneyPhase;
} {
  const content = getDayContent(streakDay);
  return {
    message: content.afterLogMessage,
    sub: content.afterLogSub,
    emoji: content.afterLogEmoji,
    phase: content.phase,
  };
}

/**
 * Get the push notification to schedule for this streak day.
 */
export function getDayNotification(streakDay: number): {
  title: string;
  body: string;
} {
  const content = getDayContent(streakDay);
  return content.notification;
}

/**
 * Check if today's day should trigger a paywall after logging.
 * Returns null if no paywall should show.
 */
export function getDayPaywall(streakDay: number): PaywallTrigger | null {
  const content = getDayContent(streakDay);
  return content.paywall;
}

/**
 * Check if this is a conversion day (paywall opportunity).
 */
export function isConversionDay(streakDay: number): boolean {
  return getDayContent(streakDay).paywall !== null;
}
