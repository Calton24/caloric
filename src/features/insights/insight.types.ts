/**
 * Insight Engine — Public Types
 *
 * Single canonical type surface used by:
 *   - the rule registry
 *   - the engine evaluator
 *   - consumer hooks (`useDailyInsight`)
 *   - UI banners
 *
 * Behavioral framing:
 *   `Category` defines the *user mental model* of the message
 *   ("the app is warning me", "the app is celebrating me").
 *   `Tone` defines the *visual treatment* the banner should adopt.
 *   They are intentionally independent — a "positive" category may carry
 *   "neutral" tone if the rule fires for a low-arousal reason.
 */

export type InsightCategory =
  | "critical" // user at risk of losing momentum / streak
  | "warning" // falling off plan, repeated drift
  | "positive" // celebrate momentum / milestones
  | "optimization" // suggest a behavioral upgrade
  | "neutral"; // steady-state, fallback

export type InsightTone = "urgent" | "warning" | "positive" | "neutral";

/**
 * Behavioral persona derived per session.
 *  - newcomer: < 5 total logs                  → trust building, soft tone
 *  - returner: dormant > 7d, has prior history → re-engagement, soft tone
 *  - regular:  default user                    → direct tone
 *  - power:    streak ≥ 30 OR active ≥ 60d     → bold tone, less hand-holding
 */
export type InsightPersona = "newcomer" | "regular" | "power" | "returner";
export type InsightToneVariant = "soft" | "direct" | "bold";

/**
 * A CTA action the consumer can wire to navigation/handlers.
 * Strings only — keeps the engine layer pure & testable.
 */
export type InsightCtaAction =
  | "log_meal"
  | "log_weight"
  | "open_macros"
  | "view_progress"
  | "recalculate_plan"
  | "open_paywall"
  | "dismiss";

export interface InsightCta {
  /** Pre-translated label. */
  label: string;
  action: InsightCtaAction;
}

export interface Insight {
  /** Stable rule id — used for cooldown bookkeeping + analytics. */
  id: string;
  category: InsightCategory;
  tone: InsightTone;
  /** 0..100 — final priority after persona modulation. */
  priority: number;
  /** Pre-translated title (already personalized to tone variant). */
  title: string;
  /** Pre-translated message. */
  message: string;
  /** Optional CTA. Critical insights almost always set this. */
  cta?: InsightCta;
  /**
   * Stable hash of the rule's payload (eg. "near_goal:1.2lbs"). Used to
   * deduplicate identical insights — we don't want to keep nagging the
   * user about the same surplus 3-day window for 5 days straight.
   */
  payloadHash: string;
  /** Persona used for tone variant resolution. */
  persona: InsightPersona;
  /** Wall-clock generation timestamp (ms). */
  generatedAt: number;
}

/**
 * Internal raw output from a rule's evaluator. Engine layer hydrates
 * this into a fully-translated `Insight` once selected.
 */
export interface RuleEvaluationResult {
  /** Translation key roots — engine appends tone suffix. */
  titleKey: string;
  messageKey: string;
  /** Optional i18n params shared by title/message. */
  params?: Record<string, string | number>;
  /** Optional CTA — translation key + action. */
  cta?: { labelKey: string; action: InsightCtaAction };
  /**
   * Stable identifier for *this firing*. Two firings of the same rule
   * with the same payload hash are treated as one for cooldown purposes
   * (prevents repeating "still 5 lbs to goal" every day).
   */
  payloadHash: string;
  /**
   * Rule may bump its own priority for high-conviction situations
   * (e.g., streak about to break + streak ≥ 30 → priority 99).
   */
  priorityBoost?: number;
}

/**
 * Static rule descriptor.
 *
 * Rules are pure functions of context — they read fields off
 * `InsightContext` and return either a result or null. The engine
 * handles selection, cooldowns, and dedup.
 */
