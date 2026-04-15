/**
 * AI Coach — Insight Generator
 *
 * Pure function that produces a short, actionable coaching nudge
 * based on the user's current nutrition state and time of day.
 *
 * Rules:
 * - Max 12 words
 * - No emojis, no fluff
 * - Action-oriented when relevant
 * - Time-aware (gentle morning, direct evening)
 * - Streak-aware (reinforce consistency / identity)
 */

export interface CoachInput {
  caloriesConsumed: number;
  calorieGoal: number;
  proteinLeft: number;
  carbsLeft: number;
  fatLeft: number;
  streakDays: number;
  dayProgress: "morning" | "afternoon" | "evening" | "night";
}

export interface CoachOutput {
  insight: string;
  tone: "positive" | "neutral" | "corrective";
  priority: "low" | "medium" | "high";
}

export function generateCoachInsight(data: CoachInput): CoachOutput | null {
  const {
    caloriesConsumed,
    calorieGoal,
    proteinLeft,
    carbsLeft,
    fatLeft,
    streakDays,
    dayProgress,
  } = data;

  const remaining = calorieGoal - caloriesConsumed;
  const pctConsumed = calorieGoal > 0 ? caloriesConsumed / calorieGoal : 0;
  const isLate = dayProgress === "evening" || dayProgress === "night";
  const isMorning = dayProgress === "morning";

  // ── Nothing logged yet ──
  if (caloriesConsumed === 0) {
    if (isMorning) {
      return {
        insight: "Start your day, log your first meal",
        tone: "neutral",
        priority: "low",
      };
    }
    if (isLate) {
      return {
        insight: "No meals logged yet, add something now",
        tone: "corrective",
        priority: "high",
      };
    }
    return {
      insight: "Log a meal to get on track today",
      tone: "neutral",
      priority: "medium",
    };
  }

  // ── Over calorie limit ──
  if (remaining < 0) {
    const overBy = Math.abs(remaining);
    if (overBy > calorieGoal * 0.15) {
      return {
        insight: "Well over budget, keep tomorrow in mind",
        tone: "corrective",
        priority: "high",
      };
    }
    return {
      insight: "Slightly over, a light dinner keeps it close",
      tone: "corrective",
      priority: "medium",
    };
  }

  // ── Streak identity reinforcement ──
  if (streakDays >= 7 && pctConsumed > 0.3 && pctConsumed < 0.85) {
    return {
      insight: `${streakDays} days strong, discipline is automatic now`,
      tone: "positive",
      priority: "low",
    };
  }

  if (
    streakDays >= 3 &&
    streakDays < 7 &&
    pctConsumed > 0.3 &&
    pctConsumed < 0.85
  ) {
    return {
      insight: "Consistency is building, keep going",
      tone: "positive",
      priority: "low",
    };
  }

  // ── Protein low ──
  const proteinRatio =
    proteinLeft / (proteinLeft + (calorieGoal > 0 ? remaining / 4 : 1));
  if (proteinLeft > 40 && pctConsumed > 0.5) {
    if (isLate) {
      return {
        insight: "Protein behind, prioritise it this meal",
        tone: "corrective",
        priority: "high",
      };
    }
    return {
      insight: "Protein is low, add a high-protein meal next",
      tone: "neutral",
      priority: "medium",
    };
  }

  // ── Fat running high (little fat budget left vs calories left) ──
  if (fatLeft < 10 && remaining > 400) {
    return {
      insight: "Fat budget spent, go lean for remaining meals",
      tone: "neutral",
      priority: "medium",
    };
  }

  // ── Evening / night and under-eating ──
  if (isLate && pctConsumed < 0.5) {
    return {
      insight: "Under halfway, add a balanced meal now",
      tone: "corrective",
      priority: "high",
    };
  }

  // ── Close to goal (within 15%) ──
  if (pctConsumed >= 0.85 && remaining > 0) {
    if (remaining < 150) {
      return {
        insight: "Almost there, a small snack closes the gap",
        tone: "positive",
        priority: "low",
      };
    }
    return {
      insight: "On track, one more meal fits your budget",
      tone: "positive",
      priority: "low",
    };
  }

  // ── Afternoon pacing check ──
  if (dayProgress === "afternoon" && pctConsumed < 0.3) {
    return {
      insight: "Add a small meal to stay on track",
      tone: "neutral",
      priority: "medium",
    };
  }

  // ── Morning — light guidance ──
  if (isMorning && pctConsumed > 0 && pctConsumed < 0.4) {
    return {
      insight: "Good start, plenty of room for the day",
      tone: "positive",
      priority: "low",
    };
  }

  // ── Default mid-day on track ──
  if (pctConsumed >= 0.3 && pctConsumed <= 0.7) {
    return {
      insight: "Right on pace, keep it steady",
      tone: "positive",
      priority: "low",
    };
  }

  // Nothing actionable
  return null;
}

/** Determine day progress segment from current hour */
export function getDayProgress(
  hour: number
): "morning" | "afternoon" | "evening" | "night" {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  if (hour < 21) return "evening";
  return "night";
}
