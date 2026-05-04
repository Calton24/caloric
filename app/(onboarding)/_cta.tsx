/**
 * Shared Gradient CTA button for onboarding screens.
 * Provides a consistent, premium call-to-action with gradient background,
 * subtle shadow, and spring-based press feedback.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import type { Theme } from "../../src/theme/ThemeProvider";
import { TText } from "../../src/ui/primitives/TText";

interface OnboardingCTAProps {
  label: string;
  onPress: () => void;
  theme: Theme;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  testID?: string;
  delay?: number;
}

export function OnboardingCTA({
  label,
  onPress,
  theme,
  disabled = false,
  icon = "arrow-forward",
  testID,
  delay = 400,
}: OnboardingCTAProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      entering={FadeInUp.duration(500).delay(delay)}
      style={styles.ctaArea}
    >
      <Animated.View style={animatedStyle}>
        <Pressable
          testID={testID}
          onPress={onPress}
          disabled={disabled}
          onPressIn={() => {
            scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
          }}
          onPressOut={() => {
            scale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
        >
          <View
            style={[
              styles.ctaShadow,
              {
                backgroundColor: theme.colors.primary + "30",
                opacity: disabled ? 0 : 1,
              },
            ]}
          />
          <LinearGradient
            colors={
              disabled
                ? [theme.colors.border, theme.colors.border]
                : [theme.colors.primary, theme.colors.accent]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.ctaGradient, { opacity: disabled ? 0.4 : 1 }]}
          >
            <TText
              style={[styles.ctaText, { color: theme.colors.textInverse }]}
            >
              {label}
            </TText>
            <Ionicons name={icon} size={20} color={theme.colors.textInverse} />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  ctaArea: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    paddingTop: 8,
  },
  ctaShadow: {
    position: "absolute",
    bottom: -4,
    left: 16,
    right: 16,
    height: 48,
    borderRadius: 20,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    gap: 8,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
