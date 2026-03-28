/**
 * useShareMilestone
 *
 * After a meal is confirmed, checks whether a new milestone was reached.
 * Returns the milestone to display (if any) and helpers to show/dismiss it.
 *
 * Usage in confirm-meal or post-log flow:
 *   const { milestone, visible, show, dismiss } = useShareMilestone();
 *   // After saving a meal:
 *   show();
 *   // Render:
 *   <ShareMilestoneModal visible={visible} milestone={milestone} ... onClose={dismiss} />
 */

import { useCallback, useMemo, useState } from "react";
import { useActiveChallenge } from "../challenge/hooks/useActiveChallenge";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { useStreakStore } from "../streak/streak.store";
import { checkMilestone } from "./share.service";
import { useShareStore } from "./share.store";
import type { MilestoneConfig } from "./share.types";

interface UseShareMilestoneReturn {
  /** The milestone config if one is pending, null otherwise */
  milestone: MilestoneConfig | null;
  /** Whether the modal should be visible */
  visible: boolean;
  /** Call after a meal is saved to check for a new milestone. Returns true if triggered. */
  check: () => boolean;
  /** Dismiss the modal and mark the milestone as seen */
  dismiss: () => void;
  /** Current day count in the challenge (for modal props) */
  day: number;
  /** Current streak */
  streak: number;
  /** Total meals logged */
  mealsLogged: number;
  /** Challenge length */
  challengeDays: number;
}

export function useShareMilestone(): UseShareMilestoneReturn {
  const [visible, setVisible] = useState(false);
  const [activeMilestone, setActiveMilestone] =
    useState<MilestoneConfig | null>(null);

  const meals = useNutritionStore((s) => s.meals);
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const challengeState = useActiveChallenge();
  const seenMilestones = useShareStore((s) => s.seenMilestones);
  const markSeen = useShareStore((s) => s.markSeen);

  const completedDays = challengeState?.progress.completedDays ?? 0;
  const currentDay = challengeState?.progress.currentDay ?? 0;
  const challengeDays = challengeState?.challenge.challengeDays ?? 21;

  /** Returns true if a milestone was triggered (modal will show). */
  const check = useCallback((): boolean => {
    const result = checkMilestone(
      completedDays,
      currentStreak,
      seenMilestones,
      meals.length
    );

    if (result.triggered && result.milestone) {
      setActiveMilestone(result.milestone);
      setVisible(true);
      return true;
    }
    return false;
  }, [completedDays, currentStreak, seenMilestones, meals.length]);

  const dismiss = useCallback(() => {
    if (activeMilestone) {
      markSeen(activeMilestone.key);
    }
    setVisible(false);
    setActiveMilestone(null);
  }, [activeMilestone, markSeen]);

  return useMemo(
    () => ({
      milestone: activeMilestone,
      visible,
      check,
      dismiss,
      day: currentDay,
      streak: currentStreak,
      mealsLogged: meals.length,
      challengeDays,
    }),
    [
      activeMilestone,
      visible,
      check,
      dismiss,
      currentDay,
      currentStreak,
      meals.length,
      challengeDays,
    ]
  );
}
