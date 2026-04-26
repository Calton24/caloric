/**
 * PerformanceSheet
 *
 * Bottom-sheet coaching + performance layer.
 *
 * Hierarchy (intentional):
 *   1. Identity header: "Day 5, getting consistent"
 *   2. Coaching insight: the one thing that matters right now
 *   3. Primary metric: visually dominant, context-driven
 *   4. Last 7 days: 5-state strip (complete / partial / missed / today active / today empty)
 *   5. Milestone progress
 *   6. CTA: state-aware, natural language
 */

import { Ionicons } from "@expo/vector-icons";
import i18next from "i18next";
import React, { useMemo } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import type { CoachingState } from "../../features/milestone/daily-coaching";
import type {
    MilestoneInsightAccent,
    MilestoneInsightModel,
} from "../../features/milestone/milestone-insight.types";
import { getMealsForDate } from "../../features/nutrition/nutrition.selectors";
import { useNutritionStore } from "../../features/nutrition/nutrition.store";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { toISODate } from "../../lib/utils/date";
import { useTheme } from "../../theme/useTheme";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";
import { ProgressBar } from "./ProgressBar";

// ── Types ────────────────────────────────────────────────────

interface PerformanceSheetProps {
  model: MilestoneInsightModel;
  longestStreak: number;
  caloriesRemaining?: number;
  proteinRemaining?: number;
  onClose: () => void;
  onTrack?: () => void;
}

// ── Accent mapping ───────────────────────────────────────────

