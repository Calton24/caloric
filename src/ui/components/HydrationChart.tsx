/**
 * HydrationChart — Weekly hydration bar chart with pill design
 *
 * Pill-styled rounded bars showing daily water intake across the week.
 * Inspired by the Health sleep chart but restyled for hydration tracking.
 */

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

export interface HydrationDay {
  /** Day label (e.g. "M") */
  day: string;
  /** Litres consumed */
  amount: number;
}

interface HydrationChartProps {
  data: HydrationDay[];
  /** Daily goal in same unit */
  goal: number;
  /** Unit label */
  unit?: string;
  /** Max bar height in px */
  barHeight?: number;
}

const WATER_COLOR = "#5AC8FA";
const WATER_LIGHT = "#B0E2FF";

function HydrationBar({
  day,
  amount,
  goal,
  maxAmount,
  barHeight,
  index,
}: {
  day: string;
  amount: number;
  goal: number;
  maxAmount: number;
  barHeight: number;
  index: number;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(0);
  const fillRatio = maxAmount > 0 ? amount / maxAmount : 0;
  const metGoal = amount >= goal;

  useEffect(() => {
    scale.value = withDelay(
      index * 60,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const barAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  const pillHeight = Math.max(fillRatio * barHeight, 6);

  return (
    <View style={barStyles.col}>
      <Animated.View
        style={[barStyles.barWrap, { height: barHeight }, barAnimStyle]}
      >
        {/* Goal line marker */}
        <View
          style={[
            barStyles.goalLine,
            {
              bottom: (goal / maxAmount) * barHeight,
              backgroundColor: theme.colors.textMuted,
            },
          ]}
        />
        {/* Pill bar */}
        <View
          style={[
            barStyles.pill,
            {
              height: pillHeight,
              backgroundColor: metGoal ? WATER_COLOR : WATER_LIGHT,
            },
          ]}
        />
      </Animated.View>
      <TText style={[barStyles.label, { color: theme.colors.textMuted }]}>
        {day}
      </TText>
    </View>
  );
}

export function HydrationChart({
  data,
  goal,
  unit = "L",
  barHeight = 100,
}: HydrationChartProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const maxAmount = Math.max(goal * 1.2, ...data.map((d) => d.amount));
  const totalWeek = data.reduce((sum, d) => sum + d.amount, 0);
  const daysLogged = data.filter((d) => d.amount > 0).length;
  const avgDaily = daysLogged > 0 ? totalWeek / daysLogged : 0;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: `${theme.colors.surfaceElevated}40`,
          borderRadius: 20,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <TText style={[styles.title, { color: theme.colors.textMuted }]}>
            {t("analytics.hydrationStats")}
          </TText>
          <TText style={[styles.avg, { color: theme.colors.text }]}>
            {avgDaily.toFixed(1)}
            <TText style={[styles.avgUnit, { color: theme.colors.textMuted }]}>
              {" "}
              {unit} {t("analytics.avgLabel")}
            </TText>
          </TText>
        </View>
        <View style={[styles.badge, { backgroundColor: `${WATER_COLOR}20` }]}>
          <TText style={[styles.badgeText, { color: WATER_COLOR }]}>
            {t("analytics.thisWeek")}
          </TText>
        </View>
      </View>

      {/* Bars */}
      <View style={styles.barsRow}>
        {data.map((d, i) => (
          <HydrationBar
            key={d.day}
            day={d.day}
            amount={d.amount}
            goal={goal}
            maxAmount={maxAmount}
            barHeight={barHeight}
            index={i}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: WATER_COLOR }]} />
          <TText style={[styles.legendText, { color: theme.colors.textMuted }]}>
            {t("analytics.metGoal")}
          </TText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: WATER_LIGHT }]} />
          <TText style={[styles.legendText, { color: theme.colors.textMuted }]}>
            {t("analytics.belowGoal")}
          </TText>
        </View>
      </View>
    </View>
  );
}

const barStyles = StyleSheet.create({
  col: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  barWrap: {
    width: "100%",
    justifyContent: "flex-end",
    alignItems: "center",
    transformOrigin: "bottom",
    position: "relative",
  },
  pill: {
    width: "60%",
    borderRadius: 999,
    minHeight: 6,
  },
  goalLine: {
    position: "absolute",
    left: "10%",
    right: "10%",
    height: 1,
    opacity: 0.3,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
  },
});

const styles = StyleSheet.create({
  card: {
    padding: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 2,
  },
  avg: {
    fontSize: 24,
    fontWeight: "700",
  },
  avgUnit: {
    fontSize: 13,
    fontWeight: "400",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  barsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 4,
    marginBottom: 12,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
    fontWeight: "500",
  },
});
