/**
 * SleepChart
 * Sleep tracking analytics widget showing sleep stages as stacked bars
 * with total duration, quality score, and time range.
 *
 * Usage:
 *   <SleepChart
 *     data={[
 *       { day: "Mon", deep: 1.5, light: 3, rem: 1.5, awake: 0.5 },
 *       { day: "Tue", deep: 2,   light: 3.5, rem: 1, awake: 0.3 },
 *     ]}
 *     averageHours={7.2}
 *     qualityScore={85}
 *   />
 */

import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

export interface SleepDay {
  /** Day label (e.g. "Mon") */
  day: string;
  /** Hours of deep sleep */
  deep: number;
  /** Hours of light sleep */
  light: number;
  /** Hours of REM sleep */
  rem: number;
  /** Hours awake */
  awake: number;
}

export interface SleepChartProps {
  /** Sleep data for each day */
  data: SleepDay[];
  /** Average hours per night */
  averageHours?: number;
  /** Quality score 0–100 */
  qualityScore?: number;
  /** Goal hours */
  goalHours?: number;
  /** Max bar height in px */
  barHeight?: number;
  /** Custom stage colors */
  stageColors?: {
    deep?: string;
    light?: string;
    rem?: string;
    awake?: string;
  };
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_COLORS = {
  deep: "#5856D6",
  light: "#AF52DE",
  rem: "#FF9500",
  awake: "#FF3B30",
};

function SleepBar({
  day,
  deep,
  light,
  rem,
  awake,
  maxHours,
  barHeight,
  colors,
  index,
}: SleepDay & {
  maxHours: number;
  barHeight: number;
  colors: typeof DEFAULT_COLORS;
  index: number;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      index * 80,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) })
    );
    // One-time mount animation; scale is a stable ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const barAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));

  const segments = [
    { key: "deep", hours: deep, color: colors.deep },
    { key: "light", hours: light, color: colors.light },
    { key: "rem", hours: rem, color: colors.rem },
    { key: "awake", hours: awake, color: colors.awake },
  ];

  return (
    <View style={styles.barCol}>
      <Animated.View
        style={[styles.barStack, { height: barHeight }, barAnimStyle]}
      >
        {segments.map((seg) => {
          const h = (seg.hours / maxHours) * barHeight;
          if (h <= 0) return null;
          return (
            <View
              key={seg.key}
              style={{
                width: "100%",
                height: h,
                backgroundColor: seg.color,
                borderRadius: 3,
                marginVertical: 0.5,
              }}
            />
          );
        })}
      </Animated.View>
      <TText style={[styles.barLabel, { color: theme.colors.textMuted }]}>
        {day}
      </TText>
    </View>
  );
}

export function SleepChart({
  data,
  averageHours,
  qualityScore,
  goalHours = 8,
  barHeight = 100,
  stageColors,
  style,
}: SleepChartProps) {
  const { theme } = useTheme();
  const colors = { ...DEFAULT_COLORS, ...stageColors };
  const maxHours = Math.max(
    goalHours,
    ...data.map((d) => d.deep + d.light + d.rem + d.awake)
  );

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
        <View>
          <TText color="secondary" style={styles.title}>
            Sleep
          </TText>
          {averageHours !== undefined && (
            <TText style={[styles.bigValue, { color: theme.colors.text }]}>
              {averageHours.toFixed(1)}
              <TText style={[styles.unit, { color: theme.colors.textMuted }]}>
                {" "}
                hrs avg
              </TText>
            </TText>
          )}
        </View>
        {qualityScore !== undefined && (
          <View
            style={[
              styles.qualityBadge,
              {
                backgroundColor:
                  qualityScore >= 80
                    ? theme.colors.success + "18"
                    : qualityScore >= 50
                      ? theme.colors.warning + "18"
                      : theme.colors.error + "18",
              },
            ]}
          >
            <TText
              style={[
                styles.qualityText,
                {
                  color:
                    qualityScore >= 80
                      ? theme.colors.success
                      : qualityScore >= 50
                        ? theme.colors.warning
                        : theme.colors.error,
                },
              ]}
            >
              {qualityScore}%
            </TText>
            <TText
              style={[styles.qualityLabel, { color: theme.colors.textMuted }]}
            >
              quality
            </TText>
          </View>
        )}
      </View>

      {/* Bars */}
      <View style={styles.barsRow}>
        {data.map((d, i) => (
          <SleepBar
            key={d.day}
            {...d}
            maxHours={maxHours}
            barHeight={barHeight}
            colors={colors}
            index={i}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        {[
          { label: "Deep", color: colors.deep },
          { label: "Light", color: colors.light },
          { label: "REM", color: colors.rem },
          { label: "Awake", color: colors.awake },
        ].map((item) => (
          <View key={item.label} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: item.color }]} />
            <TText
              style={[styles.legendText, { color: theme.colors.textMuted }]}
            >
              {item.label}
            </TText>
          </View>
        ))}
      </View>
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
    marginBottom: 16,
  },
  title: {
    fontSize: 14,
    marginBottom: 2,
  },
  bigValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  unit: {
    fontSize: 14,
    fontWeight: "400",
  },
  qualityBadge: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  qualityText: {
    fontSize: 20,
    fontWeight: "700",
  },
  qualityLabel: {
    fontSize: 10,
    fontWeight: "500",
  },
  barsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 6,
    marginBottom: 12,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  barStack: {
    width: "100%",
    justifyContent: "flex-end",
    transformOrigin: "bottom",
  },
  barLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  legendRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 11,
  },
});
