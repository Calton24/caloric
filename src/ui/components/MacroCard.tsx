/**
 * MacroCard
 * Circular arc progress card in CalAI style:
 * bold number + label at top, 270-degree SVG arc ring with emoji icon centred.
 */

import React, { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
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

// Arc ring geometry (270 degree arc, gap at bottom)
const RING_SIZE = 84;
const STROKE_W = 7;
const RADIUS = (RING_SIZE - STROKE_W) / 2; // 38.5
const CIRC = 2 * Math.PI * RADIUS; // ~241.9
const ARC_FRAC = 0.75; // 270 deg
const ARC_LEN = CIRC * ARC_FRAC; // ~181.4

interface MacroCardProps {
  label: string;
  consumedG: number;
  targetG: number;
  color: string;
  /** Emoji shown in the centre of the ring */
  icon?: string;
  /** Unit appended to the number (default: "g") */
  unit?: string;
  /** Whether to show remaining (target-consumed) or consumed value (default: "remaining") */
  display?: "remaining" | "consumed";
}

export function MacroCard({
  label,
  consumedG,
  targetG,
  color,
  icon = "",
  unit = "g",
  display = "remaining",
}: MacroCardProps) {
  const { theme } = useTheme();

  const hasTarget = targetG > 0;
  const rawProgress = hasTarget ? consumedG / targetG : 0;
  const isOver = hasTarget && consumedG > targetG;
  const progress = Math.min(rawProgress, 1);

  const displayNum =
    display === "remaining"
      ? hasTarget
        ? isOver
          ? consumedG - targetG
          : targetG - consumedG
        : consumedG
      : consumedG;

  // Over-budget: ring turns red, label says "over"
  const overColor = "#F87171";
  const ringColor = isOver ? overColor : color;

  const animProg = useSharedValue(0);
  const isFirstRender = useRef(true);

  useEffect(() => {
    cancelAnimation(animProg);
    if (isFirstRender.current) {
      isFirstRender.current = false;
      animProg.value = withTiming(progress, {
        duration: 700,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      animProg.value = 0;
      animProg.value = withDelay(
        50,
        withTiming(progress, {
          duration: 600,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress]);

  // strokeDashoffset drives the animated arc fill.
  // offset=CIRC  => nothing drawn  (progress 0)
  // offset=CIRC-ARC_LEN => full 270-deg arc drawn  (progress 1)
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRC - ARC_LEN * animProg.value,
  }));

  const trackColor =
    theme.mode === "dark" ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.07)";

  return (
    <View
      testID={`macro-${label.toLowerCase()}`}
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
    >
      {/* Number */}
      <TText
        style={[
          styles.number,
          { color: isOver ? overColor : theme.colors.text },
        ]}
      >
        {isOver && display === "remaining" ? "+" : ""}
        {Math.round(displayNum).toLocaleString()}
        <TText
          style={[
            styles.unitText,
            { color: isOver ? overColor : theme.colors.text },
          ]}
        >
          {unit}
        </TText>
      </TText>

      {/* Label */}
      <TText
        style={[
          styles.label,
          { color: isOver ? overColor : theme.colors.textSecondary },
        ]}
      >
        {label}{" "}
        <TText
          style={[
            styles.leftText,
            { color: isOver ? overColor : theme.colors.textMuted },
          ]}
        >
          {isOver && display === "remaining" ? "over" : "left"}
        </TText>
      </TText>

      {/* Arc ring */}
      <View style={styles.ringWrap}>
        <Svg width={RING_SIZE} height={RING_SIZE}>
          {/* Static track arc (270-deg, gap at bottom) */}
          <Circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            strokeDasharray={`${ARC_LEN} ${CIRC - ARC_LEN}`}
            strokeDashoffset={0}
            rotation={135}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            stroke={trackColor}
            strokeWidth={STROKE_W}
            fill="none"
            strokeLinecap="round"
          />
          {/* Animated progress arc */}
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            strokeDasharray={CIRC}
            rotation={135}
            origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
            stroke={ringColor}
            strokeWidth={STROKE_W}
            fill="none"
            strokeLinecap="round"
            animatedProps={animatedProps}
          />
        </Svg>

        {/* Icon centred in ring */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={styles.iconWrap}>
            <TText style={styles.icon}>{icon}</TText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    alignItems: "flex-start",
    gap: 2,
  },
  number: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  unitText: {
    fontSize: 14,
    fontWeight: "600",
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
  leftText: {
    fontWeight: "400",
    fontSize: 12,
  },
  ringWrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: "center",
    marginTop: 10,
  },
  iconWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 22,
  },
});