function useAccentColor(accent: MilestoneInsightAccent) {
  const { theme } = useTheme();
  switch (accent) {
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

// ── 7-day helpers ────────────────────────────────────────────

function getDayLetter(date: Date): string {
  return ["S", "M", "T", "W", "T", "F", "S"][date.getDay()];
}

function getRecentDays(count: number) {
  const today = new Date();
  const result: {
    iso: string;
    label: string;
    isToday: boolean;
    isPast: boolean;
  }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    result.push({
      iso: toISODate(d),
      label: i === 0 ? i18next.t("coaching.now") : getDayLetter(d),
      isToday: i === 0,
      isPast: i > 0,
    });
  }
  return result;
}

type DayVisual =
  | "complete"
  | "partial"
  | "missed"
  | "today_active"
  | "today_empty";

function classifyDay(
  mealCount: number,
  isToday: boolean,
  isPast: boolean
): DayVisual {
  if (isToday) return mealCount > 0 ? "today_active" : "today_empty";
  if (!isPast) return "today_empty";
  if (mealCount >= 3) return "complete";
  if (mealCount > 0) return "partial";
  return "missed";
}

// ── State-aware CTA ──────────────────────────────────────────

function getStateCTA(model: MilestoneInsightModel): string {
  if (model.ctaLabel) return model.ctaLabel;
  const primary = model.coachingInsight?.states[0] as CoachingState | undefined;
  switch (primary) {
    case "late_critical":
      return i18next.t("coaching.cta.logNow");
    case "evening_drift":
      return i18next.t("coaching.cta.secureToday");
    case "recovery_start":
      return i18next.t("coaching.cta.startFresh");
    case "tight_budget":
      return i18next.t("coaching.cta.completeToday");
    case "protein_priority":
      return i18next.t("coaching.cta.logProtein");
    case "strong_position":
      return i18next.t("coaching.cta.finishStrong");
    case "day_secured":
      return i18next.t("coaching.cta.improveToday");
    case "high_quality_day":
      return i18next.t("coaching.cta.keepGoing");
    case "milestone_pressure":
      return i18next.t("coaching.cta.staySharp");
    case "momentum_building":
      return i18next.t("coaching.cta.keepItGoing");
    default: {
      const h = new Date().getHours();
      if (h < 12) return i18next.t("coaching.cta.startYourDay");
      if (h < 18) return i18next.t("coaching.cta.continue");
      return i18next.t("coaching.cta.secureToday");
    }
  }
}

// ── Primary metric resolver ──────────────────────────────────

interface PrimaryMetric {
  value: string;
  unit: string;
  label: string;
  isAccented: boolean;
}

interface SecondaryMetric {
  value: string;
  label: string;
}

function resolveTodayMetrics(
  states: string[],
  calRemaining: number | undefined,
  proRemaining: number | undefined,
  dayQualityLabel: string | undefined
): { primary: PrimaryMetric | null; secondary: SecondaryMetric[] } {
  const cal = calRemaining != null ? Math.abs(Math.round(calRemaining)) : null;
  const pro = proRemaining != null ? Math.abs(Math.round(proRemaining)) : null;
  const calOver = (calRemaining ?? 0) < 0;
  const proOver = (proRemaining ?? 0) < 0;
  const primaryState = states[0] as CoachingState | undefined;
  const secondary: SecondaryMetric[] = [];

  const t = i18next.t.bind(i18next);

  // Protein is the coaching focus → protein dominates
  if (
    primaryState === "protein_priority" ||
    (states.includes("protein_priority") && primaryState !== "tight_budget")
  ) {
    if (cal != null)
      secondary.push({
        value: `${cal}`,
        label: calOver
          ? t("coaching.metric.calOver")
          : t("coaching.metric.calLeft"),
      });
    if (dayQualityLabel)
      secondary.push({
        value: dayQualityLabel,
        label: t("coaching.metric.status"),
      });
    return {
      primary:
        pro != null
          ? {
              value: `${pro}`,
              unit: "g",
              label: proOver
                ? t("coaching.metric.proteinOver")
                : t("coaching.metric.proteinToGo"),
              isAccented: true,
            }
          : null,
      secondary,
    };
  }

  // Tight budget → calories dominate
  if (primaryState === "tight_budget") {
    if (pro != null)
      secondary.push({
        value: `${pro}g`,
        label: proOver
          ? t("coaching.metric.proteinOver")
          : t("coaching.metric.proteinLeft"),
      });
    if (dayQualityLabel)
      secondary.push({
        value: dayQualityLabel,
        label: t("coaching.metric.status"),
      });
    return {
      primary:
        cal != null
          ? {
              value: `${cal}`,
              unit: "cal",
              label: calOver
                ? t("coaching.metric.overBudget")
                : t("coaching.metric.remaining"),
              isAccented: true,
            }
          : null,
      secondary,
    };
  }

  // Default → calories primary, protein + quality secondary
  if (cal != null) {
    if (pro != null)
      secondary.push({
        value: `${pro}g`,
        label: proOver
          ? t("coaching.metric.proteinOver")
          : t("coaching.metric.proteinLeft"),
      });
    if (dayQualityLabel)
      secondary.push({
        value: dayQualityLabel,
        label: t("coaching.metric.status"),
      });
    return {
      primary: {
        value: `${cal}`,
        unit: "cal",
        label: calOver
          ? t("coaching.metric.overBudget")
          : t("coaching.metric.remaining"),
        isAccented: false,
      },
      secondary,
    };
  }

  return { primary: null, secondary: [] };
}

// ── Tier label i18n mapping ──────────────────────────────────

const TIER_LABEL_KEYS: Record<string, string> = {
  "Starting out": "coaching.tier.startingOut",
  "Getting consistent": "coaching.tier.gettingConsistent",
  "Building momentum": "coaching.tier.buildingMomentum",
  "Locked in": "coaching.tier.lockedIn",
  Disciplined: "coaching.tier.disciplined",
  Relentless: "coaching.tier.relentless",
  Elite: "coaching.tier.elite",
};

// ── Component ────────────────────────────────────────────────

export function PerformanceSheet({
  model,
  longestStreak,
  caloriesRemaining,
  proteinRemaining,
  onClose,
  onTrack,
}: PerformanceSheetProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const accentColor = useAccentColor(model.accent);
  const meals = useNutritionStore((s) => s.meals);
  const recentDays = useMemo(() => getRecentDays(7), []);

  const dayStatuses = useMemo(
    () =>
      recentDays.map((day) => {
        const dayMeals = getMealsForDate(meals, day.iso);
        return {
          ...day,
          mealCount: dayMeals.length,
          visual: classifyDay(dayMeals.length, day.isToday, day.isPast),
        };
      }),
    [recentDays, meals]
  );

  const coachingStates = model.coachingInsight?.states ?? [];

  const dayQualityLabel = model.dayScore
    ? model.dayScore.quality === "perfect"
      ? t("coaching.dayQuality.perfect")
      : model.dayScore.quality === "optimized"
        ? t("coaching.dayQuality.optimized")
        : model.dayScore.quality === "secured"
          ? t("coaching.dayQuality.secured")
          : undefined
    : undefined;

  const { primary: primaryMetric, secondary: secondaryMetrics } = useMemo(
    () =>
      resolveTodayMetrics(
        coachingStates,
        caloriesRemaining,
        proteinRemaining,
        dayQualityLabel
      ),
    [coachingStates, caloriesRemaining, proteinRemaining, dayQualityLabel]
  );

  return (
    <View style={styles.root}>
      {/* ── 1. Identity header ── */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
        <View style={styles.headerLeft}>
          <TText style={[styles.headerDay, { color: theme.colors.text }]}>
            {t("coaching.dayIdentity", {
              count: model.streakCount,
              tier: t(
                TIER_LABEL_KEYS[model.tier.label] ?? model.tier.label
              ).toLowerCase(),
            })}
          </TText>
          {model.progress &&
            model.progress.target > 0 &&
            model.progress.target - model.progress.current <= 3 && (
              <TText
                style={[
                  styles.headerContext,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("coaching.milestoneContext", {
                  count: model.progress.target - model.progress.current,
                  target: model.progress.target,
                })}
              </TText>
            )}
        </View>
        <View
          style={[styles.iconCircle, { backgroundColor: accentColor + "14" }]}
        >
          <Ionicons name="flame" size={20} color={accentColor} />
        </View>
      </Animated.View>

      <TSpacer size="md" />

      {/* ── 2. Coaching insight ── */}
      {model.coachingInsight && (
        <Animated.View entering={FadeInDown.delay(50).duration(280)}>
          <View
            style={[
              styles.coachingBlock,
              { backgroundColor: accentColor + "0A" },
            ]}
          >
            <View style={styles.coachingHeader}>
              <Ionicons name="bulb-outline" size={14} color={accentColor} />
              <TText style={[styles.coachingLabel, { color: accentColor }]}>
                {model.coachingInsight.label}
              </TText>
            </View>
            <TSpacer size="xs" />
            <TText style={[styles.coachingText, { color: theme.colors.text }]}>
              {model.coachingInsight.text}
            </TText>
          </View>
        </Animated.View>
      )}

      <TSpacer size="md" />

      {/* ── 3. Primary today metric ── */}
      {primaryMetric != null && (
        <Animated.View entering={FadeInDown.delay(100).duration(280)}>
          <View style={styles.metricSection}>
            <View style={styles.primaryMetric}>
              <View style={styles.primaryValueRow}>
                <TText
                  style={[
                    styles.primaryValue,
                    {
                      color: primaryMetric.isAccented
                        ? accentColor
                        : theme.colors.text,
                    },
                  ]}
                >
                  {primaryMetric.value}
                </TText>
                <TText
                  style={[
                    styles.primaryUnit,
                    {
                      color: primaryMetric.isAccented
                        ? accentColor
                        : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {primaryMetric.unit}
                </TText>
              </View>
              <TText
                style={[
                  styles.primaryLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {primaryMetric.label}
              </TText>
            </View>
            {secondaryMetrics.length > 0 && (
              <View style={styles.secondaryRow}>
                {secondaryMetrics.map((m, i) => (
                  <View key={i} style={styles.secondaryStat}>
                    <TText
                      style={[
                        styles.secondaryValue,
                        { color: theme.colors.text },
                      ]}
                    >
                      {m.value}
                    </TText>
                    <TText
                      style={[
                        styles.secondaryLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {m.label}
                    </TText>
                  </View>
                ))}
              </View>
            )}
          </View>
          <TSpacer size="md" />
        </Animated.View>
      )}

      {/* ── 4. Last 7 days ── */}
      <Animated.View entering={FadeInDown.delay(150).duration(280)}>
        <View style={styles.sectionHeaderRow}>
          <TText
            style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
          >
            {t("coaching.thisWeek")}
          </TText>
          <Pressable
            onPress={() =>
              Alert.alert(
                t("coaching.thisWeek"),
                "✓  Logged 3+ meals\n◉  Logged 1–2 meals\n○  No meals logged"
              )
            }
            hitSlop={12}
            accessibilityLabel="Day status help"
            accessibilityRole="button"
          >
            <Ionicons
              name="help-circle-outline"
              size={16}
              color={theme.colors.textSecondary}
            />
          </Pressable>
        </View>
        <TSpacer size="sm" />
        <View style={styles.daysRow}>
          {dayStatuses.map((day) => {
            const dot = getDotStyle(day.visual, accentColor, theme);
            return (
              <View key={day.iso} style={styles.dayItem}>
                <TText
                  style={[
                    styles.dayLabel,
                    {
                      color: day.isToday
                        ? theme.colors.text
                        : theme.colors.textSecondary,
                      fontWeight: day.isToday ? "700" : "400",
                    },
                  ]}
                >
                  {day.label}
                </TText>
                <View style={[styles.dayDot, dot.container]}>{dot.icon}</View>
              </View>
            );
          })}
        </View>
      </Animated.View>

      <TSpacer size="md" />

      {/* ── 5. Milestone progress ── */}
      {model.progress && model.progress.target > 0 && (
        <Animated.View entering={FadeInDown.delay(200).duration(280)}>
          <View style={styles.progressHeader}>
            <TText style={[styles.progressTitle, { color: theme.colors.text }]}>
              {t("coaching.progressTarget", { target: model.progress.target })}
            </TText>
            <TText
              style={[
                styles.progressCount,
                { color: theme.colors.textSecondary },
              ]}
            >
              {model.progress.current} / {model.progress.target}
            </TText>
          </View>
          <TSpacer size="xs" />
          <ProgressBar
            progress={model.progress.current / model.progress.target}
            tone={model.accent === "warning" ? "warning" : "primary"}
            height={5}
          />
          <TSpacer size="md" />
        </Animated.View>
      )}

      {/* ── 6. CTA ── */}
      {onTrack && (
        <Animated.View entering={FadeInUp.delay(250).duration(250)}>
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
            <TText style={styles.ctaText}>{getStateCTA(model)}</TText>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// ── Day dot visual states ────────────────────────────────────

function getDotStyle(
  visual: DayVisual,
  accentColor: string,
  theme: any
): { container: any; icon: React.ReactNode } {
  switch (visual) {
    case "complete":
      return {
        container: { backgroundColor: accentColor },
        icon: <Ionicons name="checkmark" size={12} color="#FFFFFF" />,
      };
    case "partial":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: accentColor,
        },
        icon: (
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: accentColor,
            }}
          />
        ),
      };
    case "missed":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: theme.colors.textSecondary,
          opacity: 0.5,
        },
        icon: null,
      };
    case "today_active":
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 2.5,
          borderColor: accentColor,
        },
        icon: (
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: accentColor,
            }}
          />
        ),
      };
    case "today_empty":
    default:
      return {
        container: {
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: accentColor + "40",
          borderStyle: "dashed" as const,
        },
        icon: null,
      };
  }
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
    justifyContent: "space-between",
  },
  headerLeft: { flex: 1 },
  headerDay: {
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerContext: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // Coaching
  coachingBlock: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  coachingHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  coachingLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coachingText: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22,
  },

  // Primary metric — visually dominant
  metricSection: { alignItems: "center" },
  primaryMetric: { alignItems: "center" },
  primaryValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
  },
  primaryValue: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  primaryUnit: {
    fontSize: 16,
    fontWeight: "600",
  },
  primaryLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 1,
  },
  secondaryRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 12,
  },
  secondaryStat: {
    alignItems: "center",
    gap: 1,
  },
  secondaryValue: {
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryLabel: {
    fontSize: 11,
    fontWeight: "500",
  },

  // Section label
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Days strip
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayItem: {
    alignItems: "center",
    gap: 5,
    flex: 1,
  },
  dayLabel: { fontSize: 11 },
  dayDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  // Progress
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  progressCount: {
    fontSize: 12,
    fontWeight: "500",
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
