/**
 * HeartRateCard
 * Health analytics widget showing current BPM, sparkline chart,
 * min/max/avg stats, and optional zone indicator.
 *
 * Usage:
 *   <HeartRateCard
 *     currentBpm={72}
 *     data={[68, 70, 72, 71, 73, 75, 72, 70, 68, 72]}
 *     min={58}
 *     max={142}
 *     avg={72}
 *   />
 */

import React, { useEffect, useMemo } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

type HeartZone = "rest" | "fatBurn" | "cardio" | "peak";

export interface HeartRateCardProps {
  /** Current heart rate */
  currentBpm: number;
  /** Sparkline data points */
  data: number[];
  /** Minimum BPM */
  min?: number;
  /** Maximum BPM */
  max?: number;
  /** Average BPM */
  avg?: number;
  /** Resting heart rate */
  restingBpm?: number;
  /** Zone label override */
  zone?: HeartZone;
  /** Chart height */
  chartHeight?: number;
  /** Line color override */
  lineColor?: string;
  /** Show animated heart icon */
  showHeartbeat?: boolean;
  style?: StyleProp<ViewStyle>;
}

function getZone(bpm: number): HeartZone {
  if (bpm < 100) return "rest";
  if (bpm < 140) return "fatBurn";
  if (bpm < 170) return "cardio";
  return "peak";
}

const ZONE_CONFIG: Record<HeartZone, { label: string; color: string }> = {
  rest: { label: "Resting", color: "#5AC8FA" },
  fatBurn: { label: "Fat Burn", color: "#4CD964" },
  cardio: { label: "Cardio", color: "#FF9500" },
  peak: { label: "Peak", color: "#FF3B30" },
};

export function HeartRateCard({
  currentBpm,
  data,
  min,
  max,
  avg,
  restingBpm,
  zone: zoneProp,
  chartHeight = 80,
  lineColor,
  showHeartbeat = true,
  style,
}: HeartRateCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const zone = zoneProp ?? getZone(currentBpm);
  const zoneInfo = ZONE_CONFIG[zone];
  const strokeColor = lineColor ?? "#FF3B30";

  // Heartbeat animation
  const heartScale = useSharedValue(1);
  useEffect(() => {
    if (showHeartbeat) {
      // Pulse roughly at the BPM rate (capped for performance)
      const interval = Math.max(60000 / currentBpm, 400);
      heartScale.value = withRepeat(
        withSequence(
          withTiming(1.15, {
            duration: interval * 0.15,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(1, {
            duration: interval * 0.35,
            easing: Easing.in(Easing.cubic),
          }),
          withTiming(1.08, {
            duration: interval * 0.12,
            easing: Easing.out(Easing.cubic),
          }),
          withTiming(1, {
            duration: interval * 0.38,
            easing: Easing.in(Easing.cubic),
          })
        ),
        -1,
        false
      );
    }
    // heartScale is a stable useSharedValue ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBpm, showHeartbeat]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
  }));

  // Sparkline SVG
  const chartWidth = 280;
  const padding = { top: 4, bottom: 4 };
  const plotH = chartHeight - padding.top - padding.bottom;

  const { linePath, areaPath } = useMemo(() => {
    if (data.length < 2) return { linePath: "", areaPath: "" };

    const minV = Math.min(...data);
    const maxV = Math.max(...data);
    const range = maxV - minV || 1;

    const toX = (i: number) => (i / (data.length - 1)) * chartWidth;
    const toY = (v: number) =>
      padding.top + plotH - ((v - minV) / range) * plotH;

    let line = `M ${toX(0)} ${toY(data[0])}`;
    // Smooth curve through points
    for (let i = 1; i < data.length; i++) {
      const prev = { x: toX(i - 1), y: toY(data[i - 1]) };
      const curr = { x: toX(i), y: toY(data[i]) };
      const cpx = (prev.x + curr.x) / 2;
      line += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    const area =
      line + ` L ${toX(data.length - 1)} ${chartHeight} L 0 ${chartHeight} Z`;

    return { linePath: line, areaPath: area };
    // padding/plotH are constant; toX/toY are defined inside memo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, chartWidth, chartHeight]);

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
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <TText color="secondary" style={styles.title}>
            {t("analytics.heartRate")}
          </TText>
          <View style={styles.bpmRow}>
            {showHeartbeat && (
              <Animated.Text style={[styles.heartIcon, heartStyle]}>
                ❤️
              </Animated.Text>
            )}
            <TText style={[styles.bpmValue, { color: theme.colors.text }]}>
              {currentBpm}
            </TText>
            <TText style={[styles.bpmUnit, { color: theme.colors.textMuted }]}>
              {t("analytics.bpm")}
            </TText>
          </View>
        </View>
        <View
          style={[styles.zoneBadge, { backgroundColor: zoneInfo.color + "18" }]}
        >
          <View style={[styles.zoneDot, { backgroundColor: zoneInfo.color }]} />
          <TText style={[styles.zoneText, { color: zoneInfo.color }]}>
            {zoneInfo.label}
          </TText>
        </View>
      </View>

      {/* Sparkline */}
      {data.length >= 2 && (
        <Svg
          width="100%"
          height={chartHeight}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          style={styles.chart}
        >
          <Defs>
            <LinearGradient id="hrGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
              <Stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>
          <Path d={areaPath} fill="url(#hrGrad)" />
          <Path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={2}
            strokeLinecap="round"
          />
        </Svg>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        {restingBpm !== undefined && (
          <StatPill
            label={t("analytics.resting")}
            value={`${restingBpm}`}
            color={theme.colors.info}
            mutedColor={theme.colors.textMuted}
          />
        )}
        {min !== undefined && (
          <StatPill
            label={t("analytics.min")}
            value={`${min}`}
            color={theme.colors.success}
            mutedColor={theme.colors.textMuted}
          />
        )}
        {avg !== undefined && (
          <StatPill
            label={t("analytics.avg")}
            value={`${avg}`}
            color={theme.colors.warning}
            mutedColor={theme.colors.textMuted}
          />
        )}
        {max !== undefined && (
          <StatPill
            label={t("analytics.max")}
            value={`${max}`}
            color={theme.colors.error}
            mutedColor={theme.colors.textMuted}
          />
        )}
      </View>
    </View>
  );
}

function StatPill({
  label,
  value,
  color,
  mutedColor,
}: {
  label: string;
  value: string;
  color: string;
  mutedColor: string;
}) {
  return (
    <View style={[styles.statPill, { backgroundColor: color + "12" }]}>
      <TText style={[styles.statPillValue, { color }]}>{value}</TText>
      <TText style={[styles.statPillLabel, { color: mutedColor }]}>
        {label}
      </TText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    marginBottom: 4,
  },
  bpmRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heartIcon: {
    fontSize: 20,
  },
  bpmValue: {
    fontSize: 32,
    fontWeight: "700",
  },
  bpmUnit: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: 8,
  },
  zoneBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  zoneText: {
    fontSize: 13,
    fontWeight: "600",
  },
  chart: {
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 10,
  },
  statPillValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  statPillLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
});
