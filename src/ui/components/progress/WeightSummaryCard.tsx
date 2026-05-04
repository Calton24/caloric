/**
 * WeightSummaryCard — dynamic, action-driven weight summary.
 *
 * Answers the three questions a card must answer:
 *
 *   1. WHAT is happening    — current weight, period delta, trend arrow
 *   2. IS it good or bad    — confidence pill (On track / Too fast / Stalling)
 *   3. WHAT to do next      — CTA (Log weight; stronger style when stale)
 *
 * Visual hierarchy: label → value (with trend arrow) → confidence pill +
 * period delta (same row) → animated progress bar → goal line → CTA.
 */

import React, { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { useAppTranslation } from "../../../infrastructure/i18n/useAppTranslation";
import { TText } from "../../primitives/TText";
import { DashboardCard } from "./DashboardCard";
import type {
  WeightConfidence,
  WeightTrendDirection,
} from "../../../features/progress/dashboard.selectors";

interface WeightSummaryCardProps {
  currentDisplay: string;
  goalDisplay: string;
  unitLabel: string;
  /** 0..100 */
  progressPercent: number;
  /** Days since last weight log. null = never logged. */
  daysSinceLastLog: number | null;
  /** Trend direction in the selected range. null = insufficient data. */
  trendDirection?: WeightTrendDirection | null;
  /** Period delta in lbs (already rounded). null = insufficient data. */
  periodDeltaLbs?: number | null;
  /** Display delta in user's preferred unit (already converted + rounded). */
  periodDeltaDisplay?: string | null;
  /** Confidence signal. */
  confidence?: WeightConfidence;
  /** True if the user has never logged a weight. */
  hasWeightHistory?: boolean;
  onPress?: () => void;
  onPrimaryCta?: () => void;
}

function WeightSummaryCardImpl({
  currentDisplay,
  goalDisplay,
  unitLabel,
  progressPercent,
  daysSinceLastLog,
  trendDirection = null,
  periodDeltaLbs = null,
  periodDeltaDisplay = null,
  confidence = "no_data",
  hasWeightHistory = true,
  onPress,
  onPrimaryCta,
}: WeightSummaryCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const pct = Math.max(0, Math.min(100, progressPercent));

  // Animated progress bar — driven on mount + every pct change.
  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: pct,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [pct, progressAnim]);

  const trendArrow = useMemo(() => {
    if (trendDirection == null) return null;
    if (trendDirection === "up") return t("progress.trendUp");
    if (trendDirection === "down") return t("progress.trendDown");
    return t("progress.trendFlat");
  }, [trendDirection, t]);

  const trendArrowColor = useMemo(() => {
    if (trendDirection === "up") return theme.colors.warning;
    if (trendDirection === "down") return theme.colors.success;
    return theme.colors.textMuted;
  }, [trendDirection, theme]);

  const confidencePill = useMemo(() => {
    if (confidence === "no_data") return null;
    if (confidence === "on_track") {
      return {
        label: t("progress.weightCard.confidence_on_track"),
        bg: `${theme.colors.success}1A`,
        fg: theme.colors.success,
      };
    }
    if (confidence === "too_fast") {
      return {
        label: t("progress.weightCard.confidence_too_fast"),
        bg: `${theme.colors.warning}1A`,
        fg: theme.colors.warning,
      };
    }
    if (confidence === "stalling") {
      return {
        label: t("progress.weightCard.confidence_stalling"),
        bg: `${theme.colors.textMuted}1F`,
        fg: theme.colors.textSecondary,
      };
    }
    // off_pace
    return {
      label: t("progress.weightCard.confidence_off_pace"),
      bg: `${theme.colors.error}1A`,
      fg: theme.colors.error,
    };
  }, [confidence, theme, t]);

  const deltaLabel = useMemo(() => {
    if (periodDeltaLbs == null || periodDeltaDisplay == null) return null;
    if (Math.abs(periodDeltaLbs) < 0.1) {
      return {
        text: t("progress.weightCard.delta_flat"),
        color: theme.colors.textMuted,
      };
    }
    if (periodDeltaLbs < 0) {
      return {
        text: t("progress.weightCard.delta_loss", {
          value: periodDeltaDisplay.replace(/^-/, ""),
          unit: unitLabel,
        }),
        color: theme.colors.success,
      };
    }
    return {
      text: t("progress.weightCard.delta_gain", {
        value: periodDeltaDisplay.replace(/^\+?/, ""),
        unit: unitLabel,
      }),
      color: theme.colors.warning,
    };
  }, [periodDeltaLbs, periodDeltaDisplay, unitLabel, theme, t]);

  // CTA always opens log-weight; style is primary when log is stale.
  const ctaConfig = useMemo(() => {
    const isStale =
      daysSinceLastLog == null ||
      daysSinceLastLog >= 5 ||
      !hasWeightHistory;
    return {
      label: t("progress.weightCard.ctaLog"),
      primary: isStale,
      icon: "scale-outline" as const,
    };
  }, [daysSinceLastLog, hasWeightHistory, t]);

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
              <Ionicons
                name="scale-outline"
                size={16}
                color={theme.colors.textMuted}
              />
              <TText
                style={[styles.label, { color: theme.colors.textMuted }]}
                numberOfLines={1}
              >
                {t("progress.weight")}
              </TText>
            </View>

            <View style={styles.valueRow}>
              <TText
                variant="heading"
                style={[styles.value, { color: theme.colors.text }]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {currentDisplay}
                <TText style={[styles.unit, { color: theme.colors.textMuted }]}>
                  {" "}
                  {unitLabel}
                </TText>
              </TText>
              {trendArrow ? (
                <TText
                  style={[styles.trendArrow, { color: trendArrowColor }]}
                  numberOfLines={1}
                >
                  {trendArrow}
                </TText>
              ) : null}
            </View>

            {confidencePill || deltaLabel ? (
              <View
                style={[
                  styles.pillDeltaRow,
                  !confidencePill && styles.pillDeltaRowDeltaOnly,
                ]}
              >
                {confidencePill ? (
                  <View
                    style={[
                      styles.pill,
                      { backgroundColor: confidencePill.bg },
                    ]}
                  >
                    <TText
                      style={[styles.pillText, { color: confidencePill.fg }]}
                      numberOfLines={1}
                    >
                      {confidencePill.label}
                    </TText>
                  </View>
                ) : null}
                {deltaLabel ? (
                  <TText
                    style={[
                      styles.inlineDelta,
                      confidencePill ? styles.inlineDeltaBesidePill : null,
                      { color: deltaLabel.color },
                    ]}
                    numberOfLines={2}
                  >
                    {deltaLabel.text}
                  </TText>
                ) : null}
              </View>
            ) : null}

            <View
              style={[
                styles.progressTrack,
                { backgroundColor: theme.colors.borderSecondary },
              ]}
            >
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progressAnim.interpolate({
                      inputRange: [0, 100],
                      outputRange: ["0%", "100%"],
                    }),
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
            </View>

            <View style={styles.metaBlock}>
              <TText
                style={[
                  styles.metaGoal,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("progress.goal_label")}: {goalDisplay} {unitLabel}
              </TText>
            </View>
          </View>

          <View style={styles.cardFlexSpacer} />

          <Pressable
            onPress={onPrimaryCta ?? onPress}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: ctaConfig.primary
                  ? theme.colors.primary
                  : "transparent",
                borderColor: ctaConfig.primary
                  ? "transparent"
                  : theme.colors.borderSecondary,
                borderWidth: ctaConfig.primary ? 0 : 1,
              },
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Ionicons
              name={ctaConfig.icon}
              size={14}
              color={
                ctaConfig.primary
                  ? theme.colors.background
                  : theme.colors.text
              }
            />
            <TText
              style={[
                styles.ctaText,
                {
                  color: ctaConfig.primary
                    ? theme.colors.background
                    : theme.colors.text,
                },
              ]}
              numberOfLines={1}
            >
              {ctaConfig.label}
            </TText>
          </Pressable>
        </View>
      </DashboardCard>
    </Pressable>
  );
}

export const WeightSummaryCard = memo(WeightSummaryCardImpl);

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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 8,
  },
  value: {
    fontSize: 28,
    fontWeight: "700",
    flexShrink: 1,
  },
  unit: {
    fontSize: 14,
    fontWeight: "600",
  },
  trendArrow: {
    fontSize: 16,
    fontWeight: "700",
  },
  pillDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 10,
  },
  pillDeltaRowDeltaOnly: {
    justifyContent: "flex-end",
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 0,
  },
  inlineDelta: {
    fontSize: 11,
    fontWeight: "700",
  },
  inlineDeltaBesidePill: {
    flex: 1,
    minWidth: 0,
    textAlign: "right",
  },
  pillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  metaBlock: {
    marginTop: 8,
  },
  metaGoal: {
    fontSize: 12,
    fontWeight: "500",
  },
  cta: {
    marginTop: 12,
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
