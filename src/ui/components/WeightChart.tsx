/**
 * WeightChart
 * Bar chart showing weight data over time with an optional goal line.
 * Uses react-native-svg for rendering.
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
import { useTheme } from "../../theme/useTheme";

interface WeightChartProps {
  data: { label: string; value: number }[];
  goalWeight?: number;
  height?: number;
  barColor?: string;
}

export function WeightChart({
  data,
  goalWeight,
  height = 180,
  barColor,
}: WeightChartProps) {
  const { theme } = useTheme();
  const color = barColor ?? theme.colors.primary;

  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const minVal = Math.min(...values, goalWeight ?? Infinity) - 2;
  const maxVal = Math.max(...values, goalWeight ?? -Infinity) + 2;
  const range = maxVal - minVal || 1;

  const chartWidth = data.length * 40;
  const chartHeight = height - 30; // leave room for labels
  const barWidth = 20;
  const gap = 20;

  const getY = (val: number) => {
    return chartHeight - ((val - minVal) / range) * chartHeight;
  };

  return (
    <View style={styles.container}>
      <Svg width={chartWidth} height={height}>
        <Defs>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.4" />
          </LinearGradient>
        </Defs>

        {/* Bars */}
        {data.map((d, i) => {
          const barH = ((d.value - minVal) / range) * chartHeight;
          const x = i * (barWidth + gap) + gap / 2;
          const y = chartHeight - barH;
          return (
            <React.Fragment key={`bar-${i}`}>
              <Rect
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={6}
                ry={6}
                fill="url(#barGrad)"
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

        {/* Goal line */}
        {goalWeight != null && (
          <Line
            x1={0}
            y1={getY(goalWeight)}
            x2={chartWidth}
            y2={getY(goalWeight)}
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
