/**
 * SelectCard
 * Animated selection card for onboarding screens.
 * Layers spatial (scale), color (state contrast), and motion (spring) feedback.
 * Selected: green glow + lift. Unselected: flat + muted.
 */

import React, { useEffect } from "react";
import { Pressable, StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, {
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";

const SPRING_CONFIG = { damping: 15, stiffness: 150, mass: 0.8 };

interface SelectCardProps {
  children: React.ReactNode;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function SelectCard({
  children,
  selected,
  onPress,
  style,
  testID,
}: SelectCardProps) {
  const { theme } = useTheme();
  const pressed = useSharedValue(0);
  const selection = useSharedValue(selected ? 1 : 0);

  useEffect(() => {
    selection.value = withSpring(selected ? 1 : 0, SPRING_CONFIG);
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      pressed.value,
      [0, 1],
      [1 + selection.value * 0.02, 0.97]
    );

    return {
      transform: [{ scale }],
      opacity: interpolate(selection.value, [0, 1], [0.88, 1]),
    };
  });

  const cardStyle = useAnimatedStyle(() => {
    const shadowOpacity = interpolate(selection.value, [0, 1], [0, 0.18]);
    const shadowRadius = interpolate(selection.value, [0, 1], [0, 14]);
    const elevation = interpolate(selection.value, [0, 1], [0, 6]);

    return {
      shadowOpacity,
      shadowRadius,
      elevation,
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPressIn={() => {
          pressed.value = withTiming(1, { duration: 80 });
        }}
        onPressOut={() => {
          pressed.value = withSpring(0, SPRING_CONFIG);
        }}
        onPress={onPress}
        testID={testID}
      >
        <Animated.View
          style={[
            styles.card,
            {
              borderRadius: 16,
              backgroundColor: selected
                ? theme.colors.glassSelected
                : theme.colors.surfaceMatte,
              borderColor: selected
                ? theme.colors.glassSelectedBorder
                : theme.mode === "light"
                  ? "rgba(0, 0, 0, 0.04)"
                  : "rgba(255, 255, 255, 0.06)",
              shadowColor: selected ? theme.colors.primary : "transparent",
            },
            cardStyle,
            style,
          ]}
        >
          {children}
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 4 },
  },
});
