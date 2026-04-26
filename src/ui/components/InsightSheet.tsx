/**
 * InsightSheet
 *
 * Bottom-sheet expansion for the MilestoneInsightCard.
 * Shows momentum/preview state with real context:
 *   - Streak header with icon
 *   - Expanded insight text
 *   - Progress bar to next milestone
 *   - Last 5 days mini-view (logged / not)
 *   - Optional CTA
 *
 * This is NOT a dashboard. It's a focused continuation of the card's thought.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import type { MilestoneInsightModel } from "../../features/milestone/milestone-insight.types";
import { getMealsForDate } from "../../features/nutrition/nutrition.selectors";
import { useNutritionStore } from "../../features/nutrition/nutrition.store";
import { toISODate } from "../../lib/utils/date";
import { useTheme } from "../../theme/useTheme";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";
import { ProgressBar } from "./ProgressBar";

// ── Types ────────────────────────────────────────────────────

interface InsightSheetProps {
  model: MilestoneInsightModel;
  onClose: () => void;
  onTrack?: () => void;
}

// ── Icon mapping (same as MilestoneInsightCard) ─────────────

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  shield: "shield-checkmark",
  flame: "flame",
  target: "flag",
  trophy: "trophy",
  refresh: "refresh",
};

// ── Helpers ──────────────────────────────────────────────────

function getDayLabel(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}

function getRecentDays(
  count: number
): { iso: string; label: string; isToday: boolean }[] {
  const today = new Date();
  const result: { iso: string; label: string; isToday: boolean }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push({
      iso: toISODate(d),
      label: i === 0 ? "Today" : getDayLabel(d),
      isToday: i === 0,
    });
  }
  return result;
}

// ── Accent color util ────────────────────────────────────────

function useAccentColor(model: MilestoneInsightModel) {
  const { theme } = useTheme();
  switch (model.accent) {
    case "warning":
      return theme.colors.warning;
    case "success":
      return theme.colors.primary;
    case "highlight":
      return theme.colors.info;
    case "neutral":
    default:
      return theme.colors.textSecondary;
  }
}

// ── Component ────────────────────────────────────────────────

export function InsightSheet({ model, onClose, onTrack }: InsightSheetProps) {
  const { theme } = useTheme();
  const accentColor = useAccentColor(model);
  const meals = useNutritionStore((s) => s.meals);

  const recentDays = useMemo(() => getRecentDays(5), []);

  const dayStatuses = useMemo(() => {
    return recentDays.map((day) => {
      const dayMeals = getMealsForDate(meals, day.iso);
      return {
        ...day,
        logged: dayMeals.length > 0,
      };
    });
  }, [recentDays, meals]);

  const progressTone =
    model.accent === "warning"
      ? ("warning" as const)
      : model.accent === "success"
        ? ("success" as const)
        : ("primary" as const);

  return (
    <View style={styles.root}>
      {/* Header: Icon + Streak count */}
      <Animated.View entering={FadeIn.duration(250)} style={styles.header}>
        <View
          style={[styles.iconCircle, { backgroundColor: accentColor + "1A" }]}
        >
          <Ionicons
            name={ICON_MAP[model.icon] ?? "flame"}
            size={22}
            color={accentColor}
          />
        </View>
        <View style={styles.headerText}>
          <TText style={[styles.streakNumber, { color: theme.colors.text }]}>
            Day {model.streakCount}
          </TText>
          {model.chip && (
            <View
              style={[
                styles.chipInline,
                { backgroundColor: accentColor + "1A" },
              ]}
            >
              <TText style={[styles.chipText, { color: accentColor }]}>
                {model.chip}
              </TText>
            </View>
          )}
        </View>
      </Animated.View>

      <TSpacer size="lg" />

      {/* Expanded insight */}
      <Animated.View entering={FadeInDown.delay(80).duration(250)}>
        <TText style={[styles.title, { color: theme.colors.text }]}>
          {model.title}
        </TText>
        <TSpacer size="xs" />
        <TText style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          {model.subtitle}
        </TText>
      </Animated.View>

      <TSpacer size="lg" />

      {/* Progress to next milestone */}
      {model.progress && model.progress.target > 0 && (
        <Animated.View entering={FadeInDown.delay(140).duration(250)}>
          <View style={styles.progressHeader}>
            <TText style={[styles.progressTitle, { color: theme.colors.text }]}>
              Progress
            </TText>
            <TText
              style={[
                styles.progressCount,
                { color: theme.colors.textSecondary },
              ]}
            >
              {model.progress.current} / {model.progress.target} days
            </TText>
          </View>
          <TSpacer size="sm" />
          <ProgressBar
            progress={model.progress.current / model.progress.target}
            tone={progressTone}
            height={6}
          />
          <TSpacer size="lg" />
        </Animated.View>
      )}

      {/* Recent days mini-view */}
      <Animated.View entering={FadeInDown.delay(200).duration(250)}>
        <TText
          style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
        >
          Recent
        </TText>
        <TSpacer size="sm" />
        <View style={styles.daysRow}>
          {dayStatuses.map((day) => (
            <View key={day.iso} style={styles.dayItem}>
              <TText
                style={[
                  styles.dayLabel,
                  {
                    color: day.isToday
                      ? accentColor
                      : theme.colors.textSecondary,
                    fontWeight: day.isToday ? "700" : "400",
                  },
                ]}
              >
                {day.label}
              </TText>
              <View
                style={[
                  styles.dayDot,
                  day.logged
                    ? { backgroundColor: accentColor }
                    : { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                {day.logged ? (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                ) : (
                  <View
                    style={[
                      styles.emptyDotInner,
                      { borderColor: theme.colors.border },
                    ]}
                  />
                )}
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      <TSpacer size="xl" />

      {/* CTA (only when meaningful) */}
      {onTrack && (
        <Animated.View entering={FadeInDown.delay(260).duration(250)}>
          <Pressable
            onPress={() => {
              onClose();
              onTrack();
            }}
            style={({ pressed }) => [
              styles.ctaButton,
              { backgroundColor: accentColor },
              pressed && { opacity: 0.88, transform: [{ scale: 0.98 }] },
            ]}
          >
            <TText style={styles.ctaText}>
              {model.ctaLabel ?? "Log a meal"}
            </TText>
          </Pressable>
        </Animated.View>
      )}
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  streakNumber: {
    fontSize: 26,
    fontWeight: "800",
  },
  chipInline: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Content
  title: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 21,
  },

  // Progress
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
  progressCount: {
    fontSize: 13,
    fontWeight: "500",
  },

  // Recent days
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayItem: {
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  dayLabel: {
    fontSize: 12,
  },
  dayDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
  },

  // CTA
  ctaButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  ctaText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
