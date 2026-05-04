/**
 * StreakSummaryCard — risk-aware, time-sensitive streak summary.
 *
 * Answers:
 *   1. WHAT  — current streak, weekly dot strip, longest-ever
 *   2. GOOD/BAD — risk state (Safe / At risk / Critical) drives color +
 *                 today-dot pulse animation
 *   3. NEXT — next milestone copy + "Log now" CTA when at risk
 *
 * Risk state is the visual hierarchy driver; everything else (border tint,
 * pulsing dot, urgency line) follows from it.
 */

import React, { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { useAppTranslation } from "../../../infrastructure/i18n/useAppTranslation";
import { TText } from "../../primitives/TText";
import { DashboardCard } from "./DashboardCard";
import type {
  NextMilestone,
  StreakRisk,
  StreakUrgency,
  StreakWeekDay,
} from "../../../features/progress/dashboard.selectors";

interface StreakSummaryCardProps {
  currentStreak: number;
  longestStreak: number;
  week: StreakWeekDay[];
  /** Risk state — drives visual treatment + CTA visibility. */
  risk: StreakRisk;
  /** Time-of-day urgency — drives the urgency line copy. */
  urgency: StreakUrgency;
  /** Next milestone (personal-best chase or fixed milestone). */
  nextMilestone?: NextMilestone | null;
  onPress?: () => void;
  onPrimaryCta?: () => void;
}

function StreakSummaryCardImpl({
  currentStreak,
  longestStreak,
  week,
  risk,
  urgency,
  nextMilestone = null,
  onPress,
  onPrimaryCta,
}: StreakSummaryCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const isAtRisk = risk === "at_risk" || risk === "critical";

  // Pulse animation for the today dot when at risk — opacity loop only,
  // safe on native driver, no layout impact.
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isAtRisk) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.35,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isAtRisk, pulse]);

  const flameColor = useMemo(() => {
    if (risk === "critical") return theme.colors.error;
    if (risk === "at_risk") return theme.colors.warning;
    if (currentStreak > 0) return theme.colors.error;
    return theme.colors.textMuted;
  }, [risk, currentStreak, theme]);

  const urgencyLabel = useMemo(() => {
    if (urgency === "log_before_midnight") {
      return t("progress.streakCard.urgency_before_midnight");
    }
    if (urgency === "log_tonight") {
      return t("progress.streakCard.urgency_log_tonight");
    }
    if (urgency === "log_today") {
      return t("progress.streakCard.urgency_log_today");
    }
    return null;
  }, [urgency, t]);

  const milestoneLabel = useMemo(() => {
    if (!nextMilestone) return null;
    if (nextMilestone.beatsPersonalBest && longestStreak > 0) {
      return t("progress.streakCard.milestone_to_best", {
        count: nextMilestone.daysAway,
      });
    }
    return t("progress.streakCard.milestone_to_target", {
      count: nextMilestone.daysAway,
      value: nextMilestone.value,
    });
  }, [nextMilestone, longestStreak, t]);

  const showCta = isAtRisk;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pressableWrap,
        pressed && onPress ? { opacity: 0.92 } : null,
      ]}
    >
      <DashboardCard
        variant="default"
        padding={16}
        radius={24}
        style={styles.cardFill}
      >
        <View style={styles.cardColumn}>
          <View>
            <View style={styles.row}>
              <TText
                style={[styles.label, { color: theme.colors.textMuted }]}
                numberOfLines={1}
              >
                {t("progress.streak")}
              </TText>
              <TText style={[styles.flame, { color: flameColor }]}>🔥</TText>
            </View>

            <TText
              variant="heading"
              style={[styles.value, { color: theme.colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {currentStreak}
              <TText style={[styles.unit, { color: theme.colors.textMuted }]}>
                {" "}
                d
              </TText>
            </TText>

            {urgencyLabel ? (
              <View style={styles.urgencyRow}>
                <View
                  style={[
                    styles.urgencyDot,
                    {
                      backgroundColor:
                        risk === "critical"
                          ? theme.colors.error
                          : risk === "at_risk"
                            ? theme.colors.warning
                            : theme.colors.textMuted,
                    },
                  ]}
                />
                <TText
                  style={[
                    styles.urgencyText,
                    {
                      color:
                        risk === "critical"
                          ? theme.colors.error
                          : risk === "at_risk"
                            ? theme.colors.warning
                            : theme.colors.textSecondary,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {urgencyLabel}
                </TText>
              </View>
            ) : null}

            <View style={styles.dotRow}>
              {week.map((d, i) => {
                const filled = d.logged;
                const labelColor = d.isToday
                  ? theme.colors.text
                  : theme.colors.textMuted;
                const dotIsPulsing = d.isToday && isAtRisk && !filled;
                const bg = filled
                  ? theme.colors.primary
                  : dotIsPulsing
                    ? risk === "critical"
                      ? theme.colors.error
                      : theme.colors.warning
                    : "transparent";
                const borderColor = filled
                  ? "transparent"
                  : d.isToday
                    ? theme.colors.primary
                    : theme.colors.borderSecondary;
                const borderWidth = filled ? 0 : d.isToday ? 2 : 1.5;
                return (
                  <View key={`d-${i}`} style={styles.dotCell}>
                    <Animated.View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: bg,
                          borderColor,
                          borderWidth,
                          opacity: dotIsPulsing ? pulse : 1,
                        },
                      ]}
                    />
                    <TText
                      style={[
                        styles.dotLabel,
                        {
                          color: labelColor,
                          fontWeight: d.isToday ? "700" : "500",
                        },
                      ]}
                    >
                      {d.label}
                    </TText>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.cardFlexSpacer} />

          <View style={styles.streakFooter}>
            <TText
              style={[
                styles.meta,
                { color: theme.colors.textSecondary, textAlign: "center" },
              ]}
              numberOfLines={2}
            >
              {milestoneLabel ??
                `${t("progress.thisWeek")} · best ${longestStreak}d`}
            </TText>

            {showCta ? (
              <Pressable
                onPress={onPrimaryCta ?? onPress}
                style={({ pressed }) => [
                  styles.cta,
                  {
                    backgroundColor:
                      risk === "critical"
                        ? theme.colors.error
                        : theme.colors.warning,
                  },
                  pressed ? { opacity: 0.85 } : null,
                ]}
              >
                <Ionicons
                  name="flame"
                  size={14}
                  color={theme.colors.background}
                />
                <TText
                  style={[
                    styles.ctaText,
                    { color: theme.colors.background },
                  ]}
                  numberOfLines={1}
                >
                  {t("progress.streakCard.ctaLogNow")}
                </TText>
              </Pressable>
            ) : null}
          </View>
        </View>
      </DashboardCard>
    </Pressable>
  );
}

export const StreakSummaryCard = memo(StreakSummaryCardImpl);

const styles = StyleSheet.create({
  pressableWrap: {
    flex: 1,
    alignSelf: "stretch",
  },
  cardFill: {
    flex: 1,
  },
  cardColumn: {
    flex: 1,
  },
  cardFlexSpacer: {
    flexGrow: 1,
    flexShrink: 1,
    minHeight: 0,
  },
  streakFooter: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  flame: {
    fontSize: 14,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
  },
  unit: {
    fontSize: 14,
    fontWeight: "600",
  },
  urgencyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  urgencyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  dotRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  dotCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
  dotLabel: {
    fontSize: 10,
  },
  meta: {
    alignSelf: "stretch",
    fontSize: 11,
    fontWeight: "500",
  },
  cta: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