export interface InsightRule {
  /** Stable, kebab-case-style id. Used as cooldown key. */
  id: string;
  category: InsightCategory;
  tone: InsightTone;
  /** Base priority before personalization (0..100). */
  basePriority: number;
  /**
   * Min hours between repeat firings of this rule.
   * Use -1 to disable cooldown (always eligible). Use a per-category
   * default if 0.
   */
  cooldownHours: number;
  /**
   * Whether the user can dismiss this rule. Critical rules cannot be
   * dismissed — they are the user's lifeline (e.g. "streak in 4h").
   */
  dismissible: boolean;
  /**
   * Optional time-of-day gate. Only fires inside this window
   * (24h clock, local time). Useful for "after 6pm" nudges.
   */
  hourGate?: { after?: number; before?: number };
  /**
   * Optional persona gate. Hides the rule for users not matching.
   */
  personaGate?: ReadonlyArray<InsightPersona>;
  /** Pure evaluator. */
  evaluate: (ctx: InsightContext) => RuleEvaluationResult | null;
}

/**
 * Pre-computed snapshot consumed by every rule evaluator. The engine
 * builds this exactly once per evaluation pass; rules read fields
 * synchronously, never recompute.
 */
export interface InsightContext {
  // ── Time ──
  now: Date;
  todayIso: string;
  /** 0..23 local-time hour. */
  hour: number;
  /** 0=Sun..6=Sat. */
  weekday: number;

  // ── Account / engagement ──
  daysActive: number;
  totalMeals: number;
  loggedToday: boolean;
  hoursSinceLastMeal: number | null;
  lastMealAtIso: string | null;

  // ── Calorie windows ──
  cals: {
    today: number;
    avg7d: number;
    avg30d: number;
    /** Each item is the calories logged on that day (0 if no log). */
    last7Daily: number[];
    /** Last 3 *logged* days were each over budget by ≥10%. */
    surplus3DaysStreak: boolean;
    /** Last 3 *logged* days were each under budget by ≥30%. */
    aggressiveDeficit3DaysStreak: boolean;
    /** Weekend avg vs weekday avg ratio (e.g., 1.25 = 25% drift). null = insufficient data. */
    weekendDriftRatio: number | null;
  };

  // ── Adherence (calorie targets) ──
  adherence: {
    /** % of *logged* days within ±10% of budget over the last 7. */
    pct7d: number;
    /** % over the previous 7-day window. */
    pctPrev7d: number;
    /** Best 7-day adherence ever observed in stored history. */
    bestPctEver: number;
    /** True when pct7d > 0 and equals or exceeds historical best. */
    isBestWeekEver: boolean;
  };

  // ── Macros ──
  protein: {
    /** Per-day target in grams. null when plan is missing. */
    target: number | null;
    avg5d: number;
    avg7d: number;
    /** % of target across last 7d. null when target missing. */
    pctOfTarget7d: number | null;
    /** True when ≥5 of last 7 logged days were < 80% of target. */
    chronicallyLow: boolean;
    /** True when 7d pct in [70..89] — close but worth nudging. */
    inOptimizationRange: boolean;
  };

  // ── Weight + goal ──
  weight: {
    currentLbs: number | null;
    goalLbs: number | null;
    startLbs: number | null;
    remainingLbs: number | null;
    daysSinceLastLog: number | null;
    /** weekly rate (lbs/wk) over last 30d window. 0 if insufficient. */
    weeklyRateLbs: number;
    /** True when actual weekly rate is within 30% of plan target rate. */
    onPaceForGoal: boolean;
  };

  // ── Streak ──
  streak: {
    current: number;
    longest: number;
    lastLogDateIso: string | null;
    /** Streak ≥ 1 AND no log today. */
    atRiskToday: boolean;
    /** current === longest - 1 (one day from PB). */
    oneFromPersonalBest: boolean;
    /** Hit a meaningful milestone today (3, 7, 14, 30, 60, 100, 365). */
    isMilestoneToday: boolean;
    milestoneValue: number | null;
    /**
     * User had a recent streak that just broke — restart opportunity.
     * (current === 0, lastLogDate within last 3 days, prior streak ≥ 3.)
     */
    isRestartOpportunity: boolean;
    priorBestStreakBeforeBreak: number;
  };

  // ── Plan ──
  plan: {
    calorieBudget: number;
    weeklyRateTargetLbs: number; // negative = lose, positive = gain, 0 = maintain
    goalDirection: "lose" | "gain" | "maintain" | "unknown";
    proteinTarget: number;
    carbsTarget: number;
    fatTarget: number;
  };

  // ── Behavior ──
  behavior: {
    /** Last 5 logged days mostly logged after 8pm? */
    lateLogPattern: boolean;
  };

  // ── Persona ──
  persona: InsightPersona;
  toneVariant: InsightToneVariant;
}
