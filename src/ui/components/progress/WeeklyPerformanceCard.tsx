/**
 * WeeklyPerformanceCard — the "report card" for the last 7 days.
 *
 * Composite 0–100 score driven by:
 *   • 50% calorie adherence  (% logged days within ±10% of budget)
 *   • 30% protein adherence  (% logged days hitting ≥80% of target)
 *   • 20% logging consistency (logged days / 7)
 *
 * Answers:
 *   1. WHAT  — composite score + qualitative label
 *   2. GOOD/BAD — color tone + per-pillar bars
 *   3. NEXT — "Improve score" CTA — surfaces the weakest pillar via insights
 *
 * Empty state: shows guidance copy instead of a fake 0% bar — never a
 * misleading "you scored 0" headline for a brand-new account.
 */

import React, { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { useAppTranslation } from "../../../infrastructure/i18n/useAppTranslation";
import { TText } from "../../primitives/TText";
import { DashboardCard } from "./DashboardCard";
import type { WeeklyPerformance } from "../../../features/progress/dashboard.selectors";

interface WeeklyPerformanceCardProps {
  performance: WeeklyPerformance;
  onImprove?: () => void;
}

function WeeklyPerformanceCardImpl({
  performance,
  onImprove,
}: WeeklyPerformanceCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const noData = performance.label === "no_data";

  const scoreColor = useMemo(() => {
    if (noData) return theme.colors.textMuted;
    if (performance.label === "excellent") return theme.colors.success;
    if (performance.label === "good") return theme.colors.success;
    if (performance.label === "fair") return theme.colors.warning;
    return theme.colors.error;
  }, [performance.label, noData, theme]);

  const labelText = useMemo(() => {
    if (noData) return t("progress.weeklyScore.label_no_data");
    if (performance.label === "excellent") {
      return t("progress.weeklyScore.label_excellent");
    }
    if (performance.label === "good") {
      return t("progress.weeklyScore.label_good");
    }
    if (performance.label === "fair") {
      return t("progress.weeklyScore.label_fair");
    }
    return t("progress.weeklyScore.label_needs_work");
  }, [performance.label, noData, t]);

  // Animated reveal for each breakdown bar.
  const calBar = useRef(new Animated.Value(0)).current;
  const proBar = useRef(new Animated.Value(0)).current;
  const conBar = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(calBar, {
        toValue: performance.breakdown.calories,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(proBar, {
        toValue: performance.breakdown.protein,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(conBar, {
        toValue: performance.breakdown.consistency,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();
  }, [
    performance.breakdown.calories,
    performance.breakdown.protein,
    performance.breakdown.consistency,
    calBar,
    proBar,
    conBar,
  ]);

  const barColorFor = (pct: number) => {
    if (pct >= 80) return theme.colors.success;
    if (pct >= 50) return theme.colors.warning;
    return theme.colors.error;
  };

  const showCta = !!onImprove && !noData;

  return (
    <DashboardCard variant="default" padding={16} radius={24}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TText
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t("progress.weeklyScore.title")}
          </TText>
          <TText
            style={[styles.label, { color: scoreColor }]}
            numberOfLines={1}
          >
            {labelText}
          </TText>
        </View>
        <View style={styles.scoreBlock}>
          <TText
            variant="heading"
            style={[styles.scoreValue, { color: scoreColor }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {noData ? "—" : performance.score}
            {!noData ? (
              <TText style={[styles.scoreUnit, { color: theme.colors.textMuted }]}>
                /100
              </TText>
            ) : null}
          </TText>
        </View>
      </View>

      {!noData ? (
        <View style={styles.breakdown}>
          <BreakdownRow
            label={t("progress.weeklyScore.breakdownCalories")}
            value={performance.breakdown.calories}
            anim={calBar}
            track={theme.colors.borderSecondary}
            color={barColorFor(performance.breakdown.calories)}
            valueColor={theme.colors.text}
            labelColor={theme.colors.textMuted}
          />
          <BreakdownRow
            label={t("progress.weeklyScore.breakdownProtein")}
            value={performance.breakdown.protein}
            anim={proBar}
            track={theme.colors.borderSecondary}
            color={barColorFor(performance.breakdown.protein)}
            valueColor={theme.colors.text}
            labelColor={theme.colors.textMuted}
          />
          <BreakdownRow
            label={t("progress.weeklyScore.breakdownConsistency")}
            value={performance.breakdown.consistency}
            anim={conBar}
            track={theme.colors.borderSecondary}
            color={barColorFor(performance.breakdown.consistency)}
            valueColor={theme.colors.text}
            labelColor={theme.colors.textMuted}
          />
        </View>
      ) : null}

      {showCta ? (
        <Pressable
          onPress={onImprove}
          style={({ pressed }) => [
            styles.cta,
            {
              borderColor: theme.colors.borderSecondary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons
            name="rocket-outline"
            size={14}
            color={theme.colors.text}
          />
          <TText
            style={[styles.ctaText, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t("progress.weeklyScore.ctaImprove")}
          </TText>
        </Pressable>
      ) : null}
    </DashboardCard>
  );
}

export const WeeklyPerformanceCard = memo(WeeklyPerformanceCardImpl);

interface BreakdownRowProps {
  label: string;
  value: number;
  anim: Animated.Value;
  track: string;
  color: string;
  valueColor: string;
  labelColor: string;
}

function BreakdownRow({
  label,
  value,
  anim,
  track,
  color,
  valueColor,
  labelColor,
}: BreakdownRowProps) {
  return (
    <View style={styles.breakdownRow}>
      <View style={styles.breakdownLabelRow}>
        <TText
          style={[styles.breakdownLabel, { color: labelColor }]}
          numberOfLines={1}
        >
          {label}
        </TText>
        <TText
          style={[styles.breakdownValue, { color: valueColor }]}
          numberOfLines={1}
        >
          {value}%
        </TText>
      </View>
      <View
        style={[
          styles.breakdownTrack,
          { backgroundColor: track },
        ]}
      >
        <Animated.View
          style={[
            styles.breakdownFill,
            {
              backgroundColor: color,
              width: anim.interpolate({
                inputRange: [0, 100],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  label: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  scoreBlock: {
    alignItems: "flex-end",
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: "800",
  },
  scoreUnit: {
    fontSize: 12,
    fontWeight: "600",
  },
  breakdown: {
    marginTop: 14,
    gap: 10,
  },
  breakdownRow: {
    gap: 4,
  },
  breakdownLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  breakdownLabel: {
    fontSize: 12,
    fontWeight: "500",
    flexShrink: 1,
  },
  breakdownValue: {
    fontSize: 12,
    fontWeight: "700",
  },
  breakdownTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  breakdownFill: {
    height: "100%",
    borderRadius: 3,
  },
  cta: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
