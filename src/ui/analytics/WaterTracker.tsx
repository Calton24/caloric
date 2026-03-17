/**
 * WaterTracker
 * Hydration tracking widget with animated fill, wave effect,
 * glass count, and daily goal progress.
 *
 * Usage:
 *   <WaterTracker
 *     current={1.4}
 *     goal={2.5}
 *     unit="L"
 *     glasses={6}
 *   />
 */

import React, { useEffect } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedProps,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import Svg, { ClipPath, Defs, Path, Rect } from "react-native-svg";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedRect = Animated.createAnimatedComponent(Rect);

export interface WaterTrackerProps {
  /** Current amount consumed */
  current: number;
  /** Daily goal */
  goal: number;
  /** Unit label (e.g. "L", "ml", "oz") */
  unit?: string;
  /** Number of glasses consumed */
  glasses?: number;
  /** Glass size in the same unit */
  glassSize?: number;
  /** Widget size */
  size?: number;
  /** Water color */
  waterColor?: string;
  /** Show glass count row */
  showGlasses?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function WaterTracker({
  current,
  goal,
  unit = "L",
  glasses,
  glassSize,
  size = 180,
  waterColor,
  showGlasses = true,
  style,
}: WaterTrackerProps) {
  const { theme } = useTheme();
  const color = waterColor ?? "#5AC8FA";
  const progress = Math.min(current / goal, 1);
  const pct = Math.round(progress * 100);

  // Animated fill
  const fillAnim = useSharedValue(0);
  useEffect(() => {
    fillAnim.value = withTiming(progress, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });
    // fillAnim is a stable useSharedValue ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // Wave animation
  const wave = useSharedValue(0);
  useEffect(() => {
    wave.value = withRepeat(
      withTiming(1, { duration: 2500, easing: Easing.linear }),
      -1,
      false
    );
    // wave is a stable useSharedValue ref; one-time mount animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dropletH = size;
  const dropletW = size * 0.7;
  const svgViewBox = `0 0 ${dropletW} ${dropletH}`;

  // Droplet shape path
  const dropletPath = `
    M ${dropletW / 2} 8
    C ${dropletW * 0.15} ${dropletH * 0.35},
      2 ${dropletH * 0.55},
      2 ${dropletH * 0.68}
    C 2 ${dropletH * 0.87},
      ${dropletW * 0.22} ${dropletH - 2},
      ${dropletW / 2} ${dropletH - 2}
    C ${dropletW * 0.78} ${dropletH - 2},
      ${dropletW - 2} ${dropletH * 0.87},
      ${dropletW - 2} ${dropletH * 0.68}
    C ${dropletW - 2} ${dropletH * 0.55},
      ${dropletW * 0.85} ${dropletH * 0.35},
      ${dropletW / 2} 8
    Z
  `;

  // Animated fill rect (clipped by droplet)
  const fillRectProps = useAnimatedProps(() => {
    const fillHeight = fillAnim.value * dropletH;
    return {
      y: dropletH - fillHeight,
      height: fillHeight,
    };
  });

  // Wave path
  const waveProps = useAnimatedProps(() => {
    const fillHeight = fillAnim.value * dropletH;
    const baseY = dropletH - fillHeight;
    const phaseOffset = wave.value * Math.PI * 2;
    const amp = 4;

    let d = `M 0 ${baseY}`;
    for (let x = 0; x <= dropletW; x += 2) {
      const y =
        baseY + Math.sin((x / dropletW) * Math.PI * 2 + phaseOffset) * amp;
      d += ` L ${x} ${y}`;
    }
    d += ` L ${dropletW} ${dropletH + 10} L 0 ${dropletH + 10} Z`;

    return { d };
  });

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
      <View style={styles.dropletContainer}>
        <Svg width={dropletW} height={dropletH} viewBox={svgViewBox}>
          <Defs>
            <ClipPath id="dropClip">
              <Path d={dropletPath} />
            </ClipPath>
          </Defs>

          {/* Droplet outline */}
          <Path
            d={dropletPath}
            fill="none"
            stroke={color + "30"}
            strokeWidth={2}
          />

          {/* Water fill with wave */}
          <AnimatedPath
            animatedProps={waveProps}
            fill={color + "60"}
            clipPath="url(#dropClip)"
          />
          <AnimatedRect
            x={0}
            width={dropletW}
            animatedProps={fillRectProps}
            fill={color + "35"}
            clipPath="url(#dropClip)"
          />
        </Svg>

        {/* Center label */}
        <View
          style={[styles.centerLabel, { width: dropletW, height: dropletH }]}
        >
          <TText
            style={[
              styles.pctValue,
              {
                color: pct >= 100 ? theme.colors.success : theme.colors.text,
              },
            ]}
          >
            {pct}%
          </TText>
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <TText style={[styles.statValue, { color: theme.colors.text }]}>
            {current.toFixed(1)}
          </TText>
          <TText style={[styles.statUnit, { color: theme.colors.textMuted }]}>
            {unit} consumed
          </TText>
        </View>
        <View
          style={[
            styles.statDivider,
            { backgroundColor: theme.colors.divider },
          ]}
        />
        <View style={styles.stat}>
          <TText style={[styles.statValue, { color: theme.colors.text }]}>
            {(goal - current > 0 ? goal - current : 0).toFixed(1)}
          </TText>
          <TText style={[styles.statUnit, { color: theme.colors.textMuted }]}>
            {unit} remaining
          </TText>
        </View>
      </View>

      {/* Glass count */}
      {showGlasses && glasses !== undefined && (
        <View style={styles.glassRow}>
          {Array.from({ length: Math.ceil(goal / (glassSize || 0.25)) })
            .map((_, i) => (
              <View
                key={i}
                style={[
                  styles.glassIcon,
                  {
                    backgroundColor:
                      i < glasses ? color : theme.colors.surfaceSecondary,
                    borderColor:
                      i < glasses ? color : theme.colors.borderSecondary,
                  },
                ]}
              />
            ))
            .slice(0, 10)}
          {glasses !== undefined && (
            <TText
              style={[styles.glassCount, { color: theme.colors.textSecondary }]}
            >
              {glasses} glasses
            </TText>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderWidth: 1,
    alignItems: "center",
  },
  title: {
    fontSize: 14,
    marginBottom: 12,
    alignSelf: "flex-start",
  },
  dropletContainer: {
    position: "relative",
    marginBottom: 16,
  },
  centerLabel: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 20,
  },
  pctValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 12,
  },
  stat: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statUnit: {
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  glassRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  glassIcon: {
    width: 12,
    height: 16,
    borderRadius: 3,
    borderWidth: 1,
  },
  glassCount: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
});
