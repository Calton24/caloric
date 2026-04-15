/**
 * Onboarding Step 10 — Completion Celebration
 *
 * Food emoji explosion, green checkmark, "You're All Set Up!",
 * and "Let's Go!" CTA that replaces into the main tabs.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnits } from "../../hooks/useUnits";
import { useGoalsStore } from "../../src/features/goals/goals.store";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

// ── Food emoji ring ──
const FOOD_EMOJIS = [
  "🍎",
  "🥑",
  "🍗",
  "🥦",
  "🍳",
  "🥗",
  "🍇",
  "🥕",
  "🍌",
  "🐟",
  "🍊",
  "🥩",
];

function FloatingEmoji({
  emoji,
  index,
  total,
}: {
  emoji: string;
  index: number;
  total: number;
}) {
  const angle = (index / total) * 2 * Math.PI - Math.PI / 2;
  const radius = 130;
  const tx = Math.cos(angle) * radius;
  const ty = Math.sin(angle) * radius;

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    scale.value = withDelay(
      200 + index * 60,
      withSpring(1, { damping: 8, stiffness: 120 })
    );
    opacity.value = withDelay(
      200 + index * 60,
      withTiming(1, { duration: 300 })
    );
  }, [index, opacity, scale]);

  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx }, { translateY: ty }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.emojiAbsolute, aStyle]}>
      <TText style={styles.emojiText}>{emoji}</TText>
    </Animated.View>
  );
}

export default function OnboardingCompleteScreen() {
  const { theme } = useTheme();
  const units = useUnits();
  const router = useRouter();
  const { completeOnboarding, profile } = useOnboarding();
  const plan = useGoalsStore((s) => s.plan);

  // Checkmark scale-in
  const checkScale = useSharedValue(0);
  useEffect(() => {
    checkScale.value = withDelay(
      600,
      withSpring(1, { damping: 6, stiffness: 100 })
    );
  }, [checkScale]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  // Confetti ring rotation
  const ringRotation = useSharedValue(0);
  useEffect(() => {
    ringRotation.value = withTiming(360, {
      duration: 60000,
      easing: Easing.linear,
    });
  }, [ringRotation]);

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${ringRotation.value}deg` }],
  }));

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.content}>
          {/* ── Emoji explosion ring + check ── */}
          <View style={styles.celebrationArea}>
            <Animated.View style={[styles.emojiRing, ringStyle]}>
              {FOOD_EMOJIS.map((e, i) => (
                <FloatingEmoji
                  key={i}
                  emoji={e}
                  index={i}
                  total={FOOD_EMOJIS.length}
                />
              ))}
            </Animated.View>

            <Animated.View style={[styles.checkCircle, checkStyle]}>
              <View
                style={[
                  styles.checkBg,
                  { backgroundColor: theme.colors.success + "22" },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={72}
                  color={theme.colors.success}
                />
              </View>
            </Animated.View>
          </View>

          <TSpacer size="xl" />

          <Animated.View entering={FadeInDown.duration(600).delay(800)}>
            <TText
              variant="heading"
              style={[styles.title, { color: theme.colors.text }]}
            >
              You&apos;re All Set Up!
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeIn.duration(600).delay(1000)}>
            <TText color="secondary" style={styles.subtitle}>
              Your personalised plan is ready.{"\n"}Time to start your journey.
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Summary pills ── */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(1200)}
            style={styles.pillRow}
          >
            {[
              {
                icon: "flame-outline" as const,
                label: `${plan?.calorieBudget?.toLocaleString() ?? "—"} kcal/day`,
                color: theme.colors.primary,
              },
              {
                icon: "trending-down-outline" as const,
                label: `${units.format(profile.goalWeightLbs ?? 0, 0)} goal`,
                color: theme.colors.success,
              },
              {
                icon: "calendar-outline" as const,
                label: `${plan?.timeframeWeeks ?? "—"} weeks`,
                color: theme.colors.info,
              },
            ].map((p) => (
              <GlassSurface key={p.label} intensity="light" style={styles.pill}>
                <Ionicons name={p.icon} size={16} color={p.color} />
                <TText style={[styles.pillLabel, { color: theme.colors.text }]}>
                  {p.label}
                </TText>
              </GlassSurface>
            ))}
          </Animated.View>
        </View>

        {/* ── CTA ── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(1400)}
          style={styles.ctaArea}
        >
          <Pressable
            testID="onboarding-done"
            onPress={() => {
              completeOnboarding();
              router.replace("/permissions" as any);
            }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <TText
                style={[styles.ctaText, { color: theme.colors.textInverse }]}
              >
                Let&apos;s Go!
              </TText>
              <Ionicons
                name="rocket-outline"
                size={20}
                color={theme.colors.textInverse}
              />
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, justifyContent: "space-between" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  // Celebration
  celebrationArea: {
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiRing: {
    position: "absolute",
    width: 280,
    height: 280,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiAbsolute: {
    position: "absolute",
  },
  emojiText: {
    fontSize: 28,
  },
  checkCircle: {
    zIndex: 10,
  },
  checkBg: {
    width: 110,
    height: 110,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  // Text
  title: {
    fontSize: 34,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 24,
  },
  // Pills
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 100,
    gap: 6,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  // CTA
  ctaArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 8,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
