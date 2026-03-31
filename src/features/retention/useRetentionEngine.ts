/**
 * useRetentionEngine — Day 1→21+ Journey Orchestrator
 *
 * Single hook that drives the entire psychological journey:
 *   - Day banner (header + sub for the home screen)
 *   - After-log celebration content
 *   - Paywall triggers at conversion days (3, 7, 14, 21)
 *   - Day-specific push notification content
 *   - Auto-camera on Day 1 (first ever launch)
 *   - Streak recovery messaging
 */

import { useCallback, useMemo } from "react";
import { detectStreakBreak } from "../streak/streak-psychology.service";
import { useStreakStore } from "../streak/streak.store";
import {
    getAfterLogContent,
    getDayBanner,
    getDayContent,
    getDayNotification,
    getDayPaywall,
    type DayContent,
    type JourneyPhase,
    type PaywallTrigger,
} from "./day-journey";
import { getPostLogFeedback } from "./post-log-feedback";
import { useRetentionStore } from "./retention.store";
import type { PostLogFeedback, StreakRecovery } from "./retention.types";
import { getStreakRecovery } from "./streak-recovery";

function toDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface RetentionEngineResult {
  /** Current journey day content */
  dayContent: DayContent;
  /** Current journey phase */
  phase: JourneyPhase;
  /** Banner for home screen (null if already logged today) */
  dayBanner: {
    header: string;
    sub: string;
    phase: JourneyPhase;
    day: number;
  } | null;
  /** Streak recovery prompt (shown when streak broke) */
  streakRecovery: StreakRecovery | null;
  /** Whether to auto-open camera (Day 1, first launch) */
  shouldShowCamera: boolean;
  /** Paywall to trigger after logging (null if not a conversion day) */
  dayPaywall: PaywallTrigger | null;
  /** Get feedback message after logging a meal */
  getPostLogFeedback: (mealsToday: number) => PostLogFeedback;
  /** Get the after-log celebration (message + sub + emoji) */
  getAfterLogContent: () => {
    message: string;
    sub: string;
    emoji: string;
    phase: JourneyPhase;
  };
  /** Get today's notification content */
  getDayNotification: () => { title: string; body: string };
  /** Record that the app was opened (call once per session) */
  recordOpen: () => void;
  /** Record that the first meal was logged */
  recordFirstMeal: () => void;
  /** Mark auto-camera as shown */
  markCameraShown: () => void;
}

export function useRetentionEngine(): RetentionEngineResult {
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const lastLogDate = useStreakStore((s) => s.lastLogDate);

  const {
    lastLostStreak,
    day1CameraShown,
    firstMealAt,
    recordAppOpen,
    recordFirstMeal,
    recordLostStreak,
    markDay1CameraShown,
  } = useRetentionStore();

  // ── Detect streak break ──
  const streakBroke = detectStreakBreak(
    currentStreak,
    lastLogDate,
    lastLostStreak > 0 ? lastLostStreak : 0
  );

  if (streakBroke > 0 && streakBroke !== lastLostStreak) {
    recordLostStreak(streakBroke);
  }

  // ── Journey state ──
  const today = toDateString();
  const hasLoggedToday = lastLogDate === today;

  // The "challenge day" is streak + 1 if they haven't logged today yet
  // (they're on the day they need to complete)
  const challengeDay = hasLoggedToday ? currentStreak : currentStreak + 1;

  const dayContent = useMemo(() => getDayContent(challengeDay), [challengeDay]);
  const dayBanner = useMemo(
    () => getDayBanner(challengeDay, hasLoggedToday),
    [challengeDay, hasLoggedToday]
  );

  // ── Streak recovery ──
  const streakRecovery = useMemo((): StreakRecovery | null => {
    if (currentStreak === 0 && lastLostStreak > 0 && !hasLoggedToday) {
      return getStreakRecovery(lastLostStreak);
    }
    return null;
  }, [currentStreak, lastLostStreak, hasLoggedToday]);

  // ── Auto-camera (Day 1, first ever launch) ──
  const shouldShowCamera = !day1CameraShown && !firstMealAt;

  // ── Paywall trigger for today ──
  const dayPaywall = useMemo(
    () => (hasLoggedToday ? null : getDayPaywall(challengeDay)),
    [challengeDay, hasLoggedToday]
  );

  // ── Post-log feedback ──
  const getPostLogFeedbackFn = useCallback(
    (mealsToday: number): PostLogFeedback => {
      return getPostLogFeedback(challengeDay, mealsToday);
    },
    [challengeDay]
  );

  // ── After-log celebration ──
  const getAfterLogContentFn = useCallback(
    () => getAfterLogContent(challengeDay),
    [challengeDay]
  );

  // ── Day notification ──
  const getDayNotificationFn = useCallback(
    () => getDayNotification(challengeDay),
    [challengeDay]
  );

  return {
    dayContent,
    phase: dayContent.phase,
    dayBanner,
    streakRecovery,
    shouldShowCamera,
    dayPaywall,
    getPostLogFeedback: getPostLogFeedbackFn,
    getAfterLogContent: getAfterLogContentFn,
    getDayNotification: getDayNotificationFn,
    recordOpen: recordAppOpen,
    recordFirstMeal: recordFirstMeal,
    markCameraShown: markDay1CameraShown,
  };
}
