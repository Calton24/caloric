/**
 * FilmGrain — Cinematic noise overlay.
 *
 * Renders a tileable monochrome noise texture above the background image.
 * Combines a slow opacity pulse with a subtle translate drift so the grain
 * feels alive — like real film stock — without any obvious animation.
 *
 * Layer order (caller is responsible):
 *   [Background Image] → [FilmGrain] → [Gradient] → [UI]
 *
 * Props:
 *   opacity  — peak grain intensity (default 0.07, sweet spot 0.05–0.09)
 *   animated — enable drift + pulse (default true)
 */

import React, { memo, useEffect } from "react";
import { Image, StyleSheet } from "react-native";
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";

const noiseTile = require("../../../assets/images/noise-tile.png");

interface FilmGrainProps {
  opacity?: number;
  animated?: boolean;
}

export const FilmGrain = memo(function FilmGrain({
  opacity = 0.07,
  animated = true,
}: FilmGrainProps) {
  const pulse = useSharedValue(1);
  const driftX = useSharedValue(0);
  const driftY = useSharedValue(0);

  useEffect(() => {
    if (!animated) return;
    // Opacity pulse: oscillate between 100% and 75% of base opacity
    pulse.value = withRepeat(
      withTiming(0.75, { duration: 7000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    // Slow spatial drift — breaks the static tiled pattern
    driftX.value = withRepeat(
      withTiming(1.5, { duration: 9000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    driftY.value = withRepeat(
      withTiming(-1, { duration: 11000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => {
      cancelAnimation(pulse);
      cancelAnimation(driftX);
      cancelAnimation(driftY);
    };
  }, [animated, pulse, driftX, driftY]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity * pulse.value,
    transform: [{ translateX: driftX.value }, { translateY: driftY.value }],
  }));

  return (
    <Animated.View style={[styles.container, animStyle]} pointerEvents="none">
      <Image source={noiseTile} style={styles.tile} resizeMode="repeat" />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    // Slight overflow so drift doesn't reveal edges
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
  },
  tile: {
    width: "100%",
    height: "100%",
  },
});
