/**
 * MacroTrendsCard — calorie & macro adherence with actionable feedback.
 *
 * Answers:
 *   1. WHAT  — average kcal/day vs target, stacked bar trend, macro averages
 *   2. GOOD/BAD — macro balance feedback pill (Protein too low, Fat high, ...)
 *                 + best/worst day callouts inside the range
 *   3. NEXT — "Improve today" CTA → routes to today's meals / macro coach
 *
 * Pill copy is computed by `getMacroBalanceFeedback`; callouts by
 * `getBestWorstDay`. Both pure, both memoised at the screen layer.
 */

import React, { memo } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { useAppTranslation } from "../../../infrastructure/i18n/useAppTranslation";
import { TText } from "../../primitives/TText";
import { DashboardCard } from "./DashboardCard";
import { StackedMacroChart } from "../StackedMacroChart";
import type {
  BestWorstDay,
  DailyStackPoint,
  MacroBalanceFeedback,
  MacroBreakdown,
} from "../../../features/progress/dashboard.selectors";

interface MacroTrendsCardProps {
  data: DailyStackPoint[];
  calorieBudget: number | null;
  avgCalories: number;
  avgMacros: MacroBreakdown;
  daysOnTargetPercent: number;
  rangeLabel: string;
  /** Macro balance feedback computed at the screen layer. */
  balance?: MacroBalanceFeedback;
  /** Best & worst day callouts within the range. */
  bestDay?: BestWorstDay | null;
  worstDay?: BestWorstDay | null;
  onImproveToday?: () => void;
}

