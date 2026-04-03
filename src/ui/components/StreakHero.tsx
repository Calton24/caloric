/**
 * StreakHero
 *
 * Prominent streak display with identity label, next milestone progress,
 * and streak-at-risk state. Replaces the small pill for daily view.
 */

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
    getNextMilestone,
    getStreakLabel,
} from "../../features/streak/streak-psychology.service";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TText } from "../primitives/TText";
import { ProgressBar } from "./ProgressBar";

interface StreakHeroProps {
  currentStreak: number;
  onPress?: () => void;
}

export function StreakHero({ currentStreak, onPress }: StreakHeroProps) {
  const { theme } = useTheme();
  const label = getStreakLabel(currentStreak);
  const milestone = getNextMilestone(currentStreak);

  if (currentStreak === 0) return null;

  const progress = milestone ? currentStreak / milestone.target : 1;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${currentStreak} day streak`}
    >
      <GlassSurface variant="card" intensity="light" style={styles.container}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.row}>
          {/* Big streak number */}
          <View style={styles.numberBlock}>
            <TText
              style={[styles.streakNumber, { color: theme.colors.primary }]}
            >
              {currentStreak}
            </TText>
            <TText
              style={[styles.daysLabel, { color: theme.colors.textSecondary }]}
            >
              {currentStreak === 1 ? "day" : "days"}
            </TText>
          </View>

          {/* Identity + milestone */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(350)}
            style={styles.infoBlock}
          >
            {label && (
              <TText
                style={[styles.identityLabel, { color: theme.colors.text }]}
              >
                {label.emoji} {label.label}
              </TText>
            )}

            {milestone && (
              <View style={styles.milestoneRow}>
                <TText
                  style={[
                    styles.milestoneText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {milestone.remaining} day
                  {milestone.remaining !== 1 ? "s" : ""} to {milestone.target}
                  -day milestone
                </TText>
              </View>
            )}

            {milestone && (
              <View style={styles.progressRow}>
                <ProgressBar progress={progress} tone="primary" height={4} />
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </GlassSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  numberBlock: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  streakNumber: {
    fontSize: 40,
    fontWeight: "800",
    lineHeight: 44,
  },
  daysLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 4,
  },
  infoBlock: {
    flex: 1,
    gap: 4,
  },
  identityLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  milestoneRow: {
    marginTop: 2,
  },
  milestoneText: {
    fontSize: 12,
    fontWeight: "400",
  },
  progressRow: {
    marginTop: 4,
  },
});
