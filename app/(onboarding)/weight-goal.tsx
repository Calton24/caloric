/**
 * Onboarding Step 5 — Goal Weight
 *
 * Shows current weight vs goal weight with ± stepper,
 * BMI category indicator, and a visual bar-chart comparison.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnits } from "../../hooks/useUnits";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TButton } from "../../src/ui/primitives/TButton";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingHeader } from "./_progress";

// Simple BMI helper (for demo — uses hardcoded 5'8" height)
function getBmiCategory(weightLbs: number): {
  label: string;
  color: string;
} {
  const heightM = 1.73; // ~5'8"
  const weightKg = weightLbs * 0.4536;
  const bmi = weightKg / (heightM * heightM);
  if (bmi < 18.5) return { label: "Underweight", color: "#60A5FA" };
  if (bmi < 25) return { label: "Normal", color: "#34D399" };
  if (bmi < 30) return { label: "Overweight", color: "#FBBF24" };
  return { label: "Obese", color: "#F87171" };
}

export default function OnboardingWeightGoalScreen() {
  const { theme } = useTheme();
  const units = useUnits();
  const router = useRouter();
  const { profile, saveGoalWeight } = useOnboarding();
  const currentWeight = Number(units.display(profile.currentWeightLbs ?? 160));
  const [goalWeight, setGoalWeight] = useState(
    Number(
      units.display(
        profile.goalWeightLbs ??
          Math.round((profile.currentWeightLbs ?? 160) * 0.9)
      )
    )
  );

  const diff = currentWeight - goalWeight;
  const bmi = getBmiCategory(units.toLbs(goalWeight));

  // Bar heights (relative to max)
  const maxBar = Math.max(currentWeight, goalWeight);
  const currentPct = (currentWeight / maxBar) * 100;
  const goalPct = (goalWeight / maxBar) * 100;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <OnboardingHeader step={4} total={6} theme={theme} />

          <TSpacer size="xl" />

          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              What&apos;s your{"\n"}goal weight?
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <TText color="secondary" style={styles.description}>
              Set a target that feels right for you.
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Weight stepper ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <GlassSurface intensity="light" style={styles.stepperCard}>
              <Pressable
                onPress={() => setGoalWeight(Math.max(80, goalWeight - 1))}
                style={[
                  styles.stepperBtn,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Ionicons name="remove" size={24} color={theme.colors.text} />
              </Pressable>
              <View style={styles.stepperCenter}>
                <TText
                  style={[styles.stepperNum, { color: theme.colors.text }]}
                >
                  {goalWeight}
                </TText>
                <TText
                  style={[
                    styles.stepperUnit,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {units.label}
                </TText>
                <TSpacer size="xs" />
                <View
                  style={[
                    styles.bmiPill,
                    { backgroundColor: bmi.color + "22" },
                  ]}
                >
                  <View
                    style={[styles.bmiDot, { backgroundColor: bmi.color }]}
                  />
                  <TText style={[styles.bmiLabel, { color: bmi.color }]}>
                    BMI: {bmi.label}
                  </TText>
                </View>
              </View>
              <Pressable
                onPress={() => setGoalWeight(Math.min(400, goalWeight + 1))}
                style={[
                  styles.stepperBtn,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Ionicons name="add" size={24} color={theme.colors.text} />
              </Pressable>
            </GlassSurface>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Visual comparison bars ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(450)}>
            <GlassSurface intensity="light" style={styles.chartCard}>
              <TText
                style={[
                  styles.chartTitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Weight comparison
              </TText>
              <TSpacer size="md" />
              <View style={styles.barChart}>
                {/* Current */}
                <View style={styles.barCol}>
                  <TText
                    style={[styles.barValue, { color: theme.colors.primary }]}
                  >
                    {currentWeight}
                  </TText>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${currentPct}%`,
                          backgroundColor: theme.colors.primary,
                          borderRadius: 8,
                        },
                      ]}
                    />
                  </View>
                  <TText
                    style={[styles.barLabel, { color: theme.colors.textMuted }]}
                  >
                    Current
                  </TText>
                </View>

                {/* Goal */}
                <View style={styles.barCol}>
                  <TText
                    style={[styles.barValue, { color: theme.colors.success }]}
                  >
                    {goalWeight}
                  </TText>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${goalPct}%`,
                          backgroundColor: theme.colors.success,
                          borderRadius: 8,
                        },
                      ]}
                    />
                  </View>
                  <TText
                    style={[styles.barLabel, { color: theme.colors.textMuted }]}
                  >
                    Goal
                  </TText>
                </View>
              </View>

              {diff > 0 && (
                <>
                  <TSpacer size="md" />
                  <View
                    style={[
                      styles.diffPill,
                      { backgroundColor: theme.colors.success + "1A" },
                    ]}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color={theme.colors.success}
                    />
                    <TText
                      style={[styles.diffText, { color: theme.colors.success }]}
                    >
                      {diff} {units.label} to lose
                    </TText>
                  </View>
                </>
              )}
            </GlassSurface>
          </Animated.View>

          <TSpacer size="xl" />
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.footer}>
          <TButton
            onPress={() => {
              saveGoalWeight(units.toLbs(goalWeight));
              router.push("/(onboarding)/timeframe" as any);
            }}
            size="lg"
            testID="onboarding-next-weight"
          >
            Continue
          </TButton>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 40,
  },
  description: {
    fontSize: 17,
    lineHeight: 24,
  },
  stepperCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 20,
  },
  stepperBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperCenter: {
    alignItems: "center",
  },
  stepperNum: {
    fontSize: 42,
    fontWeight: "800",
    letterSpacing: -1,
  },
  stepperUnit: {
    fontSize: 14,
    marginTop: -2,
  },
  bmiPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    gap: 5,
    marginTop: 4,
  },
  bmiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  bmiLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  chartCard: {
    padding: 20,
    borderRadius: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  barChart: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    height: 140,
  },
  barCol: {
    alignItems: "center",
    justifyContent: "flex-end",
    width: 60,
  },
  barTrack: {
    width: 48,
    height: 100,
    justifyContent: "flex-end",
  },
  bar: {
    width: "100%",
  },
  barValue: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 6,
  },
  barLabel: {
    fontSize: 13,
    marginTop: 6,
  },
  diffPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    gap: 4,
  },
  diffText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
});
