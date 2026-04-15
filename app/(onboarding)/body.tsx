/**
 * Onboarding Step 3 — Body Data
 *
 * Collects gender, age, height, and weight.
 * Includes Metric/Imperial toggle with real-time conversion.
 * Haptic feedback on all stepper buttons.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import { useProfileStore } from "../../src/features/profile/profile.store";
import { haptics } from "../../src/infrastructure/haptics";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TButton } from "../../src/ui/primitives/TButton";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingHeader } from "./_progress";

type MeasurementSystem = "imperial" | "metric";

const GENDERS = [
  { id: "male", icon: "male-outline" as const, label: "Male" },
  { id: "female", icon: "female-outline" as const, label: "Female" },
] as const;

// ── Conversion helpers ──

const LBS_PER_KG = 2.20462;
const CM_PER_INCH = 2.54;
const CM_PER_FOOT = 30.48;

function feetInchesToCm(ft: number, inches: number): number {
  return Math.round(ft * CM_PER_FOOT + inches * CM_PER_INCH);
}

function cmToFeetInches(cm: number): { ft: number; inches: number } {
  const totalInches = cm / CM_PER_INCH;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { ft, inches: inches >= 12 ? 11 : inches };
}

function lbsToKg(lbs: number): number {
  return Math.round(lbs / LBS_PER_KG);
}

function kgToLbs(kg: number): number {
  return Math.round(kg * LBS_PER_KG);
}

export default function OnboardingBodyScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { profile, saveBodyMeasurements } = useOnboarding();
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [gender, setGender] = useState<string | null>(profile.gender);
  const [age, setAge] = useState(28);
  const [system, setSystem] = useState<MeasurementSystem>(
    profile.weightUnit === "kg" ? "metric" : "imperial"
  );

  // Animation values for toggle buttons
  const imperialScale = useSharedValue(profile.weightUnit === "kg" ? 0.95 : 1);
  const imperialOpacity = useSharedValue(profile.weightUnit === "kg" ? 0 : 1);
  const metricScale = useSharedValue(profile.weightUnit === "kg" ? 1 : 0.95);
  const metricOpacity = useSharedValue(profile.weightUnit === "kg" ? 1 : 0);

  // Height stored internally as cm for accurate conversion
  const [heightCm, setHeightCm] = useState(
    feetInchesToCm(5, 8) // default 5'8"
  );

  // Weight stored internally as lbs for accurate conversion
  const [weightLbs, setWeightLbs] = useState(profile.currentWeightLbs ?? 160);

  // Derived display values
  const { ft: heightFt, inches: heightIn } = cmToFeetInches(heightCm);
  const displayWeight = system === "imperial" ? weightLbs : lbsToKg(weightLbs);
  const weightLabel = system === "imperial" ? "lbs" : "kg";

  const isValid = gender !== null && age > 0 && displayWeight > 0;

  // Haptic stepper helper
  const step = useCallback((setter: () => void) => {
    haptics.impact("light");
    setter();
  }, []);

  // Toggle system with real-time conversion (values stay the same, just display changes)
  const toggleSystem = useCallback(() => {
    haptics.impact("medium");
    setSystem((prev) => {
      const next = prev === "imperial" ? "metric" : "imperial";
      if (next === "imperial") {
        imperialOpacity.value = withSpring(1, { damping: 15, stiffness: 200 });
        imperialScale.value = withSpring(1, { damping: 15, stiffness: 200 });
        metricOpacity.value = withSpring(0, { damping: 15, stiffness: 200 });
        metricScale.value = withSpring(0.95, { damping: 15, stiffness: 200 });
      } else {
        imperialOpacity.value = withSpring(0, { damping: 15, stiffness: 200 });
        imperialScale.value = withSpring(0.95, {
          damping: 15,
          stiffness: 200,
        });
        metricOpacity.value = withSpring(1, { damping: 15, stiffness: 200 });
        metricScale.value = withSpring(1, { damping: 15, stiffness: 200 });
      }
      return next;
    });
  }, [imperialOpacity, imperialScale, metricOpacity, metricScale]);

  // Animated styles for toggle buttons
  const imperialBgStyle = useAnimatedStyle(() => ({
    opacity: imperialOpacity.value,
    transform: [{ scale: imperialScale.value }],
  }));

  const metricBgStyle = useAnimatedStyle(() => ({
    opacity: metricOpacity.value,
    transform: [{ scale: metricScale.value }],
  }));

  // Height steppers
  const incHeightFt = () => {
    const next = cmToFeetInches(heightCm);
    setHeightCm(feetInchesToCm(Math.min(8, next.ft + 1), next.inches));
  };
  const decHeightFt = () => {
    const next = cmToFeetInches(heightCm);
    setHeightCm(feetInchesToCm(Math.max(3, next.ft - 1), next.inches));
  };
  const incHeightIn = () => {
    const next = cmToFeetInches(heightCm);
    if (next.inches >= 11) return;
    setHeightCm(feetInchesToCm(next.ft, next.inches + 1));
  };
  const decHeightIn = () => {
    const next = cmToFeetInches(heightCm);
    if (next.inches <= 0) return;
    setHeightCm(feetInchesToCm(next.ft, next.inches - 1));
  };
  const incHeightCm = () => setHeightCm((h) => Math.min(250, h + 1));
  const decHeightCm = () => setHeightCm((h) => Math.max(100, h - 1));

  // Weight steppers
  const incWeight = () => {
    if (system === "imperial") {
      setWeightLbs((w) => Math.min(500, w + 1));
    } else {
      setWeightLbs((w) => Math.min(500, w + LBS_PER_KG));
    }
  };
  const decWeight = () => {
    if (system === "imperial") {
      setWeightLbs((w) => Math.max(60, w - 1));
    } else {
      setWeightLbs((w) => Math.max(60, w - LBS_PER_KG));
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <OnboardingHeader step={2} total={6} theme={theme} />

            <TSpacer size="lg" />

            <Animated.View entering={FadeInDown.duration(500).delay(100)}>
              <TText
                variant="heading"
                style={[styles.heading, { color: theme.colors.text }]}
              >
                Tell us about{"\n"}yourself
              </TText>
            </Animated.View>

            <TSpacer size="sm" />

            <Animated.View entering={FadeInDown.duration(500).delay(200)}>
              <TText color="secondary" style={styles.description}>
                We need this to calculate your daily calorie needs.
              </TText>
            </Animated.View>

            <TSpacer size="lg" />

            {/* ── Metric / Imperial Toggle ── */}
            <Animated.View entering={FadeInDown.duration(400).delay(250)}>
              <View
                style={[
                  styles.toggleRow,
                  { backgroundColor: theme.colors.surface, borderRadius: 12 },
                ]}
              >
                <Pressable
                  onPress={() => {
                    if (system !== "imperial") toggleSystem();
                  }}
                  style={({ pressed }) => [
                    styles.toggleBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.toggleBtnBg,
                      { backgroundColor: theme.colors.primary },
                      imperialBgStyle,
                    ]}
                  />
                  <TText
                    style={[
                      styles.toggleText,
                      {
                        color:
                          system === "imperial"
                            ? "#fff"
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    Imperial
                  </TText>
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (system !== "metric") toggleSystem();
                  }}
                  style={({ pressed }) => [
                    styles.toggleBtn,
                    { opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Animated.View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.toggleBtnBg,
                      { backgroundColor: theme.colors.primary },
                      metricBgStyle,
                    ]}
                  />
                  <TText
                    style={[
                      styles.toggleText,
                      {
                        color:
                          system === "metric"
                            ? "#fff"
                            : theme.colors.textSecondary,
                      },
                    ]}
                  >
                    Metric
                  </TText>
                </Pressable>
              </View>
            </Animated.View>

            <TSpacer size="lg" />

            {/* ── Gender ── */}
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <TText
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Gender
              </TText>
              <TSpacer size="sm" />
              <View style={styles.genderRow}>
                {GENDERS.map((g) => {
                  const isActive = gender === g.id;
                  return (
                    <Pressable
                      key={g.id}
                      onPress={() => step(() => setGender(g.id))}
                      style={styles.genderPressable}
                      testID={`gender-${g.id}`}
                    >
                      <GlassSurface
                        intensity={isActive ? "medium" : "light"}
                        style={[
                          styles.genderCard,
                          {
                            borderColor: isActive
                              ? theme.colors.primary
                              : "transparent",
                            borderWidth: 2,
                          },
                        ]}
                      >
                        <Ionicons
                          name={g.icon}
                          size={24}
                          color={
                            isActive
                              ? theme.colors.primary
                              : theme.colors.textSecondary
                          }
                        />
                        <TText
                          style={[
                            styles.genderLabel,
                            {
                              color: isActive
                                ? theme.colors.primary
                                : theme.colors.text,
                            },
                          ]}
                        >
                          {g.label}
                        </TText>
                      </GlassSurface>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>

            <TSpacer size="lg" />

            {/* ── Age ── */}
            <Animated.View entering={FadeInDown.duration(400).delay(400)}>
              <TText
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Age
              </TText>
              <TSpacer size="sm" />
              <GlassSurface intensity="light" style={styles.stepperCard}>
                <Pressable
                  onPress={() => step(() => setAge(Math.max(13, age - 1)))}
                  style={[
                    styles.stepperBtn,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Ionicons name="remove" size={22} color={theme.colors.text} />
                </Pressable>
                <View style={styles.stepperValue}>
                  <TText
                    style={[styles.stepperNum, { color: theme.colors.text }]}
                  >
                    {age}
                  </TText>
                  <TText
                    style={[
                      styles.stepperUnit,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    years
                  </TText>
                </View>
                <Pressable
                  onPress={() => step(() => setAge(Math.min(99, age + 1)))}
                  style={[
                    styles.stepperBtn,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Ionicons name="add" size={22} color={theme.colors.text} />
                </Pressable>
              </GlassSurface>
            </Animated.View>

            <TSpacer size="lg" />

            {/* ── Height ── */}
            <Animated.View entering={FadeInDown.duration(400).delay(500)}>
              <TText
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Height
              </TText>
              <TSpacer size="sm" />

              {system === "imperial" ? (
                <View style={styles.heightRow}>
                  <GlassSurface intensity="light" style={styles.heightCard}>
                    <Pressable
                      onPress={() => step(decHeightFt)}
                      style={[
                        styles.stepperBtnSm,
                        { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={theme.colors.text}
                      />
                    </Pressable>
                    <View style={styles.stepperValue}>
                      <TText
                        style={[
                          styles.stepperNum,
                          { color: theme.colors.text },
                        ]}
                      >
                        {heightFt}
                      </TText>
                      <TText
                        style={[
                          styles.stepperUnit,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        ft
                      </TText>
                    </View>
                    <Pressable
                      onPress={() => step(incHeightFt)}
                      style={[
                        styles.stepperBtnSm,
                        { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={theme.colors.text}
                      />
                    </Pressable>
                  </GlassSurface>

                  <GlassSurface intensity="light" style={styles.heightCard}>
                    <Pressable
                      onPress={() => step(decHeightIn)}
                      style={[
                        styles.stepperBtnSm,
                        { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <Ionicons
                        name="remove"
                        size={18}
                        color={theme.colors.text}
                      />
                    </Pressable>
                    <View style={styles.stepperValue}>
                      <TText
                        style={[
                          styles.stepperNum,
                          { color: theme.colors.text },
                        ]}
                      >
                        {heightIn}
                      </TText>
                      <TText
                        style={[
                          styles.stepperUnit,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        in
                      </TText>
                    </View>
                    <Pressable
                      onPress={() => step(incHeightIn)}
                      style={[
                        styles.stepperBtnSm,
                        { backgroundColor: theme.colors.surface },
                      ]}
                    >
                      <Ionicons
                        name="add"
                        size={18}
                        color={theme.colors.text}
                      />
                    </Pressable>
                  </GlassSurface>
                </View>
              ) : (
                /* Metric — single cm stepper */
                <GlassSurface intensity="light" style={styles.stepperCard}>
                  <Pressable
                    onPress={() => step(decHeightCm)}
                    style={[
                      styles.stepperBtn,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <Ionicons
                      name="remove"
                      size={22}
                      color={theme.colors.text}
                    />
                  </Pressable>
                  <View style={styles.stepperValue}>
                    <TText
                      style={[styles.stepperNum, { color: theme.colors.text }]}
                    >
                      {heightCm}
                    </TText>
                    <TText
                      style={[
                        styles.stepperUnit,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      cm
                    </TText>
                  </View>
                  <Pressable
                    onPress={() => step(incHeightCm)}
                    style={[
                      styles.stepperBtn,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <Ionicons name="add" size={22} color={theme.colors.text} />
                  </Pressable>
                </GlassSurface>
              )}
            </Animated.View>

            <TSpacer size="lg" />

            {/* ── Weight ── */}
            <Animated.View entering={FadeInDown.duration(400).delay(600)}>
              <TText
                style={[styles.label, { color: theme.colors.textSecondary }]}
              >
                Current weight
              </TText>
              <TSpacer size="sm" />
              <GlassSurface intensity="light" style={styles.stepperCard}>
                <Pressable
                  onPress={() => step(decWeight)}
                  style={[
                    styles.stepperBtn,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Ionicons name="remove" size={22} color={theme.colors.text} />
                </Pressable>
                <View style={styles.stepperValue}>
                  <TText
                    style={[styles.stepperNum, { color: theme.colors.text }]}
                  >
                    {Math.round(displayWeight)}
                  </TText>
                  <TText
                    style={[
                      styles.stepperUnit,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {weightLabel}
                  </TText>
                </View>
                <Pressable
                  onPress={() => step(incWeight)}
                  style={[
                    styles.stepperBtn,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Ionicons name="add" size={22} color={theme.colors.text} />
                </Pressable>
              </GlassSurface>
            </Animated.View>

            <TSpacer size="xl" />
          </ScrollView>

          {/* Bottom CTA */}
          <View style={styles.footer}>
            <TButton
              onPress={() => {
                const birthYear = new Date().getFullYear() - age;
                saveBodyMeasurements({
                  gender: gender as "male" | "female" | "other",
                  birthYear,
                  heightCm,
                  currentWeightLbs: Math.round(weightLbs),
                });
                updateProfile({
                  weightUnit: system === "metric" ? "kg" : "lbs",
                  heightUnit: system === "metric" ? "cm" : "ft_in",
                });
                router.push("/(onboarding)/activity" as any);
              }}
              disabled={!isValid}
              size="lg"
              testID="onboarding-next-body"
            >
              Continue
            </TButton>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
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
  toggleRow: {
    flexDirection: "row",
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
    overflow: "hidden",
  },
  toggleBtnBg: {
    borderRadius: 10,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  genderRow: {
    flexDirection: "row",
    gap: 10,
  },
  genderPressable: {
    flex: 1,
  },
  genderCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    gap: 6,
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  stepperCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnSm: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    alignItems: "center",
  },
  stepperNum: {
    fontSize: 28,
    fontWeight: "700",
  },
  stepperUnit: {
    fontSize: 13,
  },
  heightRow: {
    flexDirection: "row",
    gap: 12,
  },
  heightCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
});
