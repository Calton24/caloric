/**
 * Onboarding Step 7 — Plan Calculation
 *
 * Anticipation / loading screen. Shows an animated "weight loss curve"
 * descending from current weight to goal weight, with a pulsing progress
 * label. Auto-advances after ~3 seconds.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/useTheme";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

const STEPS = [
  "Analyzing body composition…",
  "Computing daily energy needs…",
  "Building macro split…",
  "Optimizing meal timing…",
  "Finalizing your plan…",
];

export default function OnboardingCalculatingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { calculatePlan } = useOnboarding();
  const [stepIdx, setStepIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const navigated = useRef(false);

  // Pulsing dot opacity
  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 600 }),
        withTiming(1, { duration: 600 })
      ),
      -1,
      true
    );
  }, [pulseOpacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Curve reveal animation
  const curveWidth = useSharedValue(0);
  useEffect(() => {
    curveWidth.value = withTiming(100, {
      duration: 3000,
      easing: Easing.out(Easing.cubic),
    });
  }, [curveWidth]);

  const curveStyle = useAnimatedStyle(() => ({
    width: `${curveWidth.value}%`,
  }));

  // Progress + step cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        const next = Math.min(p + 2, 100);
        if (next >= 100 && !navigated.current) {
          navigated.current = true;
          setTimeout(() => {
            try { calculatePlan(); } catch (e) { console.error("Plan calculation failed:", e); }
          router.replace("/onboarding/plan" as any);
          }, 400);
        }
        return next;
      });
    }, 60);

    const stepInterval = setInterval(() => {
      setStepIdx((s) => Math.min(s + 1, STEPS.length - 1));
    }, 600);

    return () => {
      clearInterval(interval);
      clearInterval(stepInterval);
    };
  }, [router]);

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
              Creating your{"\n"}weight plan…
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeIn.duration(600).delay(300)}>
            <TText color="secondary" style={styles.subtitle}>
              Crunching the numbers just for you
            </TText>
          </Animated.View>

          <TSpacer size="xxl" />

          {/* ── Weight curve visualization ── */}
          <Animated.View entering={FadeIn.duration(800).delay(400)}>
            <GlassSurface intensity="light" style={styles.curveCard}>
              {/* Y-axis labels */}
              <View style={styles.yAxis}>
                <TText style={[styles.yLabel, { color: theme.colors.primary }]}>
                  160
                </TText>
                <TText style={[styles.yLabel, { color: theme.colors.success }]}>
                  145
                </TText>
              </View>

              {/* Curve area */}
              <View style={styles.curveArea}>
                {/* Start dot */}
                <View style={[styles.startDot, { top: 0 }]}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                </View>

                {/* Animated curve line (simplified as a diagonal gradient) */}
                <Animated.View style={[styles.curveLine, curveStyle]}>
                  <LinearGradient
                    colors={[theme.colors.primary, theme.colors.success]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.curveGradient}
                  />
                </Animated.View>

                {/* Goal line (dashed) */}
                <View
                  style={[
                    styles.goalLine,
                    {
                      borderColor: theme.colors.success + "44",
                    },
                  ]}
                />

                {/* End dot with pulse */}
                <Animated.View style={[styles.endDot, pulseStyle]}>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: theme.colors.success },
                    ]}
                  />
                </Animated.View>
              </View>
            </GlassSurface>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Step label & progress ── */}
          <Animated.View entering={FadeIn.duration(600).delay(600)}>
            <View style={styles.stepRow}>
              <Animated.View style={pulseStyle}>
                <Ionicons
                  name="ellipse"
                  size={10}
                  color={theme.colors.primary}
                />
              </Animated.View>
              <TText
                style={[styles.stepText, { color: theme.colors.textSecondary }]}
              >
                {STEPS[stepIdx]}
              </TText>
            </View>

            <TSpacer size="md" />

            {/* Progress bar */}
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: theme.colors.border },
              ]}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: `${progress}%` }]}
              />
            </View>

            <TSpacer size="sm" />

            <TText style={[styles.pctText, { color: theme.colors.textMuted }]}>
              {progress}%
            </TText>
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
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 40,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 24,
  },
  curveCard: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 20,
    height: 160,
  },
  yAxis: {
    justifyContent: "space-between",
    marginRight: 12,
    paddingVertical: 4,
  },
  yLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  curveArea: {
    flex: 1,
    position: "relative",
  },
  startDot: {
    position: "absolute",
    left: 0,
    top: 4,
    zIndex: 2,
  },
  endDot: {
    position: "absolute",
    right: 0,
    bottom: 4,
    zIndex: 2,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  curveLine: {
    position: "absolute",
    top: 8,
    left: 4,
    height: "85%",
    overflow: "hidden",
    borderRadius: 4,
  },
  curveGradient: {
    flex: 1,
    width: 4,
  },
  goalLine: {
    position: "absolute",
    bottom: 10,
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 1,
    borderStyle: "dashed",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  stepText: {
    fontSize: 15,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },
  pctText: {
    fontSize: 13,
    textAlign: "center",
  },
});
