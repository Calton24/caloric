/**
 * Insight Persona Derivation
 *
 * Maps observable engagement signals into a persona + tone variant.
 * The persona is *not* purely a function of activity duration — a user
 * who completed onboarding 60 days ago but only logged 3 meals is still
 * a "newcomer". A user with a 30-day streak is a "power" user regardless
 * of when they signed up.
 */

import type { InsightPersona, InsightToneVariant } from "./insight.types";

interface PersonaInputs {
  daysActive: number;
  totalMeals: number;
  currentStreak: number;
  /** Days since the most recent meal log. null = never logged. */
  daysSinceLastMeal: number | null;
}

export function derivePersona(i: PersonaInputs): InsightPersona {
  // 1. Returner: was active before, has been dormant for a week+.
  if (
    i.totalMeals >= 5 &&
    i.daysSinceLastMeal != null &&
    i.daysSinceLastMeal >= 7
  ) {
    return "returner";
  }

  // 2. Power: high streak OR long active history.
  if (i.currentStreak >= 30 || i.daysActive >= 60) {
    return "power";
  }

  // 3. Newcomer: very few logs OR very fresh account.
  if (i.totalMeals < 5 || i.daysActive < 3) {
    return "newcomer";
  }

  // 4. Default — established but not yet "power".
  return "regular";
}

/**
 * Persona → tone variant.
 *
 * Newcomers + returners get softer messaging — they need momentum
 * scaffolding, not pressure. Power users get bolder, more direct copy
 * because they've already opted into the discipline of the system.
 */
export function deriveToneVariant(persona: InsightPersona): InsightToneVariant {
  switch (persona) {
    case "newcomer":
      return "soft";
    case "returner":
      return "soft";
    case "regular":
      return "direct";
    case "power":
      return "bold";
  }
}
