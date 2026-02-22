/**
 * TabItem
 * Individual tab button for GlassTabBar
 */

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    useAnimatedStyle,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../../ui/primitives/TText";

interface TabItemProps {
  label: string;
  icon?: React.ReactNode;
  isActive: boolean;
  onPress: () => void;
}

export function TabItem({ label, icon, isActive, onPress }: TabItemProps) {
  const { theme } = useTheme();

  const animatedIndicatorStyle = useAnimatedStyle(() => ({
    opacity: withTiming(isActive ? 1 : 0, { duration: 200 }),
    backgroundColor: theme.colors.primary,
  }));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.content}>
        {icon && (
          <View
            style={[styles.iconContainer, { marginBottom: theme.spacing.xs }]}
          >
            {icon}
          </View>
        )}
        <TText
          style={{
            fontSize: theme.typography.fontSize.xs,
            color: isActive ? theme.colors.primary : theme.colors.textSecondary,
            fontWeight: isActive
              ? theme.typography.fontWeight.semibold
              : theme.typography.fontWeight.regular,
          }}
        >
          {label}
        </TText>
      </View>
      <Animated.View
        style={[
          styles.indicator,
          {
            borderRadius: theme.radius.full,
          },
          animatedIndicatorStyle,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    position: "relative",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  indicator: {
    position: "absolute",
    top: 0,
    left: "25%",
    right: "25%",
    height: 3,
  },
});
