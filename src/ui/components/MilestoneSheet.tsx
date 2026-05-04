/**
 * MilestoneSheet
 *
 * Bottom-sheet celebration for milestone_achieved state.
 * Reinforces the achievement with real data:
 *   - Milestone badge (large, centered)
 *   - Achievement statement
 *   - Quick stats (days logged, consistency)
 *   - Next target teaser
 *   - Dismiss / continue action
 *
 * Emotional, not informational. Deepens buy-in.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import type { MilestoneInsightModel } from "../../features/milestone/milestone-insight.types";
import { getNextMilestone } from "../../features/streak/streak-psychology.service";
import { useTheme } from "../../theme/useTheme";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";
import { ProgressBar } from "./ProgressBar";

// ── Types ────────────────────────────────────────────────────

interface MilestoneSheetProps {
  model: MilestoneInsightModel;
  longestStreak: number;
  onClose: () => void;
}

// ── Milestone tier labeling ──────────────────────────────────

function getMilestoneTier(days: number): { emoji: string; tier: string } {
  if (days >= 100) return { emoji: "💎", tier: "Diamond" };
  if (days >= 90) return { emoji: "👑", tier: "Unstoppable" };
  if (days >= 60) return { emoji: "⚡", tier: "Elite" };
  if (days >= 30) return { emoji: "🏆", tier: "Dedicated" };
  if (days >= 21) return { emoji: "🎯", tier: "Committed" };
  if (days >= 14) return { emoji: "💪", tier: "Disciplined" };
  if (days >= 7) return { emoji: "🔥", tier: "On fire" };
  if (days >= 3) return { emoji: "✨", tier: "Getting started" };
  return { emoji: "🌱", tier: "First steps" };
}

// ── Component ────────────────────────────────────────────────

export function MilestoneSheet({
  model,
  longestStreak,
  onClose,
}: MilestoneSheetProps) {
  const { theme } = useTheme();
  const tier = getMilestoneTier(model.streakCount);

  const nextTarget = useMemo(() => {
    return getNextMilestone(model.streakCount);
  }, [model.streakCount]);

  const isPersonalBest = model.streakCount >= longestStreak;

  return (
    <View style={styles.root}>
      {/* Badge — large centered emoji */}
      <Animated.View
        entering={FadeIn.duration(400)}
        style={styles.badgeContainer}
      >
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.colors.primary + "14" },
          ]}
        >
          <TText style={styles.badgeEmoji}>{tier.emoji}</TText>
        </View>
        <TSpacer size="sm" />
        <TText style={[styles.tierLabel, { color: theme.colors.primary }]}>
          {tier.tier}
        </TText>
      </Animated.View>

      <TSpacer size="lg" />

      {/* Achievement statement */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(300)}
        style={styles.centered}
      >
        <TText style={[styles.title, { color: theme.colors.text }]}>
          {model.title}
        </TText>
        <TSpacer size="xs" />
        <TText style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {model.subtitle}
        </TText>
      </Animated.View>

      <TSpacer size="xl" />

      {/* Quick stats */}
      <Animated.View entering={FadeInDown.delay(180).duration(300)}>
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <TText style={[styles.statValue, { color: theme.colors.text }]}>
              {model.streakCount}
            </TText>
            <TText
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              days logged
            </TText>
          </View>
          <View
            style={[
              styles.statCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <TText style={[styles.statValue, { color: theme.colors.text }]}>
              {longestStreak}
            </TText>
            <TText
              style={[styles.statLabel, { color: theme.colors.textSecondary }]}
            >
              best streak
            </TText>
          </View>
          {isPersonalBest && (
            <View
              style={[
                styles.statCard,
                { backgroundColor: theme.colors.primary + "14" },
              ]}
            >
              <TText
                style={[styles.statValue, { color: theme.colors.primary }]}
              >
                ✦
              </TText>
              <TText
                style={[styles.statLabel, { color: theme.colors.primary }]}
              >
                new best
              </TText>
            </View>
          )}
        </View>
      </Animated.View>

      <TSpacer size="lg" />

      {/* Next target */}
      {nextTarget && (
        <Animated.View entering={FadeInDown.delay(250).duration(300)}>
          <View
            style={[
              styles.nextTargetCard,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <View style={styles.nextTargetLeft}>
              <TText
                style={[styles.nextTargetTitle, { color: theme.colors.text }]}
              >
                Next: Day {nextTarget.target}
              </TText>
              <TText
                style={[
                  styles.nextTargetSub,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {nextTarget.remaining} more{" "}
                {nextTarget.remaining === 1 ? "day" : "days"} to go
              </TText>
            </View>
            <Ionicons
              name="chevron-forward"
              size={16}
              color={theme.colors.textMuted}
            />
          </View>
          <TSpacer size="sm" />
          <ProgressBar
            progress={model.streakCount / nextTarget.target}
            tone="primary"
            height={5}
          />
        </Animated.View>
      )}

      <TSpacer size="xl" />

      {/* Dismiss */}
      <Animated.View entering={FadeInUp.delay(320).duration(250)}>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.dismissButton,
            { backgroundColor: theme.colors.text },
            pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
          ]}
        >
          <TText
            style={[styles.dismissText, { color: theme.colors.textInverse }]}
          >
            Continue
          </TText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },

  // Badge
  badgeContainer: {
    alignItems: "center",
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeEmoji: {
    fontSize: 40,
  },
  tierLabel: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },

  // Content
  centered: {
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 28,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 21,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 14,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },

  // Next target
  nextTargetCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  nextTargetLeft: {
    flex: 1,
  },
  nextTargetTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  nextTargetSub: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 2,
  },

  // Dismiss
  dismissButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  dismissText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
