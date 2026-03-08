/**
 * Onboarding Step 2 — Choose your goal
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TButton } from "../../src/ui/primitives/TButton";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingProgress } from "./_progress";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import type { GoalType } from "../../src/features/goals/goals.types";

const GOALS = [
  {
    id: "lose",
    icon: "trending-down-outline" as const,
    title: "Lose weight",
    subtitle: "Calorie deficit with guided targets",
  },
  {
    id: "maintain",
    icon: "swap-horizontal-outline" as const,
    title: "Maintain weight",
    subtitle: "Keep your current balance",
  },
  {
    id: "gain",
    icon: "trending-up-outline" as const,
    title: "Gain muscle",
    subtitle: "Calorie surplus for growth",
  },
  {
    id: "health",
    icon: "heart-outline" as const,
    title: "Eat healthier",
    subtitle: "Focus on nutrition quality",
  },
] as const;

export default function OnboardingGoalScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { goalType, saveGoalType } = useOnboarding();

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
          <OnboardingProgress step={2} total={9} theme={theme} />

          <TSpacer size="xl" />

          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              What&apos;s your{"\n"}goal?
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <TText color="secondary" style={styles.description}>
              We&lsquo;ll tailor your daily calorie targets.
            </TText>
          </Animated.View>

          <TSpacer size="lg" />

          {GOALS.map((goal, i) => {
            const isSelected = goalType === goal.id;
            return (
              <Animated.View
                key={goal.id}
                entering={FadeInDown.duration(400).delay(300 + i * 80)}
              >
                <Pressable
                  onPress={() => saveGoalType(goal.id as GoalType)}
                  testID={`goal-${goal.id}`}
                >
                  <GlassSurface
                    intensity={isSelected ? "medium" : "light"}
                    style={[
                      styles.goalCard,
                      {
                        borderColor: isSelected
                          ? theme.colors.primary
                          : "transparent",
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.goalIcon,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary + "22"
                            : theme.colors.surface,
                        },
                      ]}
                    >
                      <Ionicons
                        name={goal.icon}
                        size={22}
                        color={
                          isSelected
                            ? theme.colors.primary
                            : theme.colors.textSecondary
                        }
                      />
                    </View>
                    <View style={styles.goalText}>
                      <TText
                        style={[styles.goalTitle, { color: theme.colors.text }]}
                      >
                        {goal.title}
                      </TText>
                      <TText color="secondary" style={styles.goalSubtitle}>
                        {goal.subtitle}
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
            onPress={() => router.push("/(onboarding)/body" as any)}
            disabled={!goalType}
            size="lg"
            testID="onboarding-next-2"
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
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
  },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  goalText: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  goalSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
});
