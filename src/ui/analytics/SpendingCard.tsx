/**
 * SpendingCard
 * Finance analytics widget showing cumulative spend with area chart,
 * projected forecast (dashed line), and summary metrics.
 *
 * Usage:
 *   <SpendingCard
 *     title="Spent this month"
 *     amount={157}
 *     currency="£"
 *     data={[0, 0, 0, 0, 0, 120, 120, 120, 120, 157, 157, 157, ...]}
 *     projectedData={[157, 157, 160, 165, 170]}
 *     change={157}
 *     periodLabels={["1", "6", "11", "16", "21", "28"]}
 *   />
 */

import React, { useMemo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Svg, {
    Defs,
    LinearGradient,
    Path,
    Stop,
    Text as SvgText
} from "react-native-svg";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

export interface SpendingCardProps {
  /** Card title */
  title?: string;
  /** Total amount */
  amount: number;
  /** Currency symbol */
  currency?: string;
  /** Data points for actual spending (one per day/period) */
  data: number[];
  /** Projected data points (continuation from last data point) */
  projectedData?: number[];
  /** Change amount (shows with ▲/▼ indicator) */
  change?: number;
  /** Whether change is positive=bad (spending) or positive=good (income) */
  changePositiveIsBad?: boolean;
  /** X-axis labels */
  periodLabels?: string[];
  /** Chart height */
  chartHeight?: number;
  /** Line color override */
  lineColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function SpendingCard({
  title = "Spent this month",
  amount,
  currency = "$",
  data,
  projectedData = [],
  change,
  changePositiveIsBad = true,
  periodLabels = [],
  chartHeight = 140,
  lineColor,
  style,
}: SpendingCardProps) {
  const { theme } = useTheme();
  const strokeColor = lineColor ?? theme.colors.error;

  const chartWidth = 300; // SVG viewBox width
  const svgHeight = chartHeight + 32; // Extra space for labels
  const padding = { top: 8, bottom: 28, left: 0, right: 0 };
  const plotH = chartHeight - padding.top - padding.bottom;
  const plotW = chartWidth - padding.left - padding.right;

  const allData = useMemo(
    () => [...data, ...projectedData],
    [data, projectedData]
  );
  const maxVal = useMemo(() => Math.max(...allData, 1), [allData]);

  const toX = (i: number) =>
    padding.left + (i / Math.max(allData.length - 1, 1)) * plotW;
  const toY = (v: number) => padding.top + plotH - (v / maxVal) * plotH;

  // Build actual data path
  const actualPath = useMemo(() => {
    if (data.length === 0) return "";
    let d = `M ${toX(0)} ${toY(data[0])}`;
    for (let i = 1; i < data.length; i++) {
      d += ` L ${toX(i)} ${toY(data[i])}`;
    }
    return d;
  }, [data, maxVal, plotW, plotH]);

  // Build area fill path (actual data)
  const areaPath = useMemo(() => {
    if (data.length === 0) return "";
    const baseline = padding.top + plotH;
    let d = `M ${toX(0)} ${baseline}`;
    for (let i = 0; i < data.length; i++) {
      d += ` L ${toX(i)} ${toY(data[i])}`;
    }
    d += ` L ${toX(data.length - 1)} ${baseline} Z`;
    return d;
  }, [data, maxVal, plotW, plotH]);

  // Build projected path (dashed)
  const projectedPath = useMemo(() => {
    if (projectedData.length === 0 || data.length === 0) return "";
    const startIdx = data.length - 1;
    let d = `M ${toX(startIdx)} ${toY(data[data.length - 1])}`;
    for (let i = 0; i < projectedData.length; i++) {
      d += ` L ${toX(startIdx + 1 + i)} ${toY(projectedData[i])}`;
    }
    return d;
  }, [data, projectedData, maxVal, plotW, plotH]);

  // Projected area fill
  const projectedAreaPath = useMemo(() => {
    if (projectedData.length === 0 || data.length === 0) return "";
    const startIdx = data.length - 1;
    const baseline = padding.top + plotH;
    let d = `M ${toX(startIdx)} ${baseline}`;
    d += ` L ${toX(startIdx)} ${toY(data[data.length - 1])}`;
    for (let i = 0; i < projectedData.length; i++) {
      d += ` L ${toX(startIdx + 1 + i)} ${toY(projectedData[i])}`;
    }
    d += ` L ${toX(startIdx + projectedData.length)} ${baseline} Z`;
    return d;
  }, [data, projectedData, maxVal, plotW, plotH]);

  // Period label positions
  const labelY = chartHeight + 4;

  const changeIsNeg = change !== undefined && change < 0;
  const changeColor = changePositiveIsBad
    ? change && change > 0
      ? theme.colors.error
      : theme.colors.success
    : change && change > 0
      ? theme.colors.success
      : theme.colors.error;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.xl,
          borderColor: theme.colors.borderSecondary,
        },
        style,
      ]}
    >
      {/* Header */}
      <TText color="secondary" style={styles.title}>
        {title}
      </TText>
      <View style={styles.headerRow}>
        <TText style={[styles.amount, { color: theme.colors.text }]}>
          {currency}
          {amount.toLocaleString()}
        </TText>
        {change !== undefined && (
          <View
            style={[
              styles.changeBadge,
              { backgroundColor: changeColor + "18" },
            ]}
          >
            <TText style={[styles.changeText, { color: changeColor }]}>
              {changeIsNeg ? "▼" : "▲"} {currency}
              {Math.abs(change).toLocaleString()}
            </TText>
          </View>
        )}
      </View>

      {/* Chart */}
      <Svg
        width="100%"
        height={svgHeight}
        viewBox={`0 0 ${chartWidth} ${svgHeight}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
          </LinearGradient>
          <LinearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop
              offset="0%"
              stopColor={theme.colors.textMuted}
              stopOpacity={0.2}
            />
            <Stop
              offset="100%"
              stopColor={theme.colors.textMuted}
              stopOpacity={0.02}
            />
          </LinearGradient>
        </Defs>

        {/* Area fills */}
        {areaPath ? <Path d={areaPath} fill="url(#areaGrad)" /> : null}
        {projectedAreaPath ? (
          <Path d={projectedAreaPath} fill="url(#projGrad)" />
        ) : null}

        {/* Actual line */}
        {actualPath ? (
          <Path
            d={actualPath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Projected dashed line */}
        {projectedPath ? (
          <Path
            d={projectedPath}
            fill="none"
            stroke={theme.colors.textMuted}
            strokeWidth={2}
            strokeDasharray="6,4"
            strokeLinecap="round"
          />
        ) : null}

        {/* Endpoint value label */}
        {projectedData.length > 0 && (
          <SvgText
            x={toX(data.length + projectedData.length - 1)}
            y={toY(projectedData[projectedData.length - 1]) - 8}
            textAnchor="end"
            fontSize={11}
            fill={theme.colors.textMuted}
          >
            {currency}
            {projectedData[projectedData.length - 1].toLocaleString()}
          </SvgText>
        )}

        {/* X-axis labels */}
        {periodLabels.map((label, i) => {
          const x =
            (i / Math.max(periodLabels.length - 1, 1)) * plotW + padding.left;
          return (
            <SvgText
              key={i}
              x={x}
              y={labelY + 16}
              textAnchor="middle"
              fontSize={11}
              fill={theme.colors.textMuted}
            >
              {label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  title: {
    fontSize: 14,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  amount: {
    fontSize: 32,
    fontWeight: "700",
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  changeText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
