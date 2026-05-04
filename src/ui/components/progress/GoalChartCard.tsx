/**
 * GoalChartCard
 *
 * Hosts the WeightLineChart with:
 *   - Title + period sub-label
 *   - % progress badge (top-right)
 *   - Trend metadata (direction + weekly rate)
 *   - Empty state when no logs in range
 */

import React, { memo } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { useAppTranslation } from "../../../infrastructure/i18n/useAppTranslation";
import { TText } from "../../primitives/TText";
import { DashboardCard } from "./DashboardCard";
import { WeightLineChart } from "../WeightLineChart";
import type {
  TrendLabel,
  WeightTrend,
  WeightTrendPoint,
} from "../../../features/progress/dashboard.selectors";

interface GoalChartCardProps {
  trend: WeightTrend;
  goalDisplayValue: number | null;
  unitLabel: string;
  /** Convert raw lbs to display unit. */
  toDisplay: (lbs: number) => number;
  goalProgressPercent: number;
  rangeLabel: string;
  /** Goal-aware trend label ("perfect_pace", "plateau", etc.). */
  trendLabel?: TrendLabel;
  /** Called when the user taps "Adjust plan" (only shown when off-track). */
  onAdjustPlan?: () => void;
  /** Disable Adjust Plan when prerequisites aren't met. */
  canAdjustPlan?: boolean;
}

function dirIcon(direction: WeightTrend["direction"]): keyof typeof Ionicons.glyphMap {
  if (direction === "down") return "trending-down";
  if (direction === "up") return "trending-up";
  if (direction === "flat") return "remove-outline";
  return "stats-chart-outline";
}

function GoalChartCardImpl({
  trend,
  goalDisplayValue,
  unitLabel,
  toDisplay,
  goalProgressPercent,
  rangeLabel,
  trendLabel = "no_data",
  onAdjustPlan,
  canAdjustPlan = true,
}: GoalChartCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [chartWidth, setChartWidth] = React.useState(0);

  const onChartLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (Math.abs(w - chartWidth) > 0.5) setChartWidth(w);
  };

  const chartData = React.useMemo(
    () =>
      trend.points.map((p: WeightTrendPoint) => ({
        label: p.label,
        value: +toDisplay(p.weightLbs).toFixed(1),
      })),
    [trend.points, toDisplay]
  );

  const trendColor =
    trend.direction === "down"
      ? theme.colors.success
      : trend.direction === "up"
        ? theme.colors.warning
        : theme.colors.textMuted;

  const weeklyRateDisplay =
    trend.points.length >= 2
      ? `${Math.abs(toDisplay(trend.weeklyRateLbs)).toFixed(2)}`
      : "0.00";

  // Trend label visual treatment.
  const trendLabelConfig = React.useMemo(() => {
    switch (trendLabel) {
      case "perfect_pace":
        return {
          text: t("progress.weightTrendCard.trend_perfect_pace"),
          color: theme.colors.success,
          isProblem: false,
        };
      case "losing_too_fast":
        return {
          text: t("progress.weightTrendCard.trend_losing_too_fast"),
          color: theme.colors.warning,
          isProblem: true,
        };
      case "gaining_too_fast":
        return {
          text: t("progress.weightTrendCard.trend_gaining_too_fast"),
          color: theme.colors.warning,
          isProblem: true,
        };
      case "plateau":
        return {
          text: t("progress.weightTrendCard.trend_plateau"),
          color: theme.colors.warning,
          isProblem: true,
        };
      case "drifting_up":
        return {
          text: t("progress.weightTrendCard.trend_drifting_up"),
          color: theme.colors.warning,
          isProblem: true,
        };
      case "drifting_down":
        return {
          text: t("progress.weightTrendCard.trend_drifting_down"),
          color: theme.colors.warning,
          isProblem: true,
        };
      case "holding_steady":
        return {
          text: t("progress.weightTrendCard.trend_holding_steady"),
          color: theme.colors.success,
          isProblem: false,
        };
      default:
        return null;
    }
  }, [trendLabel, theme, t]);

  const showAdjustPlan =
    !!onAdjustPlan && trendLabelConfig?.isProblem === true;

  return (
    <DashboardCard variant="default" padding={16} radius={24}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TText
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t("progress.weightTrend")}
          </TText>
          <TText
            style={[styles.subtitle, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {rangeLabel}
          </TText>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.colors.glassSelected },
          ]}
        >
          <TText style={[styles.badgeText, { color: theme.colors.primary }]}>
            {t("progress.progressBadge", { percent: goalProgressPercent })}
          </TText>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaInline}>
          <Ionicons name={dirIcon(trend.direction)} size={14} color={trendColor} />
          <TText style={[styles.metaText, { color: trendColor }]}>
            {t("progress.weeklyRate", {
              rate: weeklyRateDisplay,
              unit: unitLabel,
            })}
          </TText>
        </View>
        {trendLabelConfig ? (
          <View
            style={[
              styles.trendLabelPill,
              { backgroundColor: `${trendLabelConfig.color}1A` },
            ]}
          >
            <TText
              style={[
                styles.trendLabelText,
                { color: trendLabelConfig.color },
              ]}
              numberOfLines={1}
            >
              {trendLabelConfig.text}
            </TText>
          </View>
        ) : null}
      </View>

      <View style={styles.chartWrap} onLayout={onChartLayout}>
        {trend.points.length >= 2 && chartWidth > 0 ? (
          <WeightLineChart
            data={chartData}
            width={chartWidth}
            height={170}
            goalValue={
              goalDisplayValue != null ? +goalDisplayValue.toFixed(1) : null
            }
            endValueLabel={unitLabel}
          />
        ) : trend.points.length === 1 && chartWidth > 0 ? (
          <View style={styles.singlePoint}>
            <TText
              style={[
                styles.singlePointValue,
                { color: theme.colors.text },
              ]}
            >
              {chartData[0].value} {unitLabel}
            </TText>
            <TText
              style={[
                styles.emptySubtitle,
                { color: theme.colors.textMuted },
              ]}
            >
              {t("progress.emptyWeightSubtitle")}
            </TText>
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name="analytics-outline"
              size={28}
              color={theme.colors.textMuted}
            />
            <TText
              style={[styles.emptyTitle, { color: theme.colors.text }]}
            >
              {t("progress.emptyWeightTitle")}
            </TText>
            <TText
              style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}
            >
              {t("progress.emptyWeightSubtitle")}
            </TText>
          </View>
        )}
      </View>

      {showAdjustPlan ? (
        <Pressable
          onPress={onAdjustPlan}
          disabled={!canAdjustPlan}
          style={({ pressed }) => [
            styles.cta,
            {
              borderColor: theme.colors.borderSecondary,
              opacity: !canAdjustPlan ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons
            name="options-outline"
            size={14}
            color={theme.colors.text}
          />
          <TText
            style={[styles.ctaText, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t("progress.weightTrendCard.ctaAdjustPlan")}
          </TText>
        </Pressable>
      ) : null}
    </DashboardCard>
  );
}

export const GoalChartCard = memo(GoalChartCardImpl);

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
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metaInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "600",
  },
  trendLabelPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 0,
  },
  trendLabelText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  cta: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
    paddingHorizontal: 16,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "700",
  },
  chartWrap: {
    marginTop: 8,
    minHeight: 170,
    justifyContent: "center",
  },
  empty: {
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptySubtitle: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  singlePoint: {
    minHeight: 170,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  singlePointValue: {
    fontSize: 24,
    fontWeight: "700",
  },
});
