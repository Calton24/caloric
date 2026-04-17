/**
 * Onboarding Step 2 — Choose your goal
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import type { GoalType } from "../../src/features/goals/goals.types";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TButton } from "../../src/ui/primitives/TButton";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingHeader } from "./_progress";

const GOAL_KEYS = [
  {
    id: "lose",
    icon: "trending-down-outline" as const,
    titleKey: "onboarding.goal.loseWeight",
    subtitleKey: "onboarding.goal.loseWeightDesc",
  },
  {
    id: "maintain",
    icon: "swap-horizontal-outline" as const,
    titleKey: "onboarding.goal.maintainWeight",
    subtitleKey: "onboarding.goal.maintainWeightDesc",
  },
  {
    id: "gain",
    icon: "trending-up-outline" as const,
    titleKey: "onboarding.goal.gainMuscle",
    subtitleKey: "onboarding.goal.gainMuscleDesc",
  },
  {
    id: "health",
    icon: "heart-outline" as const,
    titleKey: "onboarding.goal.eatHealthier",
    subtitleKey: "onboarding.goal.eatHealthierDesc",
  },
] as const;

export default function OnboardingGoalScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { t } = useAppTranslation();
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
          {/* Progress + Back */}
          <OnboardingHeader step={1} total={6} theme={theme} />

          <TSpacer size="lg" />

          <Animated.View
            entering={FadeInDown.duration(550)
              .delay(150)
              .springify()
              .damping(18)}
          >
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              {t("onboarding.goal.heading")}
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeInDown.duration(500).delay(250)}>
            <TText color="secondary" style={styles.description}>
              {t("onboarding.goal.description")}
            </TText>
          </Animated.View>

          <TSpacer size="lg" />

          {GOAL_KEYS.map((goal, i) => {
            const isSelected = goalType === goal.id;
            return (
              <Animated.View
                key={goal.id}
                entering={FadeInDown.duration(450)
                  .delay(350 + i * 90)
                  .springify()
                  .damping(20)}
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
                        {t(goal.titleKey)}
                      </TText>
                      <TText color="secondary" style={styles.goalSubtitle}>
                        {t(goal.subtitleKey)}
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
        <Animated.View
          entering={FadeInUp.duration(500).delay(650).springify().damping(18)}
          style={styles.footer}
        >
          <TButton
            onPress={() => router.push("/(onboarding)/body" as any)}
            disabled={!goalType}
            size="lg"
            testID="onboarding-next-2"
          >
            {t("common.continue")}
          </TButton>
        </Animated.View>
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
