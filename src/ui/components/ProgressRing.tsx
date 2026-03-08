/**
 * ProgressRing
 * SVG circular progress ring for calorie tracking display.
 * Shows consumed/target with an animated ring and center content.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface ProgressRingProps {
  /** Current consumed value */
  consumed: number;
  /** Target/budget value */
  target: number;
  /** Ring diameter */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Ring color (defaults to theme accent) */
  color?: string;
  /** Track color */
  trackColor?: string;
  /** Center icon or emoji */
  centerIcon?: string;
  /** Whether to show the numeric label */
  showLabel?: boolean;
  /** Label text (defaults to "remaining") */
  labelText?: string;
}

export function ProgressRing({
  consumed,
  target,
  size = 180,
  strokeWidth = 12,
  color,
  trackColor,
  centerIcon = "🔥",
  showLabel = true,
  labelText = "remaining",
}: ProgressRingProps) {
  const { theme } = useTheme();

  const ringColor = color ?? theme.colors.primary;
  const track = trackColor ?? theme.colors.surfaceElevated;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(consumed / target, 1);
  const strokeDashoffset = circumference * (1 - progress);
  const remaining = Math.max(target - consumed, 0);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Track circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {/* Center content */}
      <View style={styles.center}>
        <TText style={styles.icon}>{centerIcon}</TText>
        {showLabel && (
          <>
            <TText style={[styles.value, { color: theme.colors.text }]}>
              {Math.round(remaining)}
            </TText>
            <TText style={[styles.label, { color: theme.colors.textMuted }]}>
              {labelText}
            </TText>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 28,
    marginBottom: 2,
  },
  value: {
    fontSize: 32,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 2,
  },
});
