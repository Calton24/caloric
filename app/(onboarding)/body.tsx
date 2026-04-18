/**
 * Onboarding Step 3 — Body Data
 *
 * Collects gender, age, height, and weight.
 * Includes Metric/Imperial toggle with real-time conversion.
 * Haptic feedback on all stepper buttons.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { LayoutChangeEvent, Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import { useProfileStore } from "../../src/features/profile/profile.store";
import { haptics } from "../../src/infrastructure/haptics";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingCTA } from "./_cta";
import { OnboardingHeader } from "./_progress";

/** Sliding unit toggle (Imperial / Metric) */
function UnitToggle({
  system,
  onToggle,
  theme,
  labels,
}: {
  system: MeasurementSystem;
  onToggle: () => void;
  theme: ReturnType<typeof useTheme>["theme"];
  labels: { imperial: string; metric: string };
}) {
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
    onToggle();
  };

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.toggleRow,
        { backgroundColor: theme.colors.surface, borderRadius: 12 },
      ]}
    >
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
          {labels.imperial}
        </TText>
      </Pressable>
      <Pressable onPress={() => handlePress("metric")} style={styles.toggleBtn}>
        <TText
          style={[
            styles.toggleText,
            {
              color: system === "metric" ? "#fff" : theme.colors.textSecondary,
            },
          ]}
        >
          {labels.metric}
        </TText>
      </Pressable>
    </View>
  );
}

type MeasurementSystem = "imperial" | "metric";

const GENDER_KEYS = [
  {
    id: "male",
    icon: "male-outline" as const,
    labelKey: "onboarding.body.male",
  },
  {
    id: "female",
    icon: "female-outline" as const,
    labelKey: "onboarding.body.female",
  },
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
  const { t } = useAppTranslation();
  const { profile, saveBodyMeasurements } = useOnboarding();
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const [gender, setGender] = useState<string | null>(profile.gender);
  const [age, setAge] = useState(28);
  const [system, setSystem] = useState<MeasurementSystem>(
    profile.weightUnit === "kg" ? "metric" : "imperial"
  );

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
      return next;
    });
  }, []);

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
        <OnboardingHeader step={2} total={7} theme={theme} />

        <View style={styles.content}>
          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              {t("onboarding.body.heading")}
            </TText>
          </Animated.View>

          <View style={{ height: 4 }} />

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <TText color="secondary" style={styles.description}>
              {t("onboarding.body.description")}
            </TText>
          </Animated.View>

          <View style={{ height: 14 }} />

          {/* ── Metric / Imperial Toggle ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(250)}>
            <UnitToggle
              system={system}
              onToggle={toggleSystem}
              theme={theme}
              labels={{
                imperial: t("onboarding.body.imperial"),
                metric: t("onboarding.body.metric"),
              }}
            />
          </Animated.View>

          <View style={{ height: 14 }} />

          {/* ── Gender ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <TText
              style={[styles.label, { color: theme.colors.textSecondary }]}
            >
              {t("onboarding.body.gender")}
            </TText>
            <View style={{ height: 6 }} />
            <View style={styles.genderRow}>
              {GENDER_KEYS.map((g) => {
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
                            ? theme.colors.accent
                            : "transparent",
                          borderWidth: 2,
                        },
                      ]}
                    >
                      <Ionicons
                        name={g.icon}
                        size={22}
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
                        {t(g.labelKey)}
                      </TText>
                    </GlassSurface>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          <View style={{ height: 14 }} />

          {/* ── Age ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <TText
              style={[styles.label, { color: theme.colors.textSecondary }]}
            >
              {t("onboarding.body.age")}
            </TText>
            <View style={{ height: 6 }} />
            <GlassSurface intensity="light" style={styles.stepperCard}>
              <Pressable
                onPress={() => step(() => setAge(Math.max(13, age - 1)))}
                style={[
                  styles.stepperBtn,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Ionicons name="remove" size={20} color={theme.colors.text} />
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
                  {t("common.years")}
                </TText>
              </View>
              <Pressable
                onPress={() => step(() => setAge(Math.min(99, age + 1)))}
                style={[
                  styles.stepperBtn,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Ionicons name="add" size={20} color={theme.colors.text} />
              </Pressable>
            </GlassSurface>
          </Animated.View>

          <View style={{ height: 14 }} />

          {/* ── Height ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <TText
              style={[styles.label, { color: theme.colors.textSecondary }]}
            >
              {t("onboarding.body.height")}
            </TText>
            <View style={{ height: 6 }} />

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
                      size={16}
                      color={theme.colors.text}
                    />
                  </Pressable>
                  <View style={styles.stepperValue}>
                    <TText
                      style={[styles.stepperNum, { color: theme.colors.text }]}
                    >
                      {heightFt}
                    </TText>
                    <TText
                      style={[
                        styles.stepperUnit,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {t("onboarding.body.ft")}
                    </TText>
                  </View>
                  <Pressable
                    onPress={() => step(incHeightFt)}
                    style={[
                      styles.stepperBtnSm,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <Ionicons name="add" size={16} color={theme.colors.text} />
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
                      size={16}
                      color={theme.colors.text}
                    />
                  </Pressable>
                  <View style={styles.stepperValue}>
                    <TText
                      style={[styles.stepperNum, { color: theme.colors.text }]}
                    >
                      {heightIn}
                    </TText>
                    <TText
                      style={[
                        styles.stepperUnit,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {t("onboarding.body.in")}
                    </TText>
                  </View>
                  <Pressable
                    onPress={() => step(incHeightIn)}
                    style={[
                      styles.stepperBtnSm,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <Ionicons name="add" size={16} color={theme.colors.text} />
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
                  <Ionicons name="remove" size={20} color={theme.colors.text} />
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
                    {t("onboarding.body.cm")}
                  </TText>
                </View>
                <Pressable
                  onPress={() => step(incHeightCm)}
                  style={[
                    styles.stepperBtn,
                    { backgroundColor: theme.colors.surface },
                  ]}
                >
                  <Ionicons name="add" size={20} color={theme.colors.text} />
                </Pressable>
              </GlassSurface>
            )}
          </Animated.View>

          <View style={{ height: 14 }} />

          {/* ── Weight ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(600)}>
            <TText
              style={[styles.label, { color: theme.colors.textSecondary }]}
            >
              {t("onboarding.body.weight")}
            </TText>
            <View style={{ height: 6 }} />
            <GlassSurface intensity="light" style={styles.stepperCard}>
              <Pressable
                onPress={() => step(decWeight)}
                style={[
                  styles.stepperBtn,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Ionicons name="remove" size={20} color={theme.colors.text} />
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
                <Ionicons name="add" size={20} color={theme.colors.text} />
              </Pressable>
            </GlassSurface>
          </Animated.View>
        </View>

        {/* Bottom CTA */}
        <OnboardingCTA
          label={t("common.continue")}
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
          theme={theme}
          testID="onboarding-next-body"
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  content: {
    flex: 1,
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
  toggleRow: {
    flexDirection: "row",
    padding: 4,
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
    paddingVertical: 14,
    borderRadius: 16,
    gap: 4,
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  stepperCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 16,
  },
  stepperBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperBtnSm: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    alignItems: "center",
  },
  stepperNum: {
    fontSize: 28,
    fontWeight: "800",
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
    padding: 10,
    borderRadius: 16,
  },
});
