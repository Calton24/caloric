/**
 * useActiveChallenge
 *
 * Derives the full ActiveChallengeState from local stores.
 * Recomputes whenever the challenge record or meal list changes.
 *
 * Returns null if no challenge has been started yet.
 */

import { useMemo } from "react";
import { useNutritionStore } from "../../nutrition/nutrition.store";
import { buildActiveChallengeState } from "../challenge.service";
import { useChallengeStore } from "../challenge.store";
import type { ActiveChallengeState } from "../challenge.types";

export function useActiveChallenge(): ActiveChallengeState | null {
  const challenge = useChallengeStore((s) => s.challenge);
  const meals = useNutritionStore((s) => s.meals);

  return useMemo(() => {
    if (!challenge) return null;

    // Derive unique logged dates from local meals (offline-first, no network needed)
    const loggedDatesSet = new Set<string>();
    for (const meal of meals) {
      const d = new Date(meal.loggedAt);
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      loggedDatesSet.add(`${y}-${mo}-${day}`);
    }

    return buildActiveChallengeState(challenge, Array.from(loggedDatesSet));
  }, [challenge, meals]);
}
