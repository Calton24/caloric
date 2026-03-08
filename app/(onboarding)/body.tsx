/**
 * Onboarding Step 3 — Body Data
 *
 * Collects gender, age, height, and weight.
 * Uses segmented control for gender, scroll pickers for the rest.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TButton } from "../../src/ui/primitives/TButton";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingProgress } from "./_progress";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";

const GENDERS = [
  { id: "male", icon: "male-outline" as const, label: "Male" },
  { id: "female", icon: "female-outline" as const, label: "Female" },
  { id: "other", icon: "person-outline" as const, label: "Other" },
] as const;

export default function OnboardingBodyScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { profile, saveBodyMeasurements } = useOnboarding();
  const [gender, setGender] = useState<string | null>(profile.gender);
  const [age, setAge] = useState(28);
  const [heightFt, setHeightFt] = useState(5);
  const [heightIn, setHeightIn] = useState(8);
  const [weight, setWeight] = useState(profile.currentWeightLbs ?? 160);

  const isValid = gender !== null && age > 0 && weight > 0;

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
            <OnboardingProgress step={3} total={9} theme={theme} />

            <TSpacer size="xl" />

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
                      onPress={() => setGender(g.id)}
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
                  onPress={() => setAge(Math.max(13, age - 1))}
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
                  onPress={() => setAge(Math.min(99, age + 1))}
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
              <View style={styles.heightRow}>
                <GlassSurface intensity="light" style={styles.heightCard}>
                  <Pressable
                    onPress={() => setHeightFt(Math.max(3, heightFt - 1))}
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
                      ft
                    </TText>
                  </View>
                  <Pressable
                    onPress={() => setHeightFt(Math.min(8, heightFt + 1))}
                    style={[
                      styles.stepperBtnSm,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <Ionicons name="add" size={18} color={theme.colors.text} />
                  </Pressable>
                </GlassSurface>

                <GlassSurface intensity="light" style={styles.heightCard}>
                  <Pressable
                    onPress={() => setHeightIn(Math.max(0, heightIn - 1))}
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
                      in
                    </TText>
                  </View>
                  <Pressable
                    onPress={() => setHeightIn(Math.min(11, heightIn + 1))}
                    style={[
                      styles.stepperBtnSm,
                      { backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <Ionicons name="add" size={18} color={theme.colors.text} />
                  </Pressable>
                </GlassSurface>
              </View>
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
                  onPress={() => setWeight(Math.max(60, weight - 1))}
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
                    {weight}
                  </TText>
                  <TText
                    style={[
                      styles.stepperUnit,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    lbs
                  </TText>
                </View>
                <Pressable
                  onPress={() => setWeight(Math.min(500, weight + 1))}
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
              onPress={() => (() => {
              // Convert age → birthYear, ft/in → cm, then save to store
              const birthYear = new Date().getFullYear() - age;
              const heightCm = Math.round(heightFt * 30.48 + heightIn * 2.54);
              saveBodyMeasurements({
                gender: gender as "male" | "female" | "other",
                birthYear,
                heightCm,
                currentWeightLbs: weight,
              });
              router.push("/(onboarding)/activity" as any);
            })()}
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
