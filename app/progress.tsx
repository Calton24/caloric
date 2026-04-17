/**
 * Progress Screen
 *
 * Weight tracking with Week / Month / Year segmented control.
 * Shows bar chart, weight summary card, goal line, and CTAs.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnits } from "../hooks/useUnits";
import {
    getNutritionChartPoints,
    getNutritionStats,
} from "../src/features/nutrition/nutrition-trends.service";
import {
    getChartPointsForSegment,
    getWeightStats,
} from "../src/features/progress/progress-shaping.service";
import { useRecalculatePlan } from "../src/features/progress/use-recalculate-plan";
import { useAppTranslation } from "../src/infrastructure/i18n/useAppTranslation";
import {
    useGoalsStore,
    useNutritionStore,
    useProfileStore,
    useProgressStore,
} from "../src/stores";
import { useTheme } from "../src/theme/useTheme";
import { NutritionTrendChart } from "../src/ui/components/NutritionTrendChart";
import { SegmentedControl } from "../src/ui/components/SegmentedControl";
import { WeightChart } from "../src/ui/components/WeightChart";
import { TSpacer } from "../src/ui/primitives/TSpacer";
import { TText } from "../src/ui/primitives/TText";

const SEGMENTS_KEYS = [
  "progress.week",
  "progress.month",
  "progress.year",
] as const;

export default function ProgressScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const units = useUnits();
  const [segmentIndex, setSegmentIndex] = useState(0);

  // ── Domain stores ──
  const profile = useProfileStore((s) => s.profile);
  const weightLogs = useProgressStore((s) => s.weightLogs);
  const meals = useNutritionStore((s) => s.meals);
  const plan = useGoalsStore((s) => s.plan);
  const { canRecalculate, recalculate } = useRecalculatePlan();

  const calorieBudget = plan?.calorieBudget ?? 0;

  // ── Derived data ──
  const chartData = useMemo(
    () => getChartPointsForSegment(weightLogs, segmentIndex),
    [weightLogs, segmentIndex]
  );

  const nutritionChartData = useMemo(
    () => getNutritionChartPoints(meals, segmentIndex),
    [meals, segmentIndex]
  );

  const nutritionStats = useMemo(
    () => getNutritionStats(meals, segmentIndex, calorieBudget),
    [meals, segmentIndex, calorieBudget]
  );

  const stats = useMemo(
    () => getWeightStats(weightLogs, profile.goalWeightLbs),
    [weightLogs, profile.goalWeightLbs]
  );

  const currentWeight = stats.currentWeight ?? profile.currentWeightLbs ?? 0;
  const goalWeight = profile.goalWeightLbs ?? 0;
  const totalLost = stats.totalChange;
  const remaining = stats.remaining ?? 0;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
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
        >
          <TSpacer size="md" />

          {/* Segmented Control */}
          <Animated.View entering={FadeIn.duration(400)}>
            <SegmentedControl
              segments={SEGMENTS_KEYS.map((k) => t(k))}
              selectedIndex={segmentIndex}
              onSelect={setSegmentIndex}
            />
          </Animated.View>

          <TSpacer size="md" />

          {/* Period label */}
          <Animated.View entering={FadeIn.duration(400).delay(100)}>
            <TText
              style={[
                styles.periodLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              {
                [
                  t("progress.last7Days"),
                  t("progress.last30Days"),
                  t("progress.lastYear"),
                ][segmentIndex]
              }
            </TText>
          </Animated.View>

          <TSpacer size="md" />

          {/* Weight Chart */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(200)}
            style={[
              styles.chartCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartScroll}
            >
              <WeightChart
                data={chartData}
                goalWeight={goalWeight ?? undefined}
                height={200}
              />
            </ScrollView>

            {/* Goal line legend */}
            <View style={styles.legendRow}>
              <View
                style={[
                  styles.legendDash,
                  { backgroundColor: theme.colors.success },
                ]}
              />
              <TText
                style={[styles.legendText, { color: theme.colors.textMuted }]}
              >
                {t("progress.goalLabel", {
                  weight: units.display(goalWeight),
                  unit: units.label,
                })}
              </TText>
            </View>
          </Animated.View>

          <TSpacer size="md" />

          {/* Weight Summary Card */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(300)}
            style={[
              styles.summaryCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <TText
                  style={[styles.summaryValue, { color: theme.colors.text }]}
                >
                  {units.display(currentWeight)}
                </TText>
                <TText
                  style={[
                    styles.summaryLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t("progress.current", { unit: units.label })}
                </TText>
              </View>

              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: theme.colors.border },
                ]}
              />

              <View style={styles.summaryItem}>
                <TText
                  style={[styles.summaryValue, { color: theme.colors.success }]}
                >
                  -{units.display(totalLost, 1)}
                </TText>
                <TText
                  style={[
                    styles.summaryLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t("progress.lost", { unit: units.label })}
                </TText>
              </View>

              <View
                style={[
                  styles.summaryDivider,
                  { backgroundColor: theme.colors.border },
                ]}
              />

              <View style={styles.summaryItem}>
                <TText
                  style={[styles.summaryValue, { color: theme.colors.text }]}
                >
                  {units.display(remaining, 1)}
                </TText>
                <TText
                  style={[
                    styles.summaryLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t("progress.toGoal", { unit: units.label })}
                </TText>
              </View>
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Nutrition Trends ── */}
          <Animated.View entering={FadeIn.duration(400).delay(350)}>
            <TText
              variant="heading"
              style={[styles.sectionTitle, { color: theme.colors.text }]}
            >
              {t("progress.calorieTrends")}
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View
            entering={FadeInDown.duration(500).delay(400)}
            style={[
              styles.chartCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            {nutritionChartData.some((d) => d.calories > 0) ? (
              <>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chartScroll}
                >
                  <NutritionTrendChart
                    data={nutritionChartData}
                    calorieBudget={calorieBudget || undefined}
                    height={200}
                  />
                </ScrollView>

                {calorieBudget > 0 && (
                  <View style={styles.legendRow}>
                    <View
                      style={[
                        styles.legendDash,
                        { backgroundColor: theme.colors.success },
                      ]}
                    />
                    <TText
                      style={[
                        styles.legendText,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {t("progress.budgetLabel", { budget: calorieBudget })}
                    </TText>
                  </View>
                )}
              </>
            ) : (
              <TText
                style={[styles.emptyText, { color: theme.colors.textMuted }]}
              >
                {t("progress.noMealsLogged")}
              </TText>
            )}
          </Animated.View>

          <TSpacer size="md" />

          {/* Nutrition Summary Card */}
          {nutritionStats.daysLogged > 0 && (
            <Animated.View
              entering={FadeInUp.duration(500).delay(450)}
              style={[
                styles.summaryCard,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <TText
                    style={[styles.summaryValue, { color: theme.colors.text }]}
                  >
                    {nutritionStats.avgCalories}
                  </TText>
                  <TText
                    style={[
                      styles.summaryLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t("progress.avgKcalDay")}
                  </TText>
                </View>

                <View
                  style={[
                    styles.summaryDivider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />

                <View style={styles.summaryItem}>
                  <TText
                    style={[styles.summaryValue, { color: theme.colors.text }]}
                  >
                    {nutritionStats.avgProtein}g
                  </TText>
                  <TText
                    style={[
                      styles.summaryLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t("progress.avgProtein")}
                  </TText>
                </View>

                <View
                  style={[
                    styles.summaryDivider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />

                <View style={styles.summaryItem}>
                  <TText
                    style={[
                      styles.summaryValue,
                      {
                        color:
                          nutritionStats.adherencePercent >= 70
                            ? theme.colors.success
                            : nutritionStats.adherencePercent >= 40
                              ? theme.colors.warning
                              : theme.colors.error,
                      },
                    ]}
                  >
                    {nutritionStats.adherencePercent}%
                  </TText>
                  <TText
                    style={[
                      styles.summaryLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t("progress.onTarget")}
                  </TText>
                </View>
              </View>

              {/* Macro breakdown row */}
              <View
                style={[
                  styles.macroDivider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <View style={styles.macroRow}>
                <View style={styles.macroItem}>
                  <View
                    style={[
                      styles.macroDot,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                  <TText
                    style={[
                      styles.macroText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t("progress.proteinShort")} {nutritionStats.avgProtein}g
                  </TText>
                </View>
                <View style={styles.macroItem}>
                  <View
                    style={[
                      styles.macroDot,
                      { backgroundColor: theme.colors.warning },
                    ]}
                  />
                  <TText
                    style={[
                      styles.macroText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t("progress.carbsShort")} {nutritionStats.avgCarbs}g
                  </TText>
                </View>
                <View style={styles.macroItem}>
                  <View
                    style={[
                      styles.macroDot,
                      { backgroundColor: theme.colors.error },
                    ]}
                  />
                  <TText
                    style={[
                      styles.macroText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t("progress.fatShort")} {nutritionStats.avgFat}g
                  </TText>
                </View>
              </View>
            </Animated.View>
          )}

          <TSpacer size="lg" />

          {/* Action buttons */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(400)}
            style={styles.actions}
          >
            <Pressable
              onPress={() => router.push("/log-weight" as any)}
              style={[
                styles.actionBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="scale-outline"
                size={20}
                color={theme.colors.primary}
              />
              <TText
                style={[styles.actionText, { color: theme.colors.primary }]}
              >
                {t("progress.logWeight")}
              </TText>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!canRecalculate) {
                  Alert.alert(
                    t("progress.cannotRecalculate"),
                    t("progress.cannotRecalculateDesc")
                  );
                  return;
                }
                recalculate();
                Alert.alert(
                  t("progress.planUpdated"),
                  t("progress.planUpdatedDesc", {
                    weight: units.format(currentWeight),
                  })
                );
              }}
              style={[
                styles.actionBtn,
                { backgroundColor: theme.colors.surfaceSecondary },
              ]}
            >
              <Ionicons
                name="refresh-outline"
                size={20}
                color={theme.colors.primary}
              />
              <TText
                style={[styles.actionText, { color: theme.colors.primary }]}
              >
                {t("progress.recalculatePlan")}
              </TText>
            </Pressable>
          </Animated.View>

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
    paddingHorizontal: 20,
  },
  periodLabel: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  chartCard: {
    borderRadius: 20,
    padding: 20,
    gap: 12,
  },
  chartScroll: {
    paddingVertical: 4,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDash: {
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  legendText: {
    fontSize: 12,
    fontWeight: "500",
  },
  summaryCard: {
    borderRadius: 16,
    padding: 20,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "400",
  },
  summaryDivider: {
    width: 1,
    height: 36,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 24,
  },
  macroDivider: {
    height: 1,
    marginVertical: 12,
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
