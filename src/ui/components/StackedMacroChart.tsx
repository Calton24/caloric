/**
 * StackedMacroChart
 *
 * Daily stacked bar chart of protein / carbs / fat (in kcal contribution).
 * Auto-fits parent width, downsamples x-axis labels, supports optional
 * calorie budget overlay line.
 *
 * Bar segments use protein-first ordering (bottom → top: protein, carbs, fat)
 * which matches Cal-AI-style mental model: protein is the "foundation".
 */

import React, { memo, useMemo } from "react";
import { View } from "react-native";
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Rect,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { useTheme } from "../../theme/useTheme";
import type { DailyStackPoint } from "../../features/progress/dashboard.selectors";

interface StackedMacroChartProps {
  data: DailyStackPoint[];
  width: number;
  height?: number;
  calorieBudget?: number | null;
  xTickTarget?: number;
}

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 };

function StackedMacroChartImpl({
  data,
  width,
  height = 200,
  calorieBudget,
  xTickTarget = 6,
}: StackedMacroChartProps) {
  const { theme } = useTheme();

  const layout = useMemo(() => {
    const padTop = 14;
    const padBottom = 24;
    const padLeft = 8;
    const padRight = 8;
    const innerW = Math.max(width - padLeft - padRight, 1);
    const innerH = Math.max(height - padTop - padBottom, 1);

    if (data.length === 0) {
      return {
        innerW,
        innerH,
        padTop,
        padBottom,
        padLeft,
        padRight,
        bars: [] as Array<{
          x: number;
          barW: number;
          segments: { y: number; h: number; color: string; key: string }[];
          label: string;
          showLabel: boolean;
        }>,
        budgetY: null as number | null,
        maxVal: 0,
      };
    }

    const totals = data.map(
      (d) =>
        d.protein * KCAL_PER_G.protein +
        d.carbs * KCAL_PER_G.carbs +
        d.fat * KCAL_PER_G.fat
    );
    let maxVal = Math.max(...totals, calorieBudget ?? 0, 1);
    maxVal = maxVal * 1.05;

    const slot = innerW / data.length;
    const barW = Math.max(Math.min(slot * 0.7, 18), 4);

    const target = Math.min(xTickTarget, data.length);
    const tickIdxs = new Set<number>();
    if (target > 1) {
      for (let i = 0; i < target; i++) {
        tickIdxs.add(Math.round(((data.length - 1) * i) / (target - 1)));
      }
    } else if (data.length > 0) {
      tickIdxs.add(data.length - 1);
    }

    const bars = data.map((d, i) => {
      const proteinKcal = d.protein * KCAL_PER_G.protein;
      const carbsKcal = d.carbs * KCAL_PER_G.carbs;
      const fatKcal = d.fat * KCAL_PER_G.fat;
      const total = proteinKcal + carbsKcal + fatKcal;
      const baseY = padTop + innerH;
      const x = padLeft + i * slot + (slot - barW) / 2;

      const segments: {
        y: number;
        h: number;
        color: string;
        key: string;
      }[] = [];
      if (total > 0) {
        const proteinH = (proteinKcal / maxVal) * innerH;
        const carbsH = (carbsKcal / maxVal) * innerH;
        const fatH = (fatKcal / maxVal) * innerH;
        let cursorY = baseY;
        if (proteinH > 0) {
          cursorY -= proteinH;
          segments.push({
            y: cursorY,
            h: proteinH,
            color: theme.colors.primary,
            key: "p",
          });
        }
        if (carbsH > 0) {
          cursorY -= carbsH;
          segments.push({
            y: cursorY,
            h: carbsH,
            color: theme.colors.warning,
            key: "c",
          });
        }
        if (fatH > 0) {
          cursorY -= fatH;
          segments.push({
            y: cursorY,
            h: fatH,
            color: theme.colors.error,
            key: "f",
          });
        }
      }

      return {
        x,
        barW,
        segments,
        label: d.label,
        showLabel: tickIdxs.has(i),
      };
    });

    const budgetY =
      calorieBudget != null && calorieBudget > 0
        ? padTop + (1 - calorieBudget / maxVal) * innerH
        : null;

    return {
      innerW,
      innerH,
      padTop,
      padBottom,
      padLeft,
      padRight,
      bars,
      budgetY,
      maxVal,
    };
  }, [data, width, height, calorieBudget, xTickTarget, theme]);

  if (data.length === 0 || width <= 0) {
    return <View style={{ width, height }} />;
  }

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="smcRound" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#fff" stopOpacity="0.06" />
            <Stop offset="1" stopColor="#fff" stopOpacity="0" />
          </LinearGradient>
        </Defs>

        {/* Calorie budget line */}
        {layout.budgetY != null && (
          <Line
            x1={layout.padLeft}
            y1={layout.budgetY}
            x2={width - layout.padRight}
            y2={layout.budgetY}
            stroke={theme.colors.success}
            strokeWidth={1.5}
            strokeDasharray="6,5"
            opacity={0.7}
          />
        )}

        {/* Bars */}
        {layout.bars.map((b, i) => (
          <React.Fragment key={`b-${i}`}>
            {b.segments.map((s, sIdx) => {
              const isBottom = sIdx === 0;
              const isTop = sIdx === b.segments.length - 1;
              return (
                <Rect
                  key={`s-${i}-${s.key}`}
                  x={b.x}
                  y={s.y}
                  width={b.barW}
                  height={Math.max(s.h, 0.5)}
                  rx={isTop || isBottom ? 4 : 0}
                  ry={isTop || isBottom ? 4 : 0}
                  fill={s.color}
                  opacity={0.92}
                />
              );
            })}
            {b.showLabel && (
              <SvgText
                x={b.x + b.barW / 2}
                y={height - 6}
                fontSize={10}
                fill={theme.colors.textMuted}
                textAnchor="middle"
              >
                {b.label}
              </SvgText>
            )}
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

export const StackedMacroChart = memo(StackedMacroChartImpl);
