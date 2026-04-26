/**
 * Daily Coaching Engine
 *
 * Deterministic state resolver → coaching copy generator.
 *
 * This is the layer that turns raw numbers into actionable insight.
 * It answers: "What should the user do RIGHT NOW?"
 *
 * States are resolved from data, then combined.
 * Copy is situation-specific, time-aware, and never generic.
 *
 * AI doesn't decide the state — AI only phrases it better.
 */

import i18next from "i18next";

// ── Coaching states ──────────────────────────────────────────

export type CoachingState =
  | "strong_position" // High calories left, early-mid day → guide quality
  | "protein_priority" // Protein lagging → correct now
  | "tight_budget" // Low calories left → be deliberate
  | "evening_drift" // Evening + not secured → danger zone
  | "late_critical" // Late night + not secured → last window
  | "day_secured" // Secured but not optimized → push quality
  | "high_quality_day" // Secured + protein hit → reinforce
  | "momentum_building" // Streak 3–6 → don't break it
  | "milestone_pressure" // Close to milestone → stay sharp
  | "recovery_start" // Missed yesterday → restart clean
  | "on_track"; // Default fallback — nothing urgent

// ── Resolver input ───────────────────────────────────────────

export interface CoachingInput {
  caloriesRemaining: number;
  proteinRemaining: number;
  targetCalories: number;
  targetProtein: number;
  loggedMeals: number;
  streak: number;
  daysToMilestone?: number;
  timeOfDay: "morning" | "afternoon" | "evening";
  secured: boolean; // has at least 1 logged meal today
  missedYesterday: boolean;
}

// ── State resolver ───────────────────────────────────────────

/**
 * Resolve the active coaching states from current data.
 * Returns 1–3 states, priority-ordered. The first is the most important.
 */
export function resolveCoachingStates(input: CoachingInput): CoachingState[] {
  const states: CoachingState[] = [];

  // Recovery overrides everything
  if (input.missedYesterday && !input.secured) {
    states.push("recovery_start");
    return states;
  }

  // ── Critical time-based states (check first) ──

  const isLate = input.timeOfDay === "evening" && new Date().getHours() >= 21;

  if (isLate && !input.secured) {
    states.push("late_critical");
    return states; // Nothing else matters
  }

  if (input.timeOfDay === "evening" && !input.secured) {
    states.push("evening_drift");
  }

  // ── Budget states ──

  if (input.caloriesRemaining < 300 && input.targetCalories > 0) {
    states.push("tight_budget");
  } else if (input.caloriesRemaining > 600 && input.timeOfDay !== "evening") {
    states.push("strong_position");
  }

  // ── Protein state ──

  if (input.proteinRemaining > 40 && input.targetProtein > 0 && input.secured) {
    states.push("protein_priority");
  }

  // ── Quality states ──

  if (
    input.secured &&
    input.proteinRemaining <= 10 &&
    input.targetProtein > 0
  ) {
    states.push("high_quality_day");
  } else if (
    input.secured &&
    !states.includes("high_quality_day") &&
    !states.includes("tight_budget")
  ) {
    states.push("day_secured");
  }

  // ── Streak / milestone states ──

  if (input.daysToMilestone != null && input.daysToMilestone <= 2) {
    states.push("milestone_pressure");
  }

  if (input.streak >= 3 && input.streak <= 6) {
    states.push("momentum_building");
  }

  // Fallback
  if (states.length === 0) {
    states.push("on_track");
  }

  // Cap at 3 most relevant
  return states.slice(0, 3);
}

// ── Coaching copy ────────────────────────────────────────────

export interface CoachingCopy {
  /** "Today's focus" label — always "Today's focus" */
  label: string;
  /** 1–2 sentence coaching text */
  text: string;
}

/**
 * Build deterministic coaching copy from resolved states + data.
 *
 * The first state drives the primary message.
 * Secondary states add nuance when relevant.
 */
export function buildCoachingCopy(
  states: CoachingState[],
  input: CoachingInput
): CoachingCopy {
  const primary = states[0];
  const cal = Math.round(input.caloriesRemaining);
  const pro = Math.round(input.proteinRemaining);

  const text = getCoachingText(primary, states, cal, pro, input);

  return {
    label: i18next.t("coaching.todaysFocus") as string,
    text,
  };
}

/**
 * Deterministic day-of-year rotation.
 * Same text all day, different text tomorrow.
 */
function dayVariant(count: number): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / 86_400_000);
  return dayOfYear % count;
}

/**
 * Pick a translated variant using day-of-year rotation.
 * @param keyBase — the base key under "coachingText", e.g. "lateCritical"
 * @param variantCount — how many _v1.._vN variants exist
 * @param params — i18next interpolation params
 */
function pickText(
  keyBase: string,
  variantCount: number,
  params?: Record<string, string | number>
): string {
  const v = dayVariant(variantCount) + 1;
  return i18next.t(`coachingText.${keyBase}_v${v}`, params as any) as string;
}

function getCoachingText(
  primary: CoachingState,
  states: CoachingState[],
  cal: number,
  pro: number,
  input: CoachingInput
): string {
  const p = { cal, pro, streak: input.streak };

  switch (primary) {
    case "late_critical":
      return pickText("lateCritical", 4);

    case "evening_drift":
      if (states.includes("protein_priority")) {
        return pickText("eveningDriftProtein", 3);
      }
      return pickText("eveningDrift", 3);

    case "recovery_start":
      return pickText("recoveryStart", 4);

    case "tight_budget":
      if (states.includes("protein_priority")) {
        return pickText("tightBudgetProtein", 3, p);
      }
      return pickText("tightBudget", 3, p);

    case "protein_priority":
      if (states.includes("milestone_pressure")) {
        return pickText("proteinMilestone", 3, p);
      }
      if (states.includes("momentum_building")) {
        return pickText("proteinMomentum", 3, p);
      }
      return pickText("proteinPriority", 3, p);

    case "strong_position":
      if (states.includes("protein_priority")) {
        return pickText("strongProtein", 3, p);
      }
      if (states.includes("momentum_building")) {
        return pickText("strongMomentum", 3, p);
      }
      return pickText("strongPosition", 3, p);

    case "high_quality_day": {
      if (states.includes("milestone_pressure")) {
        const daysText = i18next.t("coaching.daysRemaining", {
          count: input.daysToMilestone ?? 1,
        }) as string;
        return pickText("highQualityMilestone", 3, { daysText });
      }
      return pickText("highQualityDay", 3);
    }

    case "day_secured":
      if (states.includes("protein_priority")) {
        return pickText("daySecuredProtein", 3, p);
      }
      return pickText("daySecured", 3);

    case "milestone_pressure": {
      if (states.includes("momentum_building")) {
        return pickText("milestoneMomentum", 3);
      }
      const daysText = i18next.t("coaching.daysCount", {
        count: input.daysToMilestone ?? 1,
      }) as string;
      return pickText("milestonePressure", 3, { daysText });
    }

    case "momentum_building":
      return pickText("momentumBuilding", 4, p);

    case "on_track":
    default:
      if (input.timeOfDay === "morning") {
        return pickText("onTrackMorning", 3);
      }
      return pickText("onTrack", 3);
  }
}

// ── Full pipeline (convenience) ──────────────────────────────

/**
 * One-call: resolve states → build copy.
 * Use this from the service layer.
 */
export function getDailyCoachingInsight(input: CoachingInput): {
  states: CoachingState[];
  copy: CoachingCopy;
} {
  const states = resolveCoachingStates(input);
  const copy = buildCoachingCopy(states, input);
  return { states, copy };
}
