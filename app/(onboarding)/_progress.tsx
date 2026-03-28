/**
 * Shared onboarding progress bar + header component
 * Thin continuous animated line with optional back button.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";

export function OnboardingProgress({
  step,
  total,
  theme,
}: {
  step: number;
  total: number;
  theme: any;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(step / total, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [step, total, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }));

  return (
    <View style={styles.container}>
      <View
        style={[styles.track, { backgroundColor: theme.colors.border + "30" }]}
      >
        <Animated.View
          style={[
            styles.fill,
            { backgroundColor: theme.colors.primary },
            fillStyle,
          ]}
        />
      </View>
    </View>
  );
}

/** Back button + progress bar combo for onboarding screens */
export function OnboardingHeader({
  step,
  total,
  theme,
  showBack = true,
}: {
  step: number;
  total: number;
  theme: any;
  showBack?: boolean;
}) {
  const router = useRouter();

  return (
    <View style={styles.header}>
      {showBack ? (
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
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
  container: {
    paddingHorizontal: 0,
  },
  track: {
    height: 3,
    borderRadius: 1.5,
    overflow: "hidden",
  },
  fill: {
    height: 3,
    borderRadius: 1.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backPlaceholder: {
    width: 36,
  },
  progressWrapper: {
    flex: 1,
    paddingHorizontal: 8,
  },
});
