/**
 * useDailyInsight — primary consumer hook.
 *
 * Wires:
 *   stores → InsightContext → engine → Insight + actions.
 *
 * Returns a fully-formed `Insight` plus the action callbacks the
 * consumer needs (markShown, dismiss, onCtaPress). The hook owns the
 * lifecycle bookkeeping — the UI is dumb.
 *
 * Performance:
 *   - Selectors read individual store slices so unrelated state changes
 *     don't trigger recomputation.
 *   - Context + insight are memoised on the relevant inputs.
 *   - markShown is debounced inside the store (no-op when nothing
 *     materially changed) so it's safe to call from `useEffect` keyed
 *     on insight id without thrashing storage.
 */

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter } from "expo-router";
import { Alert } from "react-native";
import { safeOpenFoodTracking } from "../../navigation/safeOpenFoodTracking";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useGoalsStore } from "../goals/goals.store";
import { useNutritionStore } from "../nutrition/nutrition.store";
import { useProfileStore } from "../profile/profile.store";
import { useProgressStore } from "../progress/progress.store";
import { useStreakStore } from "../streak/streak.store";
import { useRecalculatePlan } from "../progress/use-recalculate-plan";
import { buildInsightContext } from "./insight.context";
import { evaluateInsight } from "./insight.engine";
import {
  selectInsightHistory,
  useInsightStore,
} from "./insight.store";
import { insightTelemetry, type InsightScreen } from "./insight.telemetry";
import type { Insight, InsightCtaAction } from "./insight.types";

export interface UseDailyInsightOptions {
  /**
   * Where the insight is being rendered. Flows through to telemetry so
   * we can disambiguate events once Home/other screens consume the
   * engine. Defaults to "progress".
   */
  screen?: InsightScreen;
}

export interface UseDailyInsightResult {
  insight: Insight;
  /**
   * Mark this insight as shown. Idempotent and debounced — safe to call
   * from a useEffect keyed on insight id + payload hash.
   * Fires the `insight_shown` telemetry event (deduped per session).
   */
  markShown: () => void;
  /**
   * User explicitly dismissed the banner. Hard-suppresses for the
   * remainder of today (and starts the soft cooldown window). Fires
   * the `insight_dismissed` telemetry event.
   */
  dismiss: () => void;
  /**
   * Run the CTA action attached to the insight. No-op if no CTA.
   * Fires the `insight_cta_pressed` telemetry event when invoked.
   */
  triggerCta: () => void;
}

