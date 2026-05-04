/**
 * WeightLineChart
 *
 * Smooth line chart with gradient fill, optional goal line, and a final
 * data-point marker. Designed to fit a fixed parent width — no inner scrolling.
 * Built on react-native-svg (already in deps); no extra libs.
 */

import React, { memo, useMemo } from "react";
import { View } from "react-native";
import Svg, {
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
  Circle,
} from "react-native-svg";
import { useTheme } from "../../theme/useTheme";

export interface LineChartPoint {
  label: string;
  value: number;
}

interface WeightLineChartProps {
  data: LineChartPoint[];
  width: number;
  height?: number;
  goalValue?: number | null;
  /** Display unit for tooltip-style end label (eg. "lbs", "kg"). */
  endValueLabel?: string;
  /** Number of x-axis labels to render (downsampled). */
  xTickTarget?: number;
}

function buildSmoothPath(
  pts: { x: number; y: number }[],
  tension = 0.4
): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 3;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 3;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 3;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 3;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function WeightLineChartImpl({
  data,
  width,
  height = 180,
  goalValue,
  endValueLabel,
  xTickTarget = 5,
}: WeightLineChartProps) {
  const { theme } = useTheme();

  const layout = useMemo(() => {
    const padTop = 16;
    const padBottom = 26;
    const padLeft = 12;
    const padRight = 12;
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
        points: [] as { x: number; y: number; raw: LineChartPoint }[],
        minVal: 0,
        maxVal: 1,
        path: "",
        areaPath: "",
        goalY: null as number | null,
        tickIdxs: [] as number[],
      };
    }

    const values = data.map((d) => d.value);
    let minVal = Math.min(...values);
    let maxVal = Math.max(...values);
    if (goalValue != null) {
      minVal = Math.min(minVal, goalValue);
      maxVal = Math.max(maxVal, goalValue);
    }
    if (maxVal - minVal < 1) {
      // Avoid flat-line collapse — give it visual breathing room.
      const center = (maxVal + minVal) / 2;
      minVal = center - 1;
      maxVal = center + 1;
    } else {
      // Add 8% padding on top/bottom.
      const span = maxVal - minVal;
      minVal -= span * 0.08;
      maxVal += span * 0.08;
    }
    const range = maxVal - minVal || 1;

    const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;
    const points = data.map((d, i) => ({
      x: padLeft + i * stepX,
      y: padTop + (1 - (d.value - minVal) / range) * innerH,
      raw: d,
    }));

    const path = buildSmoothPath(points);
    const areaPath =
      points.length >= 2
        ? `${path} L ${points[points.length - 1].x.toFixed(2)} ${(padTop + innerH).toFixed(2)} L ${points[0].x.toFixed(2)} ${(padTop + innerH).toFixed(2)} Z`
        : "";

    const goalY =
      goalValue != null
        ? padTop + (1 - (goalValue - minVal) / range) * innerH
        : null;

    // Pick evenly-spaced tick indexes.
    const target = Math.min(xTickTarget, data.length);
    const tickIdxs: number[] = [];
    if (target > 1) {
      for (let i = 0; i < target; i++) {
        const idx = Math.round(((data.length - 1) * i) / (target - 1));
        if (!tickIdxs.includes(idx)) tickIdxs.push(idx);
      }
    } else if (data.length > 0) {
      tickIdxs.push(data.length - 1);
    }

    return {
      innerW,
      innerH,
      padTop,
      padBottom,
      padLeft,
      padRight,
      points,
      minVal,
      maxVal,
      path,
      areaPath,
      goalY,
      tickIdxs,
    };
  }, [data, width, height, goalValue, xTickTarget]);

  if (data.length === 0 || width <= 0) {
    return <View style={{ width, height }} />;
  }

  const stroke = theme.colors.primary;
  const last = layout.points[layout.points.length - 1];

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="wlcArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity="0.35" />
            <Stop offset="1" stopColor={stroke} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Goal line */}
        {layout.goalY != null && (
          <>
            <Line
              x1={layout.padLeft}
              y1={layout.goalY}
              x2={width - layout.padRight}
              y2={layout.goalY}
              stroke={theme.colors.success}
              strokeWidth={1.5}
              strokeDasharray="6,5"
            />
            <SvgText
              x={width - layout.padRight}
              y={layout.goalY - 5}
              fontSize={10}
              fill={theme.colors.success}
              textAnchor="end"
            >
              {goalValue != null ? `${goalValue.toFixed(1)}` : ""}
            </SvgText>
          </>
        )}

        {/* Filled area under line */}
        {layout.areaPath ? (
          <Path d={layout.areaPath} fill="url(#wlcArea)" />
        ) : null}

        {/* Line */}
        {layout.path ? (
          <Path
            d={layout.path}
            fill="none"
            stroke={stroke}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* End marker */}
        {last && (
          <>
            <Circle
              cx={last.x}
              cy={last.y}
              r={6}
              fill={theme.colors.surfaceElevated}
              stroke={stroke}
              strokeWidth={2.5}
            />
            <Circle cx={last.x} cy={last.y} r={2.5} fill={stroke} />
            {endValueLabel && (
              <SvgText
                x={Math.min(width - 4, last.x + 8)}
                y={Math.max(12, last.y - 10)}
                fontSize={11}
                fontWeight="600"
                fill={theme.colors.text}
                textAnchor="start"
              >
                {`${last.raw.value.toFixed(1)} ${endValueLabel}`}
              </SvgText>
            )}
          </>
        )}

        {/* X-axis labels */}
        {layout.tickIdxs.map((i) => {
          const p = layout.points[i];
          if (!p) return null;
          return (
            <SvgText
              key={`xt-${i}`}
              x={p.x}
              y={height - 6}
              fontSize={10}
              fill={theme.colors.textMuted}
              textAnchor="middle"
            >
              {p.raw.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

export const WeightLineChart = memo(WeightLineChartImpl);
