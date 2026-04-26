/**
 * Onboarding Step 5 — Goal Weight
 *
 * Shows current weight vs goal weight with ± stepper,
 * BMI category indicator, and a visual bar-chart comparison.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    LayoutChangeEvent,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnits } from "../../hooks/useUnits";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import { haptics } from "../../src/infrastructure/haptics";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { convertWeight } from "../../src/lib/utils/units";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingBackground } from "./_background";
import { OnboardingCTA } from "./_cta";
import { OnboardingHeader } from "./_progress";

// ── Unit toggle (same as body.tsx) ──────────────────────────────

type MeasurementSystem = "imperial" | "metric";

function UnitToggle({
  system,
  onToggle,
  theme,
}: {
  system: MeasurementSystem;
  onToggle: (target: MeasurementSystem) => void;
  theme: ReturnType<typeof useTheme>["theme"];
}) {
  const { t } = useAppTranslation();
  const [containerWidth, setContainerWidth] = useState(0);
  const padding = 4;
  const halfWidth = containerWidth > 0 ? (containerWidth - padding * 2) / 2 : 0;
  const slideX = useSharedValue(system === "imperial" ? 0 : halfWidth);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: slideX.value }],
    width: halfWidth > 0 ? halfWidth : "50%",
  }));

  const handleLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    setContainerWidth(w);
    const half = (w - padding * 2) / 2;
    slideX.value = system === "imperial" ? 0 : half;
  };

  const handlePress = (target: MeasurementSystem) => {
    if (target === system) return;
    const half = (containerWidth - padding * 2) / 2;
    slideX.value = withTiming(target === "imperial" ? 0 : half, {
      duration: 250,
    });
    onToggle(target);
  };

  return (
    <GlassSurface intensity="light" style={styles.toggleRow}>
      <View onLayout={handleLayout} style={styles.toggleInner}>
        <Animated.View style={[styles.toggleIndicator, indicatorStyle]}>
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.toggleGradient}
          />
        </Animated.View>
        <Pressable
          onPress={() => handlePress("imperial")}
          style={styles.toggleBtn}
        >
          <TText
            style={[
              styles.toggleText,
              {
                color:
                  system === "imperial" ? "#fff" : theme.colors.textSecondary,
              },
            ]}
          >
            {t("onboarding.body.imperial")}
          </TText>
        </Pressable>
        <Pressable
          onPress={() => handlePress("metric")}
          style={styles.toggleBtn}
        >
          <TText
            style={[
              styles.toggleText,
              {
                color:
                  system === "metric" ? "#fff" : theme.colors.textSecondary,
              },
            ]}
          >
            {t("onboarding.body.metric")}
          </TText>
        </Pressable>
      </View>
    </GlassSurface>
  );
}

// BMI helper using actual user height
function getBmiCategory(
  weightLbs: number,
  heightCm: number | null
): {
  label: string;
  color: string;
} {
  const heightM = heightCm ? heightCm / 100 : 1.73; // fallback ~5'8"
  const weightKg = weightLbs * 0.4536;
  const bmi = weightKg / (heightM * heightM);
  if (bmi < 18.5)
    return { label: "onboarding.weightGoal.underweight", color: "#60A5FA" };
  if (bmi < 25)
    return { label: "onboarding.weightGoal.normal", color: "#34D399" };
  if (bmi < 30)
    return { label: "onboarding.weightGoal.overweight", color: "#FBBF24" };
  return { label: "onboarding.weightGoal.obese", color: "#F87171" };
}

export default function OnboardingWeightGoalScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const units = useUnits();
  const router = useRouter();
  const { profile, goalType, saveGoalWeight } = useOnboarding();
  const currentWeight = Number(units.display(profile.currentWeightLbs ?? 160));

  // Sensible absolute bounds (in display units)
  const MIN_WEIGHT = units.isMetric ? 30 : 66;
  const MAX_WEIGHT = units.isMetric ? 250 : 550;
  const step = units.step; // 0.1 kg or 1 lb

  // Smart default based on goal direction
  const defaultGoal = (() => {
    if (profile.goalWeightLbs) {
      return Number(units.display(profile.goalWeightLbs));
    }
    const cw = profile.currentWeightLbs ?? 160;
    switch (goalType) {
      case "gain":
        return Number(units.display(Math.round(cw * 1.1)));
      case "maintain":
        return Number(units.display(cw));
      case "lose":
      default:
        return Number(units.display(Math.round(cw * 0.9)));
    }
  })();

  const [goalWeight, setGoalWeight] = useState(defaultGoal);

  const system: MeasurementSystem = units.isMetric ? "metric" : "imperial";

  const handleUnitToggle = (target: MeasurementSystem) => {
    // Convert current goalWeight to lbs first, then to the new display unit
    const inLbs = units.toLbs(goalWeight);
    const newUnit = target === "metric" ? "kg" : "lbs";
    units.setWeightUnit(newUnit);
    // Convert manually since hooks won't re-derive synchronously within this handler
    const converted = Number(convertWeight(inLbs, newUnit).toFixed(1));
    setGoalWeight(converted);
  };

  const diff = Math.round((currentWeight - goalWeight) * 10) / 10;
  const absDiff = Math.abs(diff);
  const bmi = getBmiCategory(units.toLbs(goalWeight), profile.heightCm);

  // Bar heights (relative to max)
  const maxBar = Math.max(currentWeight, goalWeight);
  const currentPct = (currentWeight / maxBar) * 100;
  const goalPct = (goalWeight / maxBar) * 100;

  return (
    <OnboardingBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <OnboardingHeader step={4} total={7} theme={theme} />

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              {t("onboarding.weightGoal.heading")}
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <TText color="secondary" style={styles.description}>
              {t("onboarding.weightGoal.description")}
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Unit toggle ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(250)}>
            <UnitToggle
              system={system}
              onToggle={handleUnitToggle}
              theme={theme}
            />
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Weight stepper ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(350)}>
            <GlassSurface intensity="light" style={styles.stepperCard}>
              <Pressable
                onPress={() => {
                  haptics.impact("light");
                  setGoalWeight(
                    Math.round(Math.max(MIN_WEIGHT, goalWeight - step) * 10) /
                      10
                  );
                }}
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
                    {t("onboarding.weightGoal.bmiDisplay", {
                      label: t(bmi.label),
                    })}
                  </TText>
                </View>
              </View>
              <Pressable
                onPress={() => {
                  haptics.impact("light");
                  setGoalWeight(
                    Math.round(Math.min(MAX_WEIGHT, goalWeight + step) * 10) /
                      10
                  );
                }}
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
          <Animated.View entering={FadeInUp.duration(500).delay(500)}>
            <GlassSurface intensity="light" style={styles.chartCard}>
              <TText
                style={[
                  styles.chartTitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("onboarding.weightGoal.comparison")}
              </TText>
              <TSpacer size="md" />
              <View style={styles.barChart}>
                {/* Current */}
                <View style={styles.barCol}>
                  <TText
                    style={[
                      styles.barValue,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {currentWeight}
                  </TText>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${currentPct}%`,
                          backgroundColor: theme.colors.textMuted + "44",
                          borderRadius: 8,
                        },
                      ]}
                    />
                  </View>
                  <TText
                    style={[styles.barLabel, { color: theme.colors.textMuted }]}
                  >
                    {t("onboarding.weightGoal.current")}
                  </TText>
                </View>

                {/* Goal */}
                <View style={styles.barCol}>
                  <TText
                    style={[styles.barValue, { color: theme.colors.accent }]}
                  >
                    {goalWeight}
                  </TText>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: `${goalPct}%`,
                          backgroundColor: theme.colors.accent,
                          borderRadius: 8,
                        },
                      ]}
                    />
                  </View>
                  <TText
                    style={[
                      styles.barLabel,
                      { color: theme.colors.textMuted, fontWeight: "700" },
                    ]}
                  >
                    {t("onboarding.weightGoal.goal")}
                  </TText>
                </View>
              </View>

              {diff > 0 && (
                <>
                  <TSpacer size="md" />
                  <View
                    style={[
                      styles.diffPill,
                      { backgroundColor: theme.colors.accent + "1A" },
                    ]}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color={theme.colors.accent}
                    />
                    <TText
                      style={[styles.diffText, { color: theme.colors.accent }]}
                    >
                      {t("onboarding.weightGoal.toLose", {
                        count: absDiff,
                        unit: units.label,
                      })}
                    </TText>
                  </View>
                </>
              )}
              {diff < 0 && (
                <>
                  <TSpacer size="md" />
                  <View
                    style={[
                      styles.diffPill,
                      { backgroundColor: theme.colors.primary + "1A" },
                    ]}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={16}
                      color={theme.colors.primary}
                    />
                    <TText
                      style={[styles.diffText, { color: theme.colors.primary }]}
                    >
                      {t("onboarding.weightGoal.toGain", {
                        count: absDiff,
                        unit: units.label,
                      })}
                    </TText>
                  </View>
                </>
              )}
              {diff === 0 && (
                <>
                  <TSpacer size="md" />
                  <View
                    style={[
                      styles.diffPill,
                      { backgroundColor: theme.colors.textMuted + "1A" },
                    ]}
                  >
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                    <TText
                      style={[
                        styles.diffText,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t("onboarding.weightGoal.atTarget")}
                    </TText>
                  </View>
                </>
              )}
            </GlassSurface>
          </Animated.View>

          <TSpacer size="xl" />
        </ScrollView>

        {/* Bottom CTA */}
        <OnboardingCTA
          label={t("common.continue")}
          onPress={() => {
            saveGoalWeight(units.toLbs(goalWeight));
            router.push("/(onboarding)/timeframe" as any);
          }}
          theme={theme}
          testID="onboarding-next-weight"
        />
      </SafeAreaView>
    </OnboardingBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
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
  toggleRow: {
    borderRadius: 14,
    padding: 4,
  },
  toggleInner: {
    flexDirection: "row",
    position: "relative",
  },
  toggleIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 10,
    overflow: "hidden",
  },
  toggleGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    zIndex: 1,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
