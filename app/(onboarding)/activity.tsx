/**
 * Onboarding Step 3 — Activity level
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import type { ActivityLevel } from "../../src/features/profile/profile.types";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TButton } from "../../src/ui/primitives/TButton";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingHeader } from "./_progress";

const LEVELS = [
  {
    id: "sedentary",
    emoji: "🪑",
    title: "Sedentary",
    subtitle: "Little or no exercise",
  },
  {
    id: "light",
    emoji: "🚶",
    title: "Lightly active",
    subtitle: "Light exercise 1–3 days/week",
  },
  {
    id: "moderate",
    emoji: "🏃",
    title: "Moderately active",
    subtitle: "Moderate exercise 3–5 days/week",
  },
  {
    id: "very",
    emoji: "💪",
    title: "Very active",
    subtitle: "Hard exercise 6–7 days/week",
  },
] as const;

export default function OnboardingActivityScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { profile, saveActivityLevel } = useOnboarding();
  const selected = profile.activityLevel;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Progress */}
          <OnboardingHeader step={3} total={6} theme={theme} />

          <TSpacer size="lg" />

          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              How active{"\n"}are you?
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <TText color="secondary" style={styles.description}>
              This helps us estimate your daily energy needs.
            </TText>
          </Animated.View>

          <TSpacer size="lg" />

          {LEVELS.map((level, i) => {
            const isSelected = selected === level.id;
            return (
              <Animated.View
                key={level.id}
                entering={FadeInDown.duration(400).delay(300 + i * 80)}
              >
                <Pressable
                  onPress={() => saveActivityLevel(level.id as ActivityLevel)}
                  testID={`activity-${level.id}`}
                >
                  <GlassSurface
                    intensity={isSelected ? "medium" : "light"}
                    style={[
                      styles.levelCard,
                      {
                        borderColor: isSelected
                          ? theme.colors.primary
                          : "transparent",
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <TText style={styles.emoji}>{level.emoji}</TText>
                    <View style={styles.levelText}>
                      <TText
                        style={[
                          styles.levelTitle,
                          { color: theme.colors.text },
                        ]}
                      >
                        {level.title}
                      </TText>
                      <TText color="secondary" style={styles.levelSubtitle}>
                        {level.subtitle}
                      </TText>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={theme.colors.primary}
                      />
                    )}
                  </GlassSurface>
                </Pressable>
                <TSpacer size="sm" />
              </Animated.View>
            );
          })}
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.footer}>
          <TButton
            onPress={() => router.push("/(onboarding)/weight-goal" as any)}
            disabled={!selected}
            size="lg"
            testID="onboarding-next-3"
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
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  emoji: {
    fontSize: 28,
    marginRight: 14,
  },
  levelText: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  levelSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
});
