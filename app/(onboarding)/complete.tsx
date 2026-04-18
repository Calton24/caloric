/**
 * Onboarding Step 10 — Completion Celebration
 *
 * Food emoji explosion, green checkmark, "You're All Set Up!",
 * and "Let's Go!" CTA that replaces into the main tabs.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
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
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingBackground } from "./_background";
import { OnboardingCTA } from "./_cta";

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
  const { t } = useAppTranslation();
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
    <OnboardingBackground>
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

            <Animated.View style={[styles.checkCircleWrap, checkStyle]}>
              <View
                style={[
                  styles.checkBg,
                  { backgroundColor: theme.colors.success + "18" },
                ]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={80}
                  color={theme.colors.success}
                />
              </View>
            </Animated.View>
          </View>

          <View style={{ height: 32 }} />

          <Animated.View
            entering={FadeInDown.springify().damping(16).delay(800)}
          >
            <TText
              variant="heading"
              style={[styles.title, { color: theme.colors.text }]}
            >
              {t("onboarding.complete.heading")}
            </TText>
          </Animated.View>

          <View style={{ height: 10 }} />

          <Animated.View entering={FadeIn.duration(600).delay(1000)}>
            <TText
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              {t("onboarding.complete.subtitle")}
            </TText>
          </Animated.View>

          <View style={{ height: 28 }} />

          {/* ── Summary pills ── */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(1200)}
            style={styles.pillRow}
          >
            {[
              {
                icon: "flame-outline" as const,
                label: t("onboarding.complete.kcalDay", {
                  count: plan?.calorieBudget ?? 0,
                }),
                color: theme.colors.primary,
              },
              {
                icon: "trending-down-outline" as const,
                label: t("onboarding.complete.goalWeight", {
                  weight: units.format(profile.goalWeightLbs ?? 0, 0),
                }),
                color: theme.colors.success,
              },
              {
                icon: "calendar-outline" as const,
                label: t("onboarding.complete.weeksLeft", {
                  count: plan?.timeframeWeeks ?? 0,
                }),
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
        <OnboardingCTA
          label={t("common.letsGo")}
          icon="rocket-outline"
          onPress={() => {
            completeOnboarding();
            router.replace("/(modals)/permissions-setup" as any);
          }}
          theme={theme}
          testID="onboarding-done"
          delay={1400}
        />
      </SafeAreaView>
    </OnboardingBackground>
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
  checkCircleWrap: {
    zIndex: 10,
  },
  checkBg: {
    width: 120,
    height: 120,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 100,
    gap: 6,
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
});
