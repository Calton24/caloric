/**
 * AnimatedCheck
 * Check circle that springs in on selection.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";

const SPRING = { damping: 12, stiffness: 180, mass: 0.6 };

interface AnimatedCheckProps {
  selected: boolean;
  size?: number;
}

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export function AnimatedCheck({ selected, size = 24 }: AnimatedCheckProps) {
  const { theme } = useTheme();
  const progress = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, SPRING);
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: progress.value }],
    opacity: progress.value,
  }));

  const circleStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  if (selected) {
    return (
      <View style={[circleStyle, styles.wrapper]}>
        <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[circleStyle, styles.center]}
          >
            <Ionicons
              name="checkmark"
              size={size * 0.58}
              color={theme.colors.textInverse}
            />
          </LinearGradient>
        </Animated.View>
      </View>
    );
  }

  return (
    <View
      style={[
        circleStyle,
        styles.center,
        {
          borderWidth: 1.5,
          borderColor: theme.colors.border,
          backgroundColor: "transparent",
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: "hidden",
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
});
