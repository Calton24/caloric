/**
 * NutritionTrendChart
 *
 * Bar chart showing daily calorie intake with a budget goal line.
 * Bars are colored by adherence: on-target = primary, over = error, under = warning.
 * Uses react-native-svg (same dependency as WeightChart).
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
    Defs,
    Line,
    LinearGradient,
    Rect,
    Stop,
    Text as SvgText,
} from "react-native-svg";
import type { NutritionChartPoint } from "../../features/nutrition/nutrition-trends.service";
import { useTheme } from "../../theme/useTheme";

interface NutritionTrendChartProps {
  data: NutritionChartPoint[];
  calorieBudget?: number;
  height?: number;
}

export function NutritionTrendChart({
  data,
  calorieBudget,
  height = 200,
}: NutritionTrendChartProps) {
  const { theme } = useTheme();

  if (data.length === 0) return null;

  const values = data.map((d) => d.calories);
  const maxVal = Math.max(...values, calorieBudget ?? 0, 1);
  // Start from 0 for calorie charts
  const chartHeight = height - 30;
  const barWidth = 20;
  const gap = 20;
  const chartWidth = data.length * (barWidth + gap);

  const getBarHeight = (val: number) => {
    return (val / maxVal) * chartHeight;
  };

  const getY = (val: number) => {
    return chartHeight - (val / maxVal) * chartHeight;
  };

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.primary} stopOpacity="1" />
            <Stop
              offset="1"
              stopColor={theme.colors.primary}
              stopOpacity="0.4"
            />
          </LinearGradient>
          <LinearGradient id="calOverGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.colors.error} stopOpacity="0.9" />
            <Stop offset="1" stopColor={theme.colors.error} stopOpacity="0.3" />
          </LinearGradient>
        </Defs>

        {data.map((d, i) => {
          if (d.calories === 0) {
            // Render label only for zero-calorie days
            const x = i * (barWidth + gap) + gap / 2;
            return (
              <SvgText
                key={`lbl-${i}`}
                x={x + barWidth / 2}
                y={height - 4}
                fontSize={11}
                fill={theme.colors.textMuted}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            );
          }

          const barH = getBarHeight(d.calories);
          const x = i * (barWidth + gap) + gap / 2;
          const y = chartHeight - barH;

          // Over budget → error gradient, on/under → primary gradient
          const over =
            calorieBudget != null && calorieBudget > 0
              ? d.calories > calorieBudget * 1.1
              : false;

          return (
            <React.Fragment key={`bar-${i}`}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={6}
                ry={6}
                fill={over ? "url(#calOverGrad)" : "url(#calGrad)"}
              />
              <SvgText
                x={x + barWidth / 2}
                y={height - 4}
                fontSize={11}
                fill={theme.colors.textMuted}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Budget goal line */}
        {calorieBudget != null && calorieBudget > 0 && (
          <Line
            x1={0}
            y1={getY(calorieBudget)}
            x2={chartWidth}
            y2={getY(calorieBudget)}
            stroke={theme.colors.success}
            strokeWidth={1.5}
            strokeDasharray="6,4"
          />
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    overflow: "hidden",
  },
});
