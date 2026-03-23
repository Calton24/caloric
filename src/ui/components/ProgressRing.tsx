/**
 * ProgressRing — Animated Gradient Glass Circular Progress
 *
 * Large circular progress ring with gradient stroke, glow effect,
 * and centered content (day label, calorie count, target).
 * Animated with react-native-reanimated for smooth arc transitions.
 */

import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import Svg, {
    Circle,
    Defs,
    Stop,
    LinearGradient as SvgGradient,
} from "react-native-svg";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** Current consumed value */
  consumed: number;
  /** Target/budget value */
  target: number;
  /** Ring diameter */
  size?: number;
  /** Ring stroke width */
  strokeWidth?: number;
  /** Ring color (defaults to theme primary) */
  color?: string;
  /** Track color */
  trackColor?: string;
  /** Center icon or emoji */
  centerIcon?: string;
  /** Whether to show the numeric label */
  showLabel?: boolean;
  /** Label text (defaults to "remaining") */
  labelText?: string;
  /** Day heading shown inside ring (e.g. "Today", "Yesterday") */
  dayLabel?: string;
  /** Subtitle shown below the number (e.g. "of 2,000 cal") */
  subtitle?: string;
}

export function ProgressRing({
  consumed,
  target,
  size = 240,
  strokeWidth = 18,
  color,
  trackColor,
  centerIcon,
  showLabel = true,
  labelText = "remaining",
  dayLabel,
  subtitle,
}: ProgressRingProps) {
  const { theme } = useTheme();

  const ringColor = color ?? theme.colors.primary;
  // In light mode, surfaceElevated is white — use a visible gray track instead
  const track =
    trackColor ??
    (theme.mode === "light"
      ? `${theme.colors.border}`
      : `${theme.colors.surfaceElevated}80`);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const hasTarget = target > 0;
  const rawProgress = hasTarget ? consumed / target : 0;
  const progress = Math.min(rawProgress, 1);
  const isOver = hasTarget && rawProgress > 1;
  const remaining = Math.max(target - consumed, 0);
  const overAmount = Math.max(consumed - target, 0);

  // Animate the arc
  const animatedProgress = useSharedValue(0);
  useEffect(() => {
    animatedProgress.value = withTiming(progress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  const arcProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  const glowProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  return (
    <View
      testID="progress-ring"
      style={[styles.container, { width: size, height: size }]}
    >
      <Svg width={size} height={size}>
        <Defs>
          {/* Gradient for the progress arc */}
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop
              offset="0"
              stopColor={ringColor}
              stopOpacity={theme.mode === "light" ? "0.85" : "0.6"}
            />
            <Stop offset="0.5" stopColor={ringColor} stopOpacity="1" />
            <Stop
              offset="1"
              stopColor={lightenColor(ringColor, 40)}
              stopOpacity="1"
            />
          </SvgGradient>
          {/* Glow gradient */}
          <SvgGradient id="glowGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={ringColor} stopOpacity="0.15" />
            <Stop
              offset="1"
              stopColor={lightenColor(ringColor, 30)}
              stopOpacity="0.25"
            />
          </SvgGradient>
        </Defs>

        {/* Glow layer — slightly larger, blurred look */}
        {progress > 0 && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#glowGrad)"
            strokeWidth={strokeWidth + 12}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            animatedProps={glowProps}
            rotation={-90}
            origin={`${size / 2}, ${size / 2}`}
            opacity={0.5}
          />
        )}

        {/* Track circle — subtle glass */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={strokeWidth}
          fill="none"
        />

        {/* Progress arc — gradient stroke */}
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={arcProps}
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>

      {/* Center content */}
      <View style={styles.center}>
        {dayLabel && (
          <TText style={[styles.dayLabel, { color: ringColor }]}>
            {dayLabel}
          </TText>
        )}
        {centerIcon && <TText style={styles.icon}>{centerIcon}</TText>}
        {showLabel && (
          <>
            <TText style={[styles.value, { color: theme.colors.text }]}>
              {!hasTarget
                ? Math.round(consumed).toLocaleString()
                : isOver
                  ? `+${Math.round(overAmount).toLocaleString()}`
                  : Math.round(remaining).toLocaleString()}
            </TText>
            {subtitle ? (
              <TText
                style={[
                  styles.subtitle,
                  {
                    color: !hasTarget
                      ? theme.colors.textMuted
                      : isOver
                        ? ringColor
                        : theme.colors.textMuted,
                  },
                ]}
              >
                {!hasTarget
                  ? "cal · set a goal"
                  : isOver
                    ? "over budget"
                    : subtitle}
              </TText>
            ) : (
              <TText
                style={[
                  styles.label,
                  {
                    color: !hasTarget
                      ? theme.colors.textMuted
                      : isOver
                        ? ringColor
                        : theme.colors.textMuted,
                  },
                ]}
              >
                {!hasTarget
                  ? "cal · set a goal"
                  : isOver
                    ? "over budget"
                    : labelText}
              </TText>
            )}
          </>
        )}
      </View>
    </View>
  );
}

/** Lighten a hex color by a percentage (0–100) */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, ((num >> 16) & 0xff) + Math.round(2.55 * percent));
  const g = Math.min(255, ((num >> 8) & 0xff) + Math.round(2.55 * percent));
  const b = Math.min(255, (num & 0xff) + Math.round(2.55 * percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
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
  dayLabel: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  icon: {
    fontSize: 28,
    marginBottom: 2,
  },
  value: {
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    marginTop: 2,
  },
  label: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 2,
  },
});
