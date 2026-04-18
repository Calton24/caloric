/**
 * Onboarding Step 2 — Choose your goal
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import type { GoalType } from "../../src/features/goals/goals.types";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { AnimatedCheck } from "../../src/ui/components/AnimatedCheck";
import { SelectCard } from "../../src/ui/components/SelectCard";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingBackground } from "./_background";
import { OnboardingCTA } from "./_cta";
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
    <OnboardingBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <OnboardingHeader step={1} total={7} theme={theme} />

        <View style={styles.content}>
          <Animated.View
            entering={FadeInDown.springify().damping(18).delay(100)}
          >
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              {t("onboarding.goal.heading")}
            </TText>
          </Animated.View>

          <View style={{ height: 8 }} />

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <TText
              style={[
                styles.description,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("onboarding.goal.description")}
            </TText>
          </Animated.View>

          <View style={{ height: 24 }} />

          {GOAL_KEYS.map((goal, i) => {
            const isSelected = goalType === goal.id;
            return (
              <Animated.View
                key={goal.id}
                entering={FadeInDown.springify()
                  .damping(20)
                  .delay(300 + i * 80)}
              >
                <SelectCard
                  selected={isSelected}
                  onPress={() => saveGoalType(goal.id as GoalType)}
                  style={styles.goalCard}
                  testID={`goal-${goal.id}`}
                >
                  <View
                    style={[
                      styles.goalIcon,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary + "20"
                          : theme.colors.surface,
                      },
                    ]}
                  >
                    <Ionicons
                      name={goal.icon}
                      size={24}
                      color={
                        isSelected
                          ? theme.colors.primary
                          : theme.colors.textSecondary
                      }
                    />
                  </View>
                  <View style={styles.goalText}>
                    <TText
                      style={[
                        styles.goalTitle,
                        {
                          color: isSelected
                            ? theme.colors.primary
                            : theme.colors.text,
                        },
                      ]}
                    >
                      {t(goal.titleKey)}
                    </TText>
                    <TText
                      style={[
                        styles.goalSubtitle,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {t(goal.subtitleKey)}
                    </TText>
                  </View>
                  <AnimatedCheck selected={isSelected} />
                </SelectCard>

                <View style={{ height: 10 }} />
              </Animated.View>
            );
          })}
        </View>

        <OnboardingCTA
          label={t("common.continue")}
          onPress={() => router.push("/(onboarding)/body" as any)}
          disabled={!goalType}
          theme={theme}
          testID="onboarding-next-2"
          delay={650}
        />
      </SafeAreaView>
    </OnboardingBackground>
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
  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
  },
  goalIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  goalText: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  goalSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
