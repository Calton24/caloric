/**
 * ActivityRings
 * Apple Watch–inspired concentric fitness rings showing progress
 * toward Move, Exercise, and Stand goals (or custom rings).
 *
 * Usage:
 *   <ActivityRings
 *     rings={[
 *       { label: "Move",     current: 420, goal: 500, color: "#FF3B30" },
 *       { label: "Exercise", current: 28,  goal: 30,  color: "#4CD964" },
 *       { label: "Stand",    current: 10,  goal: 12,  color: "#5AC8FA" },
 *     ]}
 *   />
 */

import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingData {
  /** Label for the ring */
  label: string;
  /** Current value */
  current: number;
  /** Goal value */
  goal: number;
  /** Ring color */
  color: string;
  /** Unit label (e.g. "cal", "min", "hrs") */
  unit?: string;
}

export interface ActivityRingsProps {
  /** Ring data (max 4, draws outermost first) */
  rings: RingData[];
  /** Overall size of the widget */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Show legend beside the rings */
  showLegend?: boolean;
  /** Animation duration in ms */
  animationDuration?: number;
  style?: StyleProp<ViewStyle>;
}

function Ring({
  cx,
  cy,
  radius,
  strokeWidth,
  color,
  progress,
  trackOpacity = 0.15,
  delay = 0,
  duration = 1200,
}: {
  cx: number;
  cy: number;
  radius: number;
  strokeWidth: number;
  color: string;
  progress: number;
  trackOpacity?: number;
  delay?: number;
  duration?: number;
}) {
  const circumference = 2 * Math.PI * radius;
  const animProgress = useSharedValue(0);

  useEffect(() => {
    animProgress.value = withDelay(
      delay,
      withTiming(Math.min(progress, 1.5), {
        duration,
        easing: Easing.out(Easing.cubic),
      })
    );
  }, [progress, delay, duration]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animProgress.value),
  }));

  return (
    <>
      {/* Track */}
      <Circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        opacity={trackOpacity}
      />
      {/* Fill */}
      <AnimatedCircle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        animatedProps={animProps}
        rotation={-90}
        origin={`${cx}, ${cy}`}
      />
    </>
  );
}

export function ActivityRings({
  rings,
  size = 160,
  strokeWidth = 14,
  showLegend = true,
  animationDuration = 1200,
  style,
}: ActivityRingsProps) {
  const { theme } = useTheme();
  const center = size / 2;
  const gap = 4;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.xl,
          borderColor: theme.colors.borderSecondary,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <Svg width={size} height={size}>
          {rings.map((ring, i) => {
            const radius = center - strokeWidth / 2 - i * (strokeWidth + gap);
            if (radius <= 0) return null;
            return (
              <Ring
                key={ring.label}
                cx={center}
                cy={center}
                radius={radius}
                strokeWidth={strokeWidth}
                color={ring.color}
                progress={ring.current / ring.goal}
                delay={i * 150}
                duration={animationDuration}
              />
            );
          })}
        </Svg>

        {showLegend && (
          <View style={styles.legend}>
            {rings.map((ring) => {
              const pct = Math.round((ring.current / ring.goal) * 100);
              return (
                <View key={ring.label} style={styles.legendRow}>
                  <View
                    style={[styles.legendDot, { backgroundColor: ring.color }]}
                  />
                  <View style={styles.legendText}>
                    <TText
                      style={[
                        styles.legendLabel,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {ring.label}
                    </TText>
                    <TText
                      style={[styles.legendValue, { color: theme.colors.text }]}
                    >
                      {ring.current}
                      {ring.unit ? ` ${ring.unit}` : ""}{" "}
                      <TText
                        style={{ color: theme.colors.textMuted, fontSize: 12 }}
                      >
                        / {ring.goal}
                        {ring.unit ? ` ${ring.unit}` : ""}
                      </TText>
                    </TText>
                    <View style={styles.pctRow}>
                      <TText
                        style={[
                          styles.pctText,
                          {
                            color:
                              pct >= 100 ? theme.colors.success : ring.color,
                          },
                        ]}
                      >
                        {pct}%
                      </TText>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  legend: {
    flex: 1,
    gap: 14,
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 3,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  legendValue: {
    fontSize: 15,
    fontWeight: "600",
  },
  pctRow: {
    flexDirection: "row",
  },
  pctText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
