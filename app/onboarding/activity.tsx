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
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TButton } from "../../src/ui/primitives/TButton";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingProgress } from "./_progress";

const LEVELS = [
  {
    id: "sedentary",
    emoji: "🪑",
    titleKey: "onboarding.activity.sedentary",
    subtitleKey: "onboarding.activity.sedentaryDesc",
  },
  {
    id: "light",
    emoji: "🚶",
    titleKey: "onboarding.activity.light",
    subtitleKey: "onboarding.activity.lightDesc",
  },
  {
    id: "moderate",
    emoji: "🏃",
    titleKey: "onboarding.activity.moderate",
    subtitleKey: "onboarding.activity.moderateDesc",
  },
  {
    id: "very",
    emoji: "💪",
    titleKey: "onboarding.activity.very",
    subtitleKey: "onboarding.activity.veryDesc",
  },
] as const;

export default function OnboardingActivityScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
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
          <OnboardingProgress step={4} total={9} theme={theme} />

          <TSpacer size="xl" />

          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              {t("onboarding.activity.heading")}
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <TText color="secondary" style={styles.description}>
              {t("onboarding.activity.description")}
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
                        {t(level.titleKey)}
                      </TText>
                      <TText color="secondary" style={styles.levelSubtitle}>
                        {t(level.subtitleKey)}
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
            onPress={() => router.push("/onboarding/weight-goal" as any)}
            disabled={!selected}
            size="lg"
            testID="onboarding-next-3"
          >
            {t("common.continue")}
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
