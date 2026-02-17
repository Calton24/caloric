/**
 * HueSlider
 * Interactive hue slider for theme customization
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";

interface HueSliderProps {
  value: number; // 0-360
  onValueChange: (hue: number) => void;
}

const SLIDER_WIDTH = 280;
const THUMB_SIZE = 28;
const TRACK_HEIGHT = 12;

export function HueSlider({ value, onValueChange }: HueSliderProps) {
  const { theme } = useTheme();
  const translateX = useSharedValue((value / 360) * SLIDER_WIDTH);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      const newX = Math.max(0, Math.min(SLIDER_WIDTH, event.x));
      translateX.value = newX;
      const newHue = Math.round((newX / SLIDER_WIDTH) * 360);
      runOnJS(onValueChange)(newHue);
    })
    .onEnd(() => {
      const newHue = Math.round((translateX.value / SLIDER_WIDTH) * 360);
      runOnJS(onValueChange)(newHue);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value - THUMB_SIZE / 2 }],
  }));

  // Update position when value prop changes externally
  React.useEffect(() => {
    translateX.value = (value / 360) * SLIDER_WIDTH;
  }, [value, translateX]);

  // Create hue stops for the gradient
  const hueStops = [0, 60, 120, 180, 240, 300, 360];

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.track,
          {
            width: SLIDER_WIDTH,
            height: TRACK_HEIGHT,
            borderRadius: TRACK_HEIGHT / 2,
          },
        ]}
      >
        <View style={styles.gradientContainer}>
          {hueStops.map((hue, index) => (
            <View
              key={hue}
              style={[
                styles.gradientSegment,
                {
                  backgroundColor: `hsl(${hue}, 70%, 60%)`,
                  flex: index === hueStops.length - 1 ? 0 : 1,
                  width: index === hueStops.length - 1 ? 0 : undefined,
                },
              ]}
            />
          ))}
        </View>
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View
          style={[
            styles.thumb,
            thumbStyle,
            {
              width: THUMB_SIZE,
              height: THUMB_SIZE,
              borderRadius: THUMB_SIZE / 2,
              backgroundColor: `hsl(${value}, 70%, 60%)`,
              borderColor: theme.colors.border,
            },
          ]}
        />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  track: {
    position: "absolute",
    overflow: "hidden",
  },
  gradientContainer: {
    flex: 1,
    flexDirection: "row",
  },
  gradientSegment: {
    height: "100%",
  },
  thumb: {
    position: "absolute",
    borderWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