function MacroTrendsCardImpl({
  data,
  calorieBudget,
  avgCalories,
  avgMacros,
  daysOnTargetPercent,
  rangeLabel,
  balance,
  bestDay = null,
  worstDay = null,
  onImproveToday,
}: MacroTrendsCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [w, setW] = React.useState(0);

  const hasData = data.some((d) => d.calories > 0);

  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (Math.abs(next - w) > 0.5) setW(next);
  };

  const adherenceColor =
    daysOnTargetPercent >= 70
      ? theme.colors.success
      : daysOnTargetPercent >= 40
        ? theme.colors.warning
        : theme.colors.error;

  // Headline avg-vs-target subtitle.
  const avgVsTarget = React.useMemo(() => {
    if (!hasData) return null;
    if (calorieBudget && calorieBudget > 0) {
      return t("progress.macroCard.kcal_vs_target", {
        avg: avgCalories,
        target: calorieBudget,
      });
    }
    return t("progress.macroCard.kcal_vs_target_no_target", {
      avg: avgCalories,
    });
  }, [hasData, avgCalories, calorieBudget, t]);

  // Balance pill copy + tone.
  const balancePill = React.useMemo(() => {
    if (!balance || balance.primary === "no_data") return null;

    const isProblem =
      balance.primary !== "balanced";

    let key = `progress.macroCard.balance_${balance.primary}`;
    // Compose secondary if both protein-low and a high macro coexist.
    if (balance.primary === "protein_low" && balance.secondary === "fat_high") {
      key = "progress.macroCard.balance_protein_low_with_fat";
    } else if (
      balance.primary === "protein_low" &&
      balance.secondary === "carbs_high"
    ) {
      key = "progress.macroCard.balance_protein_low_with_carbs";
    }

    const color = !isProblem
      ? theme.colors.success
      : balance.primary === "protein_low"
        ? theme.colors.error
        : theme.colors.warning;

    return { text: t(key), color, isProblem };
  }, [balance, theme, t]);

  // Best / worst day callouts (only show if we have at least 3 logged days,
  // otherwise the "best vs worst" comparison is noise).
  const showCallouts = React.useMemo(() => {
    return data.filter((d) => d.calories > 0).length >= 3;
  }, [data]);

  const showImproveCta = !!onImproveToday && hasData;

  return (
    <DashboardCard variant="default" padding={16} radius={24}>
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TText
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t("progress.macros")}
          </TText>
          <TText
            style={[styles.subtitle, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {avgVsTarget ?? rangeLabel}
          </TText>
        </View>
        {balancePill ? (
          <View
            style={[
              styles.balancePill,
              { backgroundColor: `${balancePill.color}1A` },
            ]}
          >
            <TText
              style={[styles.balancePillText, { color: balancePill.color }]}
              numberOfLines={1}
            >
              {balancePill.text}
            </TText>
          </View>
        ) : null}
      </View>

      <View style={styles.chartWrap} onLayout={onLayout}>
        {hasData && w > 0 ? (
          <StackedMacroChart
            data={data}
            width={w}
            height={180}
            calorieBudget={calorieBudget ?? null}
          />
        ) : (
          <View style={styles.empty}>
            <Ionicons
              name="restaurant-outline"
              size={26}
              color={theme.colors.textMuted}
            />
            <TText style={[styles.emptyTitle, { color: theme.colors.text }]}>
              {t("progress.emptyMealsTitle")}
            </TText>
            <TText
              style={[styles.emptySubtitle, { color: theme.colors.textMuted }]}
              numberOfLines={2}
            >
              {t("progress.emptyMealsSubtitle")}
            </TText>
          </View>
        )}
      </View>

      <View
        style={[styles.kpiRow, { borderColor: theme.colors.borderSecondary }]}
      >
        <View style={styles.kpiItem}>
          <TText style={[styles.kpiValue, { color: theme.colors.text }]}>
            {avgCalories}
          </TText>
          <TText style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
            {t("progress.avgKcalDay")}
          </TText>
        </View>
        <View
          style={[
            styles.kpiDivider,
            { backgroundColor: theme.colors.borderSecondary },
          ]}
        />
        <View style={styles.kpiItem}>
          <TText style={[styles.kpiValue, { color: theme.colors.text }]}>
            {avgMacros.protein}g
          </TText>
          <TText style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
            {t("progress.avgProtein")}
          </TText>
        </View>
        <View
          style={[
            styles.kpiDivider,
            { backgroundColor: theme.colors.borderSecondary },
          ]}
        />
        <View style={styles.kpiItem}>
          <TText style={[styles.kpiValue, { color: adherenceColor }]}>
            {daysOnTargetPercent}%
          </TText>
          <TText style={[styles.kpiLabel, { color: theme.colors.textMuted }]}>
            {t("progress.daysOnTarget")}
          </TText>
        </View>
      </View>

      {showCallouts && (bestDay || worstDay) ? (
        <View style={styles.calloutRow}>
          {bestDay ? (
            <View style={styles.callout}>
              <Ionicons
                name="star"
                size={12}
                color={theme.colors.success}
              />
              <View style={styles.calloutBody}>
                <TText
                  style={[
                    styles.calloutLabel,
                    { color: theme.colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {t("progress.macroCard.best_day")} · {bestDay.label}
                </TText>
                <TText
                  style={[
                    styles.calloutValue,
                    { color: theme.colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {t("progress.macroCard.calories_kcal", {
                    calories: bestDay.calories,
                  })}
                </TText>
              </View>
            </View>
          ) : null}
          {worstDay && (!bestDay || worstDay.date !== bestDay.date) ? (
            <View style={styles.callout}>
              <Ionicons
                name="alert-circle"
                size={12}
                color={theme.colors.warning}
              />
              <View style={styles.calloutBody}>
                <TText
                  style={[
                    styles.calloutLabel,
                    { color: theme.colors.textMuted },
                  ]}
                  numberOfLines={1}
                >
                  {t("progress.macroCard.worst_day")} · {worstDay.label}
                </TText>
                <TText
                  style={[
                    styles.calloutValue,
                    { color: theme.colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {t("progress.macroCard.calories_kcal", {
                    calories: worstDay.calories,
                  })}
                </TText>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.macroLegend}>
        <View style={styles.macroItem}>
          <View
            style={[styles.macroDot, { backgroundColor: theme.colors.primary }]}
          />
          <TText
            style={[styles.macroText, { color: theme.colors.textSecondary }]}
          >
            {t("progress.proteinShort")} {avgMacros.protein}g
          </TText>
        </View>
        <View style={styles.macroItem}>
          <View
            style={[styles.macroDot, { backgroundColor: theme.colors.warning }]}
          />
          <TText
            style={[styles.macroText, { color: theme.colors.textSecondary }]}
          >
            {t("progress.carbsShort")} {avgMacros.carbs}g
          </TText>
        </View>
        <View style={styles.macroItem}>
          <View
            style={[styles.macroDot, { backgroundColor: theme.colors.error }]}
          />
          <TText
            style={[styles.macroText, { color: theme.colors.textSecondary }]}
          >
            {t("progress.fatShort")} {avgMacros.fat}g
          </TText>
        </View>
      </View>

      {showImproveCta ? (
        <Pressable
          onPress={onImproveToday}
          style={({ pressed }) => [
            styles.cta,
            {
              borderColor: theme.colors.borderSecondary,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Ionicons
            name="sparkles-outline"
            size={14}
            color={theme.colors.text}
          />
          <TText
            style={[styles.ctaText, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t("progress.macroCard.ctaImprove")}
          </TText>
        </Pressable>
      ) : null}
    </DashboardCard>
  );
}

export const MacroTrendsCard = memo(MacroTrendsCardImpl);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  balancePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    flexShrink: 0,
  },
  balancePillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  chartWrap: {
    marginTop: 12,
    minHeight: 180,
    justifyContent: "center",
  },
  empty: {
    minHeight: 180,
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
  kpiRow: {
    marginTop: 14,
    paddingTop: 12,
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  kpiItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  kpiDivider: {
    width: 1,
    height: 28,
  },
  calloutRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 12,
  },
  callout: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  calloutBody: {
    flex: 1,
  },
  calloutLabel: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  calloutValue: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 1,
  },
  macroLegend: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-around",
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroText: {
    fontSize: 12,
    fontWeight: "500",
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
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
