/**
 * Home Dashboard (Today Screen)
 *
 * Main tab screen showing:
 * - Day selector (M T W T F S S)
 * - Calorie ring with remaining count
 * - Macro cards (Protein, Carbs, Fat)
 * - Meals list
 * - Floating "+" button to tracking launcher
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PaywallContext } from "../../src/features/challenge/challenge-monetisation.types";
import {
    buildPaywallContext,
    resolvePhase,
} from "../../src/features/challenge/challenge-phase.service";
import { computeProgress } from "../../src/features/challenge/challenge.service";
import { useChallengeStore } from "../../src/features/challenge/challenge.store";
import { useHomeData } from "../../src/features/home/use-home-data";
import { rebuildFoodMemory } from "../../src/features/nutrition/memory/food-memory.service";
import { useNutritionStore } from "../../src/features/nutrition/nutrition.store";
import { useSubscriptionStore } from "../../src/features/subscription/subscription.store";
import { useRevenueCat } from "../../src/features/subscription/useRevenueCat";
import { useTheme } from "../../src/theme/useTheme";
import { ChallengeCompletionCard } from "../../src/ui/components/ChallengeCompletionCard";
import { DailyInsightsCard } from "../../src/ui/components/DailyInsightsCard";
import { DaySelector } from "../../src/ui/components/DaySelector";
import { EditMealSheet } from "../../src/ui/components/EditMealSheet";
import { MacroCard } from "../../src/ui/components/MacroCard";
import { MealCard } from "../../src/ui/components/MealCard";
import { Paywall } from "../../src/ui/components/Paywall";
import { ProgressRing } from "../../src/ui/components/ProgressRing";
import { QuickLogSection } from "../../src/ui/components/QuickLogSection";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { useBottomSheet } from "../../src/ui/sheets/useBottomSheet";

/** Macro accent colors */
const MACRO_COLORS = {
  protein: "#60A5FA",
  carbs: "#FBBF24",
  fat: "#F87171",
};

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  // ── Derived data from stores ──
  const {
    selectedDayIndex,
    handleDaySelect,
    weekDays,
    weekPages,
    weekPagesProgress,
    activeDays,
    dayProgress,
    dateHeader,
    isToday,
    goToNextWeek,
    goToPrevWeek,
    latestWeight,
    calorieBudget,
    dailySummary,
    calorieProgress,
    proteinTarget,
    carbsTarget,
    fatTarget,
  } = useHomeData();

  const removeMeal = useNutritionStore((s) => s.removeMeal);
  const allMeals = useNutritionStore((s) => s.meals);
  const isPro = useSubscriptionStore(
    (s) => s.subscription.hasActiveSubscription
  );
  const { isIntroEligible: storeIntroEligible } = useRevenueCat();
  const { open: openSheet, close: closeSheet } = useBottomSheet();

  // ── Challenge monetisation phase ──
  const challenge = useChallengeStore((s) => s.challenge);
  const insightTriggered = useChallengeStore((s) => s.insightTriggered);
  const introUsed = useChallengeStore((s) => s.introUsed);
  const lastInsightMessage = useChallengeStore((s) => s.lastInsightMessage);
  const milestonesSeen = useChallengeStore((s) => s.milestonesSeen);
  const markIntroUsed = useChallengeStore((s) => s.markIntroUsed);
  const markMilestoneSeen = useChallengeStore((s) => s.markMilestoneSeen);

  const [challengePaywall, setChallengePaywall] =
    useState<PaywallContext | null>(null);

  /**
   * Build paywall context with store-aware intro eligibility.
   * Phase service says whether intro pricing SHOULD show (phase-based);
   * store eligibility says whether it CAN show (billing-based).
   * Both must agree.
   */
  const buildChallengePaywall = useCallback(
    (
      phase: Parameters<typeof buildPaywallContext>[0],
      milestoneDay?: Parameters<typeof buildPaywallContext>[1]
    ) => {
      const ctx = buildPaywallContext(phase, milestoneDay, lastInsightMessage);
      return {
        ...ctx,
        showIntroPricing: ctx.showIntroPricing && storeIntroEligible,
      };
    },
    [storeIntroEligible, lastInsightMessage]
  );

  const challengePhase = (() => {
    if (!challenge || challenge.status !== "active") return null;
    // Use all meals logged dates for progress computation
    const loggedDates = [
      ...new Set(allMeals.map((m) => m.loggedAt.slice(0, 10))),
    ];
    const progress = computeProgress(challenge, loggedDates);
    return {
      result: resolvePhase({
        challengeDay: progress.currentDay,
        insightTriggered,
        introUsed,
        hasPurchased: isPro,
        milestonesSeen,
      }),
      progress,
    };
  })();

  const handlePaywallDismiss = useCallback(() => {
    if (!challengePhase) return;
    const { result } = challengePhase;
    // Mark as displayed (one-time gates)
    if (result.phase === "first_paywall") {
      markIntroUsed();
    }
    if (result.phase === "structured_push" && result.milestoneDay) {
      markMilestoneSeen(result.milestoneDay);
    }
    setChallengePaywall(null);
  }, [challengePhase, markIntroUsed, markMilestoneSeen]);

  // Rebuild food memory on mount so Quick Log has data
  useEffect(() => {
    if (allMeals.length > 0) rebuildFoodMemory(allMeals);
  }, [allMeals]);

  const todayMeals = dailySummary.meals;
  const totals = {
    calories: dailySummary.totalCalories,
    protein: dailySummary.totalProtein,
    carbs: dailySummary.totalCarbs,
    fat: dailySummary.totalFat,
  };
  const targetCalories = calorieBudget;
  const displayWeight = latestWeight ?? 0;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
          <View>
            <TText
              variant="heading"
              style={[styles.greeting, { color: theme.colors.text }]}
            >
              {isToday ? "Today" : dateHeader}
            </TText>
            {isToday && (
              <TText style={[styles.date, { color: theme.colors.textMuted }]}>
                {dateHeader}
              </TText>
            )}
          </View>
          <View style={styles.headerRight}>
            {isPro && (
              <Pressable
                onPress={() => router.push("/(main)/progress" as any)}
                style={[
                  styles.weightPill,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Ionicons
                  name="trending-down"
                  size={14}
                  color={theme.colors.success}
                />
                <TText
                  style={[styles.weightText, { color: theme.colors.text }]}
                >
                  {displayWeight} lbs
                </TText>
              </Pressable>
            )}
            <Pressable
              onPress={() => router.push("/(main)/settings" as any)}
              hitSlop={12}
            >
              <Ionicons
                name="settings-outline"
                size={22}
                color={theme.colors.textMuted}
              />
            </Pressable>
          </View>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TSpacer size="md" />

          {/* Day selector */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <DaySelector
              selectedIndex={selectedDayIndex}
              onSelect={handleDaySelect}
              weekPages={weekPages}
              weekPagesProgress={weekPagesProgress}
              onPrevWeek={goToPrevWeek}
              onNextWeek={goToNextWeek}
            />
          </Animated.View>

          <TSpacer size="lg" />

          {/* Calorie ring */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(200)}
            style={styles.ringSection}
          >
            <View
              style={[
                styles.ringCard,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <ProgressRing
                consumed={totals.calories}
                target={targetCalories}
                size={190}
                strokeWidth={14}
              />
              <TSpacer size="sm" />
              <View style={styles.ringFooter}>
                <View style={styles.ringFooterItem}>
                  <TText
                    style={[
                      styles.ringFooterValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {Math.round(totals.calories)}
                  </TText>
                  <TText
                    style={[
                      styles.ringFooterLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    consumed
                  </TText>
                </View>
                <View
                  style={[
                    styles.ringDivider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={styles.ringFooterItem}>
                  <TText
                    style={[
                      styles.ringFooterValue,
                      { color: theme.colors.text },
                    ]}
                  >
                    {targetCalories}
                  </TText>
                  <TText
                    style={[
                      styles.ringFooterLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    budget
                  </TText>
                </View>
              </View>
            </View>
          </Animated.View>

          <TSpacer size="md" />

          {/* Macro cards */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(300)}
            style={styles.macroRow}
          >
            <MacroCard
              label="Protein"
              consumedG={totals.protein}
              targetG={proteinTarget}
              color={MACRO_COLORS.protein}
            />
            <MacroCard
              label="Carbs"
              consumedG={totals.carbs}
              targetG={carbsTarget}
              color={MACRO_COLORS.carbs}
            />
            <MacroCard
              label="Fat"
              consumedG={totals.fat}
              targetG={fatTarget}
              color={MACRO_COLORS.fat}
            />
          </Animated.View>

          <TSpacer size="lg" />

          {/* Meals section */}
          <Animated.View entering={FadeInUp.duration(500).delay(400)}>
            <View style={styles.mealsHeader}>
              <TText
                variant="subheading"
                style={[styles.sectionTitle, { color: theme.colors.text }]}
              >
                Meals
              </TText>
              <TText
                style={[
                  styles.mealCount,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {todayMeals.length} logged
              </TText>
            </View>
            <TSpacer size="sm" />
            <View style={styles.mealsList}>
              {todayMeals.map((meal) => (
                <MealCard
                  key={meal.id}
                  icon={meal.emoji}
                  title={meal.title}
                  time={meal.loggedAt.split("T")[1]?.slice(0, 5)}
                  calories={meal.calories}
                  protein={meal.protein}
                  carbs={meal.carbs}
                  fat={meal.fat}
                  onPress={() =>
                    openSheet(
                      <EditMealSheet mealId={meal.id} onClose={closeSheet} />,
                      {
                        snapPoints: ["92%"],
                        enablePanDownToClose: true,
                      }
                    )
                  }
                  onDelete={() => removeMeal(meal.id)}
                />
              ))}
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Challenge phase-aware section ── */}
          {challengePhase?.result.phase === "identity" && (
            <ChallengeCompletionCard
              totalCalories={allMeals.reduce((s, m) => s + m.calories, 0)}
              weeklyAvgCalories={Math.round(
                allMeals.reduce((s, m) => s + m.calories, 0) / 3
              )}
              streakDays={challengePhase.progress.completedDays}
              completedDays={challengePhase.progress.completedDays}
            />
          )}

          {/* Daily insights — premium gets full view, free gets buffer in value_buffer */}
          {isPro ? (
            <DailyInsightsCard
              allMeals={allMeals}
              todayDate={dailySummary.date}
            />
          ) : challengePhase?.result.phase === "value_buffer" ? (
            <Paywall
              visible={false}
              context={buildChallengePaywall("value_buffer")}
              onDismiss={() => {
                const ctx = buildChallengePaywall("value_buffer");
                setChallengePaywall(ctx);
              }}
            />
          ) : null}

          <TSpacer size="lg" />

          {/* Eat Again — premium only */}
          {isPro && <QuickLogSection isPro={isPro} />}

          {/* ── Challenge paywall modal ── */}
          {challengePaywall && (
            <Paywall
              visible={true}
              context={challengePaywall}
              onDismiss={handlePaywallDismiss}
            />
          )}

          {/* Bottom spacing for FAB */}
          <TSpacer size="xxl" />
          <TSpacer size="xxl" />
        </ScrollView>
      </SafeAreaView>

      {/* Floating Add button */}
      <Animated.View
        entering={FadeInUp.duration(400).delay(600)}
        style={styles.fabContainer}
      >
        <Pressable
          onPress={() => router.push("/(modals)/tracking" as any)}
          style={({ pressed }) => [
            styles.fab,
            {
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fabGradient}
          >
            <Ionicons name="add" size={30} color={theme.colors.textInverse} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  date: {
    fontSize: 14,
    fontWeight: "400",
    marginTop: 2,
  },
  weightPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  weightText: {
    fontSize: 14,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  ringSection: {
    alignItems: "center",
  },
  ringCard: {
    width: "100%",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  ringFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    marginTop: 8,
  },
  ringFooterItem: {
    alignItems: "center",
  },
  ringFooterValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  ringFooterLabel: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 2,
  },
  ringDivider: {
    height: 24,
    width: 1,
  },
  macroRow: {
    flexDirection: "row",
    gap: 10,
  },
  mealsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  mealCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  mealsList: {
    gap: 8,
  },
  fabContainer: {
    position: "absolute",
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  fab: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
