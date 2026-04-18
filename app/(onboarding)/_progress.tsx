/**
 * Shared onboarding progress — segmented step indicators.
 * Each step is a rounded capsule that fills with the primary color
 * as the user progresses through the onboarding flow.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import type { Theme } from "../../src/theme/ThemeProvider";

function StepSegment({
  index,
  step,
  theme,
}: {
  index: number;
  step: number;
  theme: Theme;
}) {
  const fill = useSharedValue(0);

  useEffect(() => {
    const target = index < step ? 1 : 0;
    fill.value = withSpring(target, { damping: 20, stiffness: 200 });
  }, [index, step, fill]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fill.value * 100}%`,
  }));

  return (
    <View
      style={[
        styles.segmentTrack,
        { backgroundColor: theme.colors.border + "25" },
      ]}
    >
      <Animated.View style={[styles.segmentFill, fillStyle]}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>
    </View>
  );
}

/** Segmented progress indicator showing completed/remaining steps */
export function OnboardingProgress({
  step,
  total,
  theme,
}: {
  step: number;
  total: number;
  theme: Theme;
}) {
  return (
    <View style={styles.segmentRow}>
      {Array.from({ length: total }).map((_, i) => (
        <StepSegment key={i} index={i} step={step} theme={theme} />
      ))}
    </View>
  );
}

/** Back button + segmented progress for onboarding screens */
export function OnboardingHeader({
  step,
  total,
  theme,
  showBack = true,
}: {
  step: number;
  total: number;
  theme: Theme;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={[styles.backButton, { backgroundColor: theme.colors.surface }]}
        >
          <Ionicons name="chevron-back" size={20} color={theme.colors.text} />
        </Pressable>
      ) : (
        <View style={styles.backPlaceholder} />
      )}
      <View style={styles.progressWrapper}>
        <OnboardingProgress step={step} total={total} theme={theme} />
      </View>
      <View style={styles.backPlaceholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  segmentRow: {
    flexDirection: "row",
    gap: 6,
  },
  segmentTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  segmentFill: {
    height: 6,
    borderRadius: 3,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  backPlaceholder: {
    width: 40,
  },
  progressWrapper: {
    flex: 1,
  },
});

export default OnboardingProgress;
