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
import {
    getChartPointsForSegment,
    getWeightStats,
} from "../../src/features/progress/progress-shaping.service";
import { useRecalculatePlan } from "../../src/features/progress/use-recalculate-plan";
import { useProfileStore, useProgressStore } from "../../src/stores";
import { useTheme } from "../../src/theme/useTheme";
import { SegmentedControl } from "../../src/ui/components/SegmentedControl";
import { WeightChart } from "../../src/ui/components/WeightChart";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

const SEGMENTS = ["Week", "Month", "Year"];

export default function ProgressScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [segmentIndex, setSegmentIndex] = useState(0);

  // ── Domain stores ──
  const profile = useProfileStore((s) => s.profile);
  const weightLogs = useProgressStore((s) => s.weightLogs);
  const { canRecalculate, recalculate } = useRecalculatePlan();

  // ── Derived data ──
  const chartData = useMemo(
    () => getChartPointsForSegment(weightLogs, segmentIndex),
    [weightLogs, segmentIndex]
  );

  const stats = useMemo(
    () => getWeightStats(weightLogs, profile.goalWeightLbs),
    [weightLogs, profile.goalWeightLbs]
  );

  const currentWeight = stats.currentWeight ?? profile.currentWeightLbs ?? 0;
  const goalWeight = profile.goalWeightLbs;
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
            Progress
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
              segments={SEGMENTS}
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
              {["Last 7 Days", "Last 30 Days", "Last Year"][segmentIndex]}
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
                Goal: {goalWeight} lbs
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
                  {currentWeight}
                </TText>
                <TText
                  style={[
                    styles.summaryLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Current (lbs)
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
                  -{totalLost.toFixed(1)}
                </TText>
                <TText
                  style={[
                    styles.summaryLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Lost (lbs)
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
                  {remaining.toFixed(1)}
                </TText>
                <TText
                  style={[
                    styles.summaryLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  To goal (lbs)
                </TText>
              </View>
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* Action buttons */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(400)}
            style={styles.actions}
          >
            <Pressable
              onPress={() => router.push("/(modals)/log-weight" as any)}
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
                Log Weight
              </TText>
            </Pressable>

            <Pressable
              onPress={() => {
                if (!canRecalculate) {
                  Alert.alert(
                    "Cannot Recalculate",
                    "Log a weight entry and complete onboarding first."
                  );
                  return;
                }
                recalculate();
                Alert.alert(
                  "Plan Updated",
                  `Your plan has been recalculated using your latest weight of ${currentWeight} lbs.`
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
                Recalculate Plan
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
});
