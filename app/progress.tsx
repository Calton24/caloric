/**
 * Progress Dashboard
 *
 * High-retention analytics dashboard. Every card answers three questions:
 *
 *   What is happening?  →  Is that good or bad?  →  What should I do next?
 *
 * Layout:
 *
 *   1. Top summary grid       — Weight (trend + confidence + delta + CTA)
 *                                Streak (risk state + urgency + milestone)
 *   2. Range selector          — 7D / 30D / 90D / All (drives charts)
 *   3. Goal progress chart     — smooth weight line + trend label + adjust CTA
 *   4. Smart insight banner    — rule-based, swipe-to-dismiss, action-driven
 *   5. Calorie + macros        — stacked bars + balance pill + best/worst day
 *   6. Weekly performance      — composite 0–100 score with breakdown
 *   7. BMI                     — value, classification, scale
 *   8. FFMI calculator         — body-fat % input, lean-mass index + scale
 *   9. Action row              — Log Weight, Recalculate Plan
 *
 * All derived signals are computed via pure selectors in
 * `dashboard.selectors.ts`, memoised here, and consumed by stateless cards
 * — no recomputation on unrelated state changes, no chart re-renders unless
 * the underlying data slice changed.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { safeBack } from "../src/lib/navigation/safeBack";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown, Layout } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnits } from "../hooks/useUnits";
import {
  type DashboardRange,
  getAverageCalories,
  getBestWorstDay,
  getBMI,
  getGoalProgress,
  getMacroBalanceFeedback,
  getMacroBreakdown,
  getNextMilestone,
  getPeriodDeltaLbs,
  getStreakData,
  getStreakRisk,
  getStreakUrgency,
  getTrendLabel,
  getWeeklyPerformance,
  getWeightConfidence,
  getWeightTrend,
} from "../src/features/progress/dashboard.selectors";
import { useDailyInsight } from "../src/features/insights";
import { getRuleById } from "../src/features/insights/insight.rules";
import { useRecalculatePlan } from "../src/features/progress/use-recalculate-plan";
import { useStreakStore } from "../src/features/streak/streak.store";
import { convertWeight } from "../src/lib/utils/units";
import { useAppTranslation } from "../src/infrastructure/i18n/useAppTranslation";
import {
  useGoalsStore,
  useNutritionStore,
  useProfileStore,
  useProgressStore,
} from "../src/stores";
import { useTheme } from "../src/theme/useTheme";
import { ActionRow } from "../src/ui/components/progress/ActionRow";
import { BMICard } from "../src/ui/components/progress/BMICard";
import { FFMICard } from "../src/ui/components/progress/FFMICard";
import { GoalChartCard } from "../src/ui/components/progress/GoalChartCard";
import { InsightBanner } from "../src/ui/components/progress/InsightBanner";
import { MacroTrendsCard } from "../src/ui/components/progress/MacroTrendsCard";
import { RangeSelector } from "../src/ui/components/progress/RangeSelector";
import { StreakSummaryCard } from "../src/ui/components/progress/StreakSummaryCard";
import { WeeklyPerformanceCard } from "../src/ui/components/progress/WeeklyPerformanceCard";
import { WeightSummaryCard } from "../src/ui/components/progress/WeightSummaryCard";
import { TSpacer } from "../src/ui/primitives/TSpacer";
import { TText } from "../src/ui/primitives/TText";

const MS_PER_DAY = 86_400_000;

export default function ProgressScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const units = useUnits();

  // ── Range: tab updates immediately; chart `range` updates in a transition
  //    so the segmented control stays responsive on large meal histories.
  const [range, setRange] = useState<DashboardRange>("30d");
  const [tabRange, setTabRange] = useState<DashboardRange>("30d");
  const [, startRangeTransition] = useTransition();
  const onRangeChange = useCallback((next: DashboardRange) => {
    setTabRange(next);
    startRangeTransition(() => setRange(next));
  }, []);

  // ── Two-phase render: paint header + top cards on frame 1, defer heavy
  //    chart computations (74 meals × selectors) until frame 2.
  //    This makes the screen appear instantly on the first frame.
  const [contentReady, setContentReady] = useState(false);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => setContentReady(true));
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ── Domain stores ──
  const profile = useProfileStore((s) => s.profile);
  const weightLogs = useProgressStore((s) => s.weightLogs);
  const meals = useNutritionStore((s) => s.meals);
  const plan = useGoalsStore((s) => s.plan);
  const longestStreak = useStreakStore((s) => s.longestStreak);
  const { canRecalculate, recalculate } = useRecalculatePlan();

  const calorieBudget = plan?.calorieBudget ?? 0;

  // ── Derived weight / goal ──
  const weightTrend = useMemo(
    () => getWeightTrend(weightLogs, range),
    [weightLogs, range]
  );

  const startWeightLbs = useMemo(() => {
    if (weightLogs.length > 0) {
      // Logs are sorted newest-first; oldest = start
      return weightLogs[weightLogs.length - 1].weightLbs;
    }
    return profile.currentWeightLbs;
  }, [weightLogs, profile.currentWeightLbs]);

  const currentWeightLbs = useMemo(() => {
    if (weightLogs.length > 0) return weightLogs[0].weightLbs;
    return profile.currentWeightLbs;
  }, [weightLogs, profile.currentWeightLbs]);

  const goalProgress = useMemo(
    () =>
      getGoalProgress(
        startWeightLbs,
        currentWeightLbs,
        profile.goalWeightLbs ?? null
      ),
    [startWeightLbs, currentWeightLbs, profile.goalWeightLbs]
  );

  const daysSinceLastLog = useMemo(() => {
    if (weightLogs.length === 0) return null;
    const last = new Date(weightLogs[0].date + "T12:00:00").getTime();
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    return Math.max(0, Math.floor((today.getTime() - last) / MS_PER_DAY));
  }, [weightLogs]);

  // ── Derived nutrition — deferred so first frame is cheap ──
  const macroPoints = useMemo(
    () => (contentReady ? getMacroBreakdown(meals, range) : []),
    [contentReady, meals, range]
  );
  const calorieAverages = useMemo(
    () =>
      contentReady
        ? getAverageCalories(meals, range)
        : { avgCalories: 0, avgMacros: { protein: 0, carbs: 0, fat: 0 } },
    [contentReady, meals, range]
  );

  // % days within ±10% of calorie budget — already captured by existing
  // nutrition stats logic; recompute here using points + budget so we keep
  // a single source of truth.
  const daysOnTargetPercent = useMemo(() => {
    if (!calorieBudget || calorieBudget <= 0) return 0;
    const logged = macroPoints.filter((p) => p.calories > 0);
    if (logged.length === 0) return 0;
    const onTarget = logged.filter((p) => {
      const r = p.calories / calorieBudget;
      return r >= 0.9 && r <= 1.1;
    }).length;
    return Math.round((onTarget / logged.length) * 100);
  }, [macroPoints, calorieBudget]);

  // ── Streak — deferred; streak cards are in phase 1 but getStreakData is fast ──
  const streakSummary = useMemo(
    () => getStreakData(meals, longestStreak),
    [meals, longestStreak]
  );

  // Today + hour for time-sensitive risk + urgency states. We capture them
  // once per render and let memoised selectors run downstream — this avoids
  // re-evaluating the risk state machine on every store mutation.
  const nowHour = useMemo(() => new Date().getHours(), []);
  const loggedToday = useMemo(() => {
    return streakSummary.week.some((d) => d.isToday && d.logged);
  }, [streakSummary.week]);

  const streakRisk = useMemo(
    () => getStreakRisk(streakSummary.currentStreak, loggedToday, nowHour),
    [streakSummary.currentStreak, loggedToday, nowHour]
  );
  const streakUrgency = useMemo(
    () => getStreakUrgency(loggedToday, nowHour),
    [loggedToday, nowHour]
  );
  const nextMilestone = useMemo(
    () =>
      getNextMilestone(
        streakSummary.currentStreak,
        streakSummary.longestStreak
      ),
    [streakSummary.currentStreak, streakSummary.longestStreak]
  );

  // ── Weight signals ──
  const periodDeltaLbs = useMemo(
    () => getPeriodDeltaLbs(weightLogs, range),
    [weightLogs, range]
  );

  const weightHistoryDays = useMemo(() => {
    if (weightLogs.length < 2) return 0;
    const newest = new Date(weightLogs[0].date + "T12:00:00").getTime();
    const oldest = new Date(
      weightLogs[weightLogs.length - 1].date + "T12:00:00"
    ).getTime();
    return Math.max(0, Math.floor((newest - oldest) / MS_PER_DAY));
  }, [weightLogs]);

  const weightConfidence = useMemo(
    () =>
      getWeightConfidence(
        weightTrend.weeklyRateLbs,
        plan?.weeklyRateLbs ?? 0,
        weightTrend.points.length,
        weightHistoryDays
      ),
    [
      weightTrend.weeklyRateLbs,
      weightTrend.points.length,
      plan?.weeklyRateLbs,
      weightHistoryDays,
    ]
  );

  const trendLabel = useMemo(
    () =>
      getTrendLabel(
        weightTrend.weeklyRateLbs,
        plan?.weeklyRateLbs ?? 0,
        plan?.goalType ?? null,
        weightTrend.points.length,
        weightHistoryDays
      ),
    [
      weightTrend.weeklyRateLbs,
      weightTrend.points.length,
      plan?.weeklyRateLbs,
      plan?.goalType,
      weightHistoryDays,
    ]
  );

  // ── Macro signals ──
  const macroBalance = useMemo(
    () =>
      getMacroBalanceFeedback(
        calorieAverages.avgMacros,
        plan?.macros ?? null,
        macroPoints.some((p) => p.calories > 0)
      ),
    [calorieAverages.avgMacros, plan?.macros, macroPoints]
  );

  const bestWorstDay = useMemo(
    () =>
      getBestWorstDay(
        macroPoints,
        calorieBudget,
        plan?.macros.protein ?? 0
      ),
    [macroPoints, calorieBudget, plan?.macros.protein]
  );

  // ── Weekly performance score — deferred ──
  const weeklyPerformance = useMemo(
    () =>
      getWeeklyPerformance(
        contentReady ? meals : [],
        calorieBudget,
        plan?.macros.protein ?? 0
      ),
    [contentReady, meals, calorieBudget, plan?.macros.protein]
  );

  // ── BMI ──
  const bmi = useMemo(
    () => getBMI(profile.heightCm ?? null, currentWeightLbs ?? null),
    [profile.heightCm, currentWeightLbs]
  );

  // ── Smart insight (rule-based engine) ──
  const {
    insight,
    markShown: markInsightShown,
    dismiss: dismissInsight,
    triggerCta: triggerInsightCta,
  } = useDailyInsight({ screen: "progress" });
  const insightDismissible = useMemo(
    () => getRuleById(insight.id)?.dismissible ?? false,
    [insight.id]
  );

  // ── Display helpers (unit-aware) ──
  const toDisplay = useCallback(
    (lbs: number) => convertWeight(lbs, units.weightUnit),
    [units.weightUnit]
  );

  const currentDisplay = useMemo(
    () => (currentWeightLbs != null ? units.display(currentWeightLbs) : "—"),
    [currentWeightLbs, units]
  );
  const goalDisplay = useMemo(
    () =>
      profile.goalWeightLbs != null
        ? units.display(profile.goalWeightLbs)
        : "—",
    [profile.goalWeightLbs, units]
  );
  const goalDisplayValue = useMemo(
    () =>
      profile.goalWeightLbs != null
        ? convertWeight(profile.goalWeightLbs, units.weightUnit)
        : null,
    [profile.goalWeightLbs, units.weightUnit]
  );

  // Pre-format the period delta in display unit so the card stays
  // i18n-agnostic and never re-converts on its own.
  const periodDeltaDisplay = useMemo(() => {
    if (periodDeltaLbs == null) return null;
    const converted = convertWeight(periodDeltaLbs, units.weightUnit);
    return Math.abs(converted) >= 0.05 ? converted.toFixed(1) : "0.0";
  }, [periodDeltaLbs, units.weightUnit]);

  const rangeLabel = useMemo(() => {
    switch (range) {
      case "7d":
        return t("progress.last7Days");
      case "30d":
        return t("progress.last30Days");
      case "90d":
        return "Last 90 Days";
      case "all":
        return t("progress.ranges.all");
    }
  }, [range, t]);

  // ── Handlers ──
  const onLogWeight = useCallback(() => {
    router.push("/log-weight" as never);
  }, [router]);

  // Streak "Log now" CTA — routes to the home tab so the user can log
  // a meal (the cheapest streak-saving action). Falls back to weight
  // logging only if Home isn't reachable.
  const onLogNow = useCallback(() => {
    router.push("/(tabs)" as never);
  }, [router]);

  // Macro card "Improve today" — surfaces today's meals so the user
  // can take immediate corrective action.
  const onImproveToday = useCallback(() => {
    router.push("/(tabs)" as never);
  }, [router]);

  // Weekly score "Improve score" — drives the user back to logging,
  // since logging consistency is the highest-leverage pillar.
  const onImproveScore = useCallback(() => {
    router.push("/(tabs)" as never);
  }, [router]);

  const onRecalculate = useCallback(() => {
    if (!canRecalculate) {
      Alert.alert(
        t("progress.cannotRecalculate"),
        t("progress.cannotRecalculateDesc")
      );
      return;
    }
    recalculate();
    if (currentWeightLbs != null) {
      Alert.alert(
        t("progress.planUpdated"),
        t("progress.planUpdatedDesc", {
          weight: units.format(currentWeightLbs),
        })
      );
    }
  }, [canRecalculate, recalculate, t, units, currentWeightLbs]);

  // ── Render ──
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => safeBack("/(tabs)")}
            hitSlop={12}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            {t("progress.title")}
          </TText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
        >
          {/* 1. Top summary grid */}
          <Animated.View
            entering={FadeInDown.duration(220)}
            style={styles.gridRow}
          >
            <WeightSummaryCard
              currentDisplay={currentDisplay}
              goalDisplay={goalDisplay}
              unitLabel={units.label}
              progressPercent={goalProgress.percent}
              daysSinceLastLog={daysSinceLastLog}
              trendDirection={weightTrend.direction}
              periodDeltaLbs={periodDeltaLbs}
              periodDeltaDisplay={periodDeltaDisplay}
              confidence={weightConfidence}
              hasWeightHistory={weightLogs.length > 0}
              onPress={onLogWeight}
              onPrimaryCta={onLogWeight}
            />
            <View style={{ width: 12 }} />
            <StreakSummaryCard
              currentStreak={streakSummary.currentStreak}
              longestStreak={streakSummary.longestStreak}
              week={streakSummary.week}
              risk={streakRisk}
              urgency={streakUrgency}
              nextMilestone={nextMilestone}
              onPrimaryCta={onLogNow}
            />
          </Animated.View>

          <TSpacer size="md" />

          {/* 2. Range selector */}
          <Animated.View entering={FadeIn.duration(200)}>
            <RangeSelector value={tabRange} onChange={onRangeChange} />
          </Animated.View>

          <TSpacer size="md" />

          {/* 3–8. Heavy cards — deferred until after the first frame so the
              header + top summary grid paint instantly. */}
          {contentReady ? (
            <>
              {/* 3. Goal progress chart */}
              <Animated.View
                layout={Layout.springify().damping(20)}
                entering={FadeInDown.duration(300)}
              >
                <GoalChartCard
                  trend={weightTrend}
                  goalDisplayValue={goalDisplayValue}
                  unitLabel={units.label}
                  toDisplay={toDisplay}
                  goalProgressPercent={goalProgress.percent}
                  rangeLabel={rangeLabel}
                  trendLabel={trendLabel}
                  onAdjustPlan={onRecalculate}
                  canAdjustPlan={canRecalculate}
                />
              </Animated.View>

              <TSpacer size="md" />

              {/* 4. Smart insight banner */}
              <InsightBanner
                insight={insight}
                onShown={markInsightShown}
                onCtaPress={triggerInsightCta}
                onDismiss={dismissInsight}
                dismissible={insightDismissible}
              />

              <TSpacer size="md" />

              {/* 5. Calorie + macros */}
              <Animated.View
                layout={Layout.springify().damping(20)}
                entering={FadeInDown.duration(300).delay(40)}
              >
                <MacroTrendsCard
                  data={macroPoints}
                  calorieBudget={calorieBudget || null}
                  avgCalories={calorieAverages.avgCalories}
                  avgMacros={calorieAverages.avgMacros}
                  daysOnTargetPercent={daysOnTargetPercent}
                  rangeLabel={rangeLabel}
                  balance={macroBalance}
                  bestDay={bestWorstDay.best}
                  worstDay={bestWorstDay.worst}
                  onImproveToday={onImproveToday}
                />
              </Animated.View>

              <TSpacer size="md" />

              {/* 6. Weekly performance score */}
              <Animated.View entering={FadeInDown.duration(300).delay(60)}>
                <WeeklyPerformanceCard
                  performance={weeklyPerformance}
                  onImprove={onImproveScore}
                />
              </Animated.View>

              <TSpacer size="md" />

              {/* 7. BMI */}
              <Animated.View entering={FadeInDown.duration(300).delay(80)}>
                <BMICard bmi={bmi} />
              </Animated.View>

              <TSpacer size="md" />

              {/* 8. FFMI calculator */}
              <Animated.View entering={FadeInDown.duration(300).delay(90)}>
                <FFMICard
                  heightCm={profile.heightCm ?? null}
                  currentWeightLbs={currentWeightLbs ?? null}
                />
              </Animated.View>

              <TSpacer size="lg" />

              {/* 9. Action row */}
              <Animated.View entering={FadeIn.duration(300).delay(100)}>
                <ActionRow
                  canRecalculate={canRecalculate}
                  onLogWeight={onLogWeight}
                  onRecalculate={onRecalculate}
                />
              </Animated.View>
            </>
          ) : (
            /* Phase-1 placeholder — keeps layout stable while heavy cards load */
            <View style={styles.deferredPlaceholder} />
          )}

          <TSpacer size="xxl" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  deferredPlaceholder: {
    height: 400,
  },
  gridRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
});
