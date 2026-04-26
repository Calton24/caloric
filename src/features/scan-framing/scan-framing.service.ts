import type {
    ScanFraming,
    ScanFramingInput,
    ScanFramingState,
} from "./scan-framing.types";

// ─── Priority order ────────────────────────────────────────────────────────
// overshoot_risk > streak_saver > protein_boost > tight_budget > start_strong > on_track

const TINT_MAP: Record<ScanFramingState, ScanFraming["tintColor"]> = {
  overshoot_risk: "error",
  streak_saver: "warning",
  protein_boost: "info",
  tight_budget: "warning",
  start_strong: "success",
  on_track: "primary",
};

/**
 * Pure deterministic function — no hooks, no side effects.
 * Returns the contextual framing for a meal being logged.
 */
export function resolveScanFraming(input: ScanFramingInput): ScanFraming {
  const {
    consumedCalories,
    calorieBudget,
    mealCalories,
    currentStreak,
    consumedProtein,
    proteinTarget,
    hourOfDay,
  } = input;

  const budgetAfterMeal = calorieBudget - consumedCalories - mealCalories;
  const budgetRemainingPercent =
    calorieBudget > 0 ? (calorieBudget - consumedCalories) / calorieBudget : 1;
  const isFirstMealToday = consumedCalories === 0;
  const proteinRatio = proteinTarget > 0 ? consumedProtein / proteinTarget : 1;

  // ── Overshoot risk ────────────────────────────────────────────────────────
  // This meal would push daily total > 15% over budget
  if (budgetAfterMeal < -(calorieBudget * 0.15)) {
    return build("overshoot_risk", {
      title: "Over budget",
      subtitle: `This meal puts you ${Math.abs(Math.round(budgetAfterMeal))} kcal over your daily goal.`,
      cta: "Log anyway",
    });
  }

  // ── Streak saver ──────────────────────────────────────────────────────────
  // Logging their first meal late in the day on an active streak
  if (currentStreak >= 3 && isFirstMealToday && hourOfDay >= 18) {
    return build("streak_saver", {
      title: `Keep your ${currentStreak}-day streak`,
      subtitle: "Logging now saves your streak for today.",
      cta: "Save my streak",
    });
  }

  // ── Protein boost ─────────────────────────────────────────────────────────
  // Less than 40% of protein target hit and it's past midday
  if (proteinRatio < 0.4 && hourOfDay >= 12) {
    const remaining = Math.round(proteinTarget - consumedProtein);
    return build("protein_boost", {
      title: "Protein check",
      subtitle: `${remaining}g protein left to hit today's target.`,
      cta: "Log meal",
    });
  }

  // ── Tight budget ──────────────────────────────────────────────────────────
  // After this meal, less than 15% of daily budget remaining
  if (
    budgetRemainingPercent > 0 &&
    budgetAfterMeal >= 0 &&
    budgetAfterMeal < calorieBudget * 0.15
  ) {
    return build("tight_budget", {
      title: "Tight budget",
      subtitle: `${Math.round(budgetAfterMeal)} kcal remaining after this meal.`,
      cta: "Log meal",
    });
  }

  // ── Start strong ──────────────────────────────────────────────────────────
  // First meal of the day in the morning
  if (isFirstMealToday && hourOfDay < 11) {
    return build("start_strong", {
      title: "Start strong",
      subtitle: "Good morning — first meal logged.",
      cta: "Log meal",
    });
  }

  // ── On track (default) ───────────────────────────────────────────────────
  const remaining = Math.round(calorieBudget - consumedCalories - mealCalories);
  const remainingText =
    remaining > 0
      ? `${remaining} kcal remaining after this.`
      : "Reaching your goal today.";
  return build("on_track", {
    title: "On track",
    subtitle: remainingText,
    cta: "Log meal",
  });
}

function build(
  state: ScanFramingState,
  copy: { title: string; subtitle: string; cta: string }
): ScanFraming {
  return { state, ...copy, tintColor: TINT_MAP[state] };
}
