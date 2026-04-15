/**
 * CoachInsight
 *
 * Minimal, passive AI coach nudge displayed on the home screen.
 * Shows a single short insight based on nutrition state + time of day.
 * Hides when there is nothing actionable to say.
 */

import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import {
    type CoachInput,
    type CoachOutput,
    generateCoachInsight,
    getDayProgress,
} from "../../features/coach/coach-insight";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface CoachInsightProps {
  caloriesConsumed: number;
  calorieGoal: number;
  proteinLeft: number;
  carbsLeft: number;
  fatLeft: number;
  streakDays: number;
}

const TONE_ACCENT: Record<CoachOutput["tone"], string> = {
  positive: "#10B981",
  neutral: "#A1A1AA",
  corrective: "#F59E0B",
};

export const CoachInsight = React.memo(function CoachInsight({
  caloriesConsumed,
  calorieGoal,
  proteinLeft,
  carbsLeft,
  fatLeft,
  streakDays,
}: CoachInsightProps) {
  const { theme } = useTheme();

  const insight = useMemo<CoachOutput | null>(() => {
    const hour = new Date().getHours();
    const input: CoachInput = {
      caloriesConsumed,
      calorieGoal,
      proteinLeft,
      carbsLeft,
      fatLeft,
      streakDays,
      dayProgress: getDayProgress(hour),
    };
    return generateCoachInsight(input);
  }, [
    caloriesConsumed,
    calorieGoal,
    proteinLeft,
    carbsLeft,
    fatLeft,
    streakDays,
  ]);

  if (!insight) return null;

  const accent = TONE_ACCENT[insight.tone];

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(200)}
    >
      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.surfaceSecondary },
        ]}
      >
        <View style={[styles.indicator, { backgroundColor: accent }]} />
        <TText
          style={[styles.text, { color: theme.colors.textSecondary }]}
          numberOfLines={2}
        >
          {insight.insight}
        </TText>
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  indicator: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  text: {
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    fontWeight: "500",
    letterSpacing: 0.1,
  },
});
