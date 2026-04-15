/**
 * ProgressRing  Dot-Arc Progress Gauge
 *
 * A semicircular array of glowing dots arranged in a 244 arc
 * (lower-left  apex  lower-right). Dots illuminate sequentially
 * as progress increases. Dot size and glow intensity peak at the apex
 * for a dramatic radial lighting effect.
 */

import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { getOverLimitColor } from "../../../hooks/useOverLimitColor";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

//  Arc constants
/** Number of dots along the arc. */
const DOT_COUNT = 30;
/** SVG start angle (0 = right, CW): lower-left  8 o'clock. */
const ARC_START_DEG = 148;
/** Arc sweeps CW through the apex (12 o'clock) to lower-right. */
const ARC_SPAN_DEG = 244;

interface ProgressRingProps {
  /** Current consumed value */
  consumed: number;
  /** Target/budget value */
  target: number;
  /** Ring diameter */
  size?: number;
  /** Kept for API compatibility  unused in dot-arc design */
  strokeWidth?: number;
  /** Active dot color (defaults to theme primary) */
  color?: string;
  /** Track dot color override */
  trackColor?: string;
  /** Center icon or emoji */
  centerIcon?: string;
  /** Whether to show the numeric label */
  showLabel?: boolean;
  /** Label text (defaults to "remaining") */
  labelText?: string;
  /** Day heading shown inside ring (e.g. "Today") */
  dayLabel?: string;
  /** Subtitle shown below the number (e.g. "of 2,000 cal") */
  subtitle?: string;
}

export function ProgressRing({
  consumed,
  target,
  size = 240,
  color,
  trackColor,
  centerIcon,
  showLabel = true,
  labelText = "remaining",
  dayLabel,
  subtitle,
}: ProgressRingProps) {
  const { theme } = useTheme();

  const hasTarget = target > 0;
  const rawProgress = hasTarget ? consumed / target : 0;
  const clampedProgress = Math.min(rawProgress, 1);
  const isOver = hasTarget && rawProgress > 1;

  // Derive severity color directly from the ratio we already have, so the ring
  // is never stuck on green due to a stale `color` prop from the parent.
  const derivedColor = getOverLimitColor(rawProgress, theme.colors.primary);
  const ringColor = isOver ? derivedColor : (color ?? derivedColor);
  const remaining = Math.max(target - consumed, 0);
  const overAmount = Math.max(consumed - target, 0);

  //  Smooth animated fill progress (0  1)
  const [displayProgress, setDisplayProgress] = useState(0);
  const prevProgress = useRef(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const from = prevProgress.current;
    const to = clampedProgress;
    const duration = 900;
    let startTime: number | null = null;

    function tick(now: number) {
      if (!startTime) startTime = now;
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setDisplayProgress(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevProgress.current = to;
      }
    }

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
     
  }, [clampedProgress]);

  //  Dot arc geometry
  const arcRadius = size * 0.41;
  const ocx = size / 2;
  const ocy = size / 2;
  const maxDotR = size * 0.034; // apex dot radius
  const minDotR = size * 0.019; // edge dot radius
  const litCount = displayProgress * DOT_COUNT;

  const trackFill =
    trackColor ??
    (theme.mode === "dark" ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)");

  const dots = Array.from({ length: DOT_COUNT }, (_, i) => {
    const angleDeg = ARC_START_DEG + (i / (DOT_COUNT - 1)) * ARC_SPAN_DEG;
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = ocx + arcRadius * Math.cos(angleRad);
    const y = ocy + arcRadius * Math.sin(angleRad);

    const distFromApex = Math.abs(i / (DOT_COUNT - 1) - 0.5) * 2; // 0=apex, 1=edge
    const r = minDotR + (maxDotR - minDotR) * (1 - distFromApex * 0.55);
    const litLevel = Math.max(0, Math.min(1, litCount - i));
    const glow = 0.55 + 0.45 * (1 - distFromApex); // peaks at apex

    return { x, y, r, litLevel, glow, i };
  });

  //  Center label
  const displayValue = !hasTarget
    ? Math.round(consumed)
    : isOver
      ? Math.round(overAmount)
      : Math.round(remaining);

  const displaySuffix = !hasTarget
    ? "cal · set a goal"
    : isOver
      ? "over budget"
      : (subtitle ?? labelText);

  const mutedColor = isOver ? ringColor : theme.colors.textMuted;

  return (
    <View
      testID="progress-ring"
      style={[styles.container, { width: size, height: size }]}
    >
      <Svg width={size} height={size}>
        {/* Track dots */}
        {dots.map(({ x, y, r, i }) => (
          <Circle key={`t${i}`} cx={x} cy={y} r={r} fill={trackFill} />
        ))}

        {/* Lit dots: outer glow halo  inner glow  core */}
        {dots
          .filter((d) => d.litLevel > 0)
          .map(({ x, y, r, litLevel, glow, i }) => (
            <React.Fragment key={`l${i}`}>
              <Circle
                cx={x}
                cy={y}
                r={r * 2.8}
                fill={ringColor}
                opacity={litLevel * glow * 0.12}
              />
              <Circle
                cx={x}
                cy={y}
                r={r * 1.7}
                fill={ringColor}
                opacity={litLevel * glow * 0.28}
              />
              <Circle
                cx={x}
                cy={y}
                r={r * litLevel}
                fill={ringColor}
                opacity={Math.min(0.75 + glow * 0.25, 1)}
              />
            </React.Fragment>
          ))}
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
              {(isOver ? "+" : "") + displayValue.toLocaleString()}
            </TText>
            <TText
              style={[
                styles.subtitle,
                { color: !hasTarget ? theme.colors.textMuted : mutedColor },
              ]}
            >
              {displaySuffix}
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
    paddingTop: 8,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
    marginBottom: 2,
    height: 20,
  },
  icon: {
    fontSize: 28,
    marginBottom: 2,
  },
  value: {
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
    height: 50,
    lineHeight: 50,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "400",
    marginTop: 2,
    height: 18,
  },
});
