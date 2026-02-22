/**
 * StepCounter
 * Circular arc progress widget for step tracking with animated fill,
 * step count, distance, calories, and optional goal confetti state.
 *
 * Usage:
 *   <StepCounter steps={8432} goal={10000} distance={5.8} calories={320} />
 */

import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface StepCounterProps {
  /** Current step count */
  steps: number;
  /** Daily goal */
  goal?: number;
  /** Distance in km/mi */
  distance?: number;
  /** Distance unit */
  distanceUnit?: string;
  /** Calories burned */
  calories?: number;
  /** Active minutes */
  activeMinutes?: number;
  /** Ring size */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Arc start angle in degrees (0=top, sweeps clockwise) */
  startAngle?: number;
  /** Arc sweep angle in degrees */
  sweepAngle?: number;
  /** Progress color override */
  progressColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function StepCounter({
  steps,
  goal = 10000,
  distance,
  distanceUnit = "km",
  calories,
  activeMinutes,
  size = 180,
  strokeWidth = 12,
  startAngle = 0,
  sweepAngle = 360,
  progressColor,
  style,
}: StepCounterProps) {
  const { theme } = useTheme();
  const progress = Math.min(steps / goal, 1);
  const isFullCircle = sweepAngle >= 360;
  const color = progressColor ?? theme.colors.primary;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = (sweepAngle / 360) * circumference;

  // Animated progress
  const animProgress = useSharedValue(0);
  useEffect(() => {
    animProgress.value = withTiming(progress, {
      duration: 1200,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const animProps = useAnimatedProps(() => ({
    strokeDashoffset: arcLength * (1 - animProgress.value),
  }));

  // Goal celebration bounce
  const celebScale = useSharedValue(1);
  useEffect(() => {
    if (progress >= 1) {
      celebScale.value = withSequence(
        withSpring(1.06, { damping: 4, stiffness: 200 }),
        withSpring(1, { damping: 8, stiffness: 200 })
      );
    }
  }, [progress >= 1]);

  const celebStyle = useAnimatedStyle(() => ({
    transform: [{ scale: celebScale.value }],
  }));

  const center = size / 2;

  // Format step count with commas
  const formattedSteps = steps.toLocaleString();

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
      <TText color="secondary" style={styles.title}>
        Steps
      </TText>

      <Animated.View style={[styles.ringWrap, celebStyle]}>
        <Svg width={size} height={size}>
          {/* Track */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color + "18"}
            strokeWidth={strokeWidth}
            strokeDasharray={
              isFullCircle ? undefined : `${arcLength} ${circumference}`
            }
            strokeLinecap="round"
            rotation={startAngle - 90}
            origin={`${center}, ${center}`}
          />
          {/* Progress */}
          <AnimatedCircle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcLength} ${circumference}`}
            strokeLinecap="round"
            animatedProps={animProps}
            rotation={startAngle - 90}
            origin={`${center}, ${center}`}
          />
        </Svg>

        {/* Center content */}
        <View style={[styles.centerContent, { width: size, height: size }]}>
          <TText
            style={[
              styles.stepCount,
              {
                color: progress >= 1 ? theme.colors.success : theme.colors.text,
              },
            ]}
          >
            {formattedSteps}
          </TText>
          <TText style={[styles.goalLabel, { color: theme.colors.textMuted }]}>
            / {goal.toLocaleString()} steps
          </TText>
          {progress >= 1 && (
            <TText style={[styles.goalHit, { color: theme.colors.success }]}>
              🎉 Goal reached!
            </TText>
          )}
        </View>
      </Animated.View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        {distance !== undefined && (
          <View style={styles.stat}>
            <TText style={[styles.statValue, { color: theme.colors.text }]}>
              {distance.toFixed(1)}
            </TText>
            <TText
              style={[styles.statLabel, { color: theme.colors.textMuted }]}
            >
              {distanceUnit}
            </TText>
          </View>
        )}
        {calories !== undefined && (
          <View style={styles.stat}>
            <TText style={[styles.statValue, { color: theme.colors.text }]}>
              {calories}
            </TText>
            <TText
              style={[styles.statLabel, { color: theme.colors.textMuted }]}
            >
              kcal
            </TText>
          </View>
        )}
        {activeMinutes !== undefined && (
          <View style={styles.stat}>
            <TText style={[styles.statValue, { color: theme.colors.text }]}>
              {activeMinutes}
            </TText>
            <TText
              style={[styles.statLabel, { color: theme.colors.textMuted }]}
            >
              min
            </TText>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  ringWrap: {
    position: "relative",
    marginBottom: 16,
  },
  centerContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  stepCount: {
    fontSize: 28,
    fontWeight: "700",
  },
  goalLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  goalHit: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
  },
});
