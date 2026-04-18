/**
 * Onboarding Step 7 — Plan Calculation
 *
 * Premium anticipation screen. Shows an animated circular progress ring,
 * sequential step checkmarks, and a bold weight journey summary.
 * Auto-advances after ~3 seconds.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import { useUnits } from "../../hooks/useUnits";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TText } from "../../src/ui/primitives/TText";

const STEP_KEYS = [
  "onboarding.calculating.step1",
  "onboarding.calculating.step2",
  "onboarding.calculating.step3",
  "onboarding.calculating.step4",
  "onboarding.calculating.step5",
];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING_SIZE = 160;
const RING_STROKE = 8;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default function OnboardingCalculatingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useAppTranslation();
  const units = useUnits();
  const { calculatePlan, profile } = useOnboarding();
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const navigated = useRef(false);

  const currentDisplay = Number(units.display(profile.currentWeightLbs ?? 160));
  const goalDisplay = Number(
    units.display(
      profile.goalWeightLbs ??
        Math.round((profile.currentWeightLbs ?? 160) * 0.9)
    )
  );

  // Pulsing glow
  const glowOpacity = useSharedValue(0.4);
  useEffect(() => {
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 800 }),
        withTiming(0.4, { duration: 800 })
      ),
      -1,
      true
    );
  }, [glowOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Ring progress value
  const ringProgress = useSharedValue(RING_CIRCUMFERENCE);
  useEffect(() => {
    ringProgress.value = withTiming(0, { duration: 3200 });
  }, [ringProgress]);

  const ringAnimatedProps = useAnimatedProps(() => ({
    strokeDashoffset: ringProgress.value,
  }));

  // Progress + step cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + 2, 100);
        if (next >= 100 && !navigated.current) {
          navigated.current = true;
          setTimeout(() => {
            try {
              calculatePlan();
            } catch (e) {
              console.error("Plan calculation failed:", e);
            }
            router.replace("/(onboarding)/plan" as any);
          }, 400);
        }
        return next;
      });
    }, 60);

    const stepInterval = setInterval(() => {
      setStepIdx((s) => Math.min(s + 1, STEP_KEYS.length - 1));
    }, 600);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, [router]);

  // Step check scale
  const stepScales = STEP_KEYS.map(() => useSharedValue(0));
  useEffect(() => {
    if (stepIdx < stepScales.length) {
      stepScales[stepIdx].value = withSpring(1, {
        damping: 12,
        stiffness: 200,
      });
    }
  }, [stepIdx]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.content}>
          {/* ── Heading ── */}
          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              {t("onboarding.calculating.heading")}
            </TText>
          </Animated.View>

          <View style={{ height: 8 }} />

          <Animated.View entering={FadeIn.duration(600).delay(300)}>
            <TText
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              {t("onboarding.calculating.subtitle")}
            </TText>
          </Animated.View>

          <View style={{ height: 40 }} />

          {/* ── Circular ring + weight journey ── */}
          <Animated.View
            entering={FadeIn.duration(800).delay(350)}
            style={styles.ringContainer}
          >
            {/* Glow behind ring */}
            <Animated.View
              style={[
                styles.ringGlow,
                { backgroundColor: theme.colors.primary },
                glowStyle,
              ]}
            />

            <Svg width={RING_SIZE} height={RING_SIZE}>
              {/* Track */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={theme.colors.border + "30"}
                strokeWidth={RING_STROKE}
                fill="none"
              />
              {/* Fill */}
              <AnimatedCircle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RING_RADIUS}
                stroke={theme.colors.primary}
                strokeWidth={RING_STROKE}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                animatedProps={ringAnimatedProps}
                rotation="-90"
                origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
              />
            </Svg>

            {/* Center text */}
            <View style={styles.ringCenter}>
              <TText style={[styles.ringPct, { color: theme.colors.text }]}>
                {progress}%
              </TText>
            </View>
          </Animated.View>

          <View style={{ height: 32 }} />

          {/* ── Weight journey pill ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(500)}>
            <GlassSurface intensity="light" style={styles.journeyCard}>
              <View style={styles.journeyCol}>
                <TText
                  style={[
                    styles.journeyLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("onboarding.weightGoal.current")}
                </TText>
                <TText
                  style={[styles.journeyWeight, { color: theme.colors.text }]}
                >
                  {currentDisplay}
                  <TText
                    style={[
                      styles.journeyUnit,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {" "}
                    {units.label}
                  </TText>
                </TText>
              </View>
              <View
                style={[
                  styles.journeyArrow,
                  { backgroundColor: theme.colors.primary + "15" },
                ]}
              >
                <Ionicons
                  name="arrow-forward"
                  size={18}
                  color={theme.colors.primary}
                />
              </View>
              <View style={[styles.journeyCol, { alignItems: "flex-end" }]}>
                <TText
                  style={[
                    styles.journeyLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("onboarding.weightGoal.goal")}
                </TText>
                <TText
                  style={[
                    styles.journeyWeight,
                    { color: theme.colors.success },
                  ]}
                >
                  {goalDisplay}
                  <TText
                    style={[
                      styles.journeyUnit,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {" "}
                    {units.label}
                  </TText>
                </TText>
              </View>
            </GlassSurface>
          </Animated.View>

          <View style={{ height: 32 }} />

          {/* ── Step checklist ── */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(600)}
            style={styles.stepList}
          >
            {STEP_KEYS.map((key, i) => {
              const isDone = i <= stepIdx;
              const isActive = i === stepIdx;
              const animStyle = useAnimatedStyle(() => ({
                transform: [{ scale: stepScales[i].value }],
              }));
              return (
                <View key={i} style={styles.stepRow}>
                  {isDone ? (
                    <Animated.View style={animStyle}>
                      <View
                        style={[
                          styles.stepCheck,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Ionicons name="checkmark" size={12} color="#fff" />
                      </View>
                    </Animated.View>
                  ) : (
                    <View
                      style={[
                        styles.stepCheck,
                        {
                          backgroundColor: "transparent",
                          borderWidth: 2,
                          borderColor: theme.colors.border,
                        },
                      ]}
                    />
                  )}
                  <TText
                    style={[
                      styles.stepText,
                      {
                        color: isDone
                          ? theme.colors.text
                          : theme.colors.textMuted,
                        fontWeight: isActive ? "700" : "400",
                      },
                    ]}
                  >
                    {t(key)}
                  </TText>
                </View>
              );
            })}
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    alignItems: "center",
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
  },
  ringContainer: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  ringGlow: {
    position: "absolute",
    width: RING_SIZE + 40,
    height: RING_SIZE + 40,
    borderRadius: (RING_SIZE + 40) / 2,
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ringPct: {
    fontSize: 36,
    fontWeight: "800",
    letterSpacing: -1,
  },
  journeyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    borderRadius: 16,
    width: "100%",
  },
  journeyCol: {
    flex: 1,
  },
  journeyLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  journeyWeight: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  journeyUnit: {
    fontSize: 14,
    fontWeight: "500",
  },
  journeyArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 12,
  },
  stepList: {
    width: "100%",
    gap: 14,
    paddingHorizontal: 8,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  stepText: {
    fontSize: 15,
  },
});