export function useDailyInsight(
  options: UseDailyInsightOptions = {}
): UseDailyInsightResult {
  const screen: InsightScreen = options.screen ?? "progress";
  const { t } = useAppTranslation();
  const router = useRouter();
  const pathname = usePathname();

  // Fine-grained selectors → only invalidate when the relevant slice changes.
  const meals = useNutritionStore((s) => s.meals);
  const weightLogs = useProgressStore((s) => s.weightLogs);
  const profile = useProfileStore((s) => s.profile);
  const plan = useGoalsStore((s) => s.plan);
  const goalType = useGoalsStore((s) => s.goalType);
  const streakCurrent = useStreakStore((s) => s.currentStreak);
  const streakLongest = useStreakStore((s) => s.longestStreak);
  const streakLastLog = useStreakStore((s) => s.lastLogDate);

  const shownAt = useInsightStore((s) => s.shownAt);
  const dismissedAt = useInsightStore((s) => s.dismissedAt);
  const lastPayloadHash = useInsightStore((s) => s.lastPayloadHash);
  const recentRuleIds = useInsightStore((s) => s.recentRuleIds);
  const dismissedToday = useInsightStore((s) => s.dismissedToday);
  const dismissedTodayKey = useInsightStore((s) => s.dismissedTodayKey);
  const bestPctEver = useInsightStore((s) => s.bestPctEver);
  const markShownStore = useInsightStore((s) => s.markShown);
  const dismissStore = useInsightStore((s) => s.dismiss);
  const rotateDailyDismissals = useInsightStore(
    (s) => s.rotateDailyDismissals
  );
  const recordAdherenceSnapshot = useInsightStore(
    (s) => s.recordAdherenceSnapshot
  );

  const { canRecalculate, recalculate } = useRecalculatePlan();

  // ── Context (the expensive computation) ──
  const context = useMemo(
    () =>
      buildInsightContext({
        meals,
        weightLogs,
        profile,
        plan,
        goalType,
        streak: {
          current: streakCurrent,
          longest: streakLongest,
          lastLogDate: streakLastLog,
        },
        bestPctEver,
      }),
    [
      meals,
      weightLogs,
      profile,
      plan,
      goalType,
      streakCurrent,
      streakLongest,
      streakLastLog,
      bestPctEver,
    ]
  );

  // ── Daily housekeeping ──
  // Roll over "dismissedToday" whenever the local day changes.
  useEffect(() => {
    if (dismissedTodayKey !== context.todayIso) {
      rotateDailyDismissals(context.todayIso);
    }
  }, [context.todayIso, dismissedTodayKey, rotateDailyDismissals]);

  // Track running-max adherence so `best_week_ever` works without
  // re-scanning the entire history.
  useEffect(() => {
    if (context.adherence.pct7d > 0) {
      recordAdherenceSnapshot(context.adherence.pct7d);
    }
  }, [context.adherence.pct7d, recordAdherenceSnapshot]);

  // ── Engine ──
  const history = useMemo(
    () =>
      selectInsightHistory({
        shownAt,
        dismissedAt,
        lastPayloadHash,
        recentRuleIds,
        dismissedToday,
        dismissedTodayKey,
        bestPctEver,
        // markers / actions not used by selector
        markShown: () => {},
        dismiss: () => {},
        rotateDailyDismissals: () => {},
        recordAdherenceSnapshot: () => {},
        reset: () => {},
      }),
    [
      shownAt,
      dismissedAt,
      lastPayloadHash,
      recentRuleIds,
      dismissedToday,
      dismissedTodayKey,
      bestPctEver,
    ]
  );

  const insight = useMemo(
    () => evaluateInsight(context, history, t),
    [context, history, t]
  );

  // ── Actions ──
  // The store actions are debounced internally; telemetry has its own
  // per-session dedup. We can therefore call both unconditionally on
  // every shown/dismiss/cta event without introducing duplicates.
  const markShown = useCallback(() => {
    markShownStore(insight.id, insight.payloadHash);
    insightTelemetry.shown(insight, screen);
  }, [insight, markShownStore, screen]);

  const dismiss = useCallback(() => {
    dismissStore(insight.id, { todayIso: context.todayIso });
    insightTelemetry.dismissed(insight, screen);
  }, [insight, context.todayIso, dismissStore, screen]);

  const triggerCta = useCallback(() => {
    const action: InsightCtaAction | undefined = insight.cta?.action;
    if (!action) return;

    insightTelemetry.ctaPressed(insight, screen);

    switch (action) {
      case "log_meal":
        safeOpenFoodTracking({
          source: "insight_engine",
          currentRoute: pathname,
        });
        break;
      case "log_weight":
        router.push("/log-weight" as never);
        break;
      case "view_progress":
        router.push("/progress" as never);
        break;
      case "open_macros":
        // No dedicated route yet — Progress screen surfaces macros.
        router.push("/progress" as never);
        break;
      case "recalculate_plan":
        if (!canRecalculate) {
          Alert.alert(
            t("progress.cannotRecalculate"),
            t("progress.cannotRecalculateDesc")
          );
          return;
        }
        recalculate();
        break;
      case "open_paywall":
        router.push("/paywall" as never);
        break;
      case "dismiss":
        dismiss();
        break;
    }
  }, [
    insight,
    router,
    canRecalculate,
    recalculate,
    t,
    dismiss,
    screen,
    pathname,
  ]);

  return {
    insight,
    markShown,
    dismiss,
    triggerCta,
  };
}
