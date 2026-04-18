/**
 * Onboarding Step 3 — Activity level
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import type { ActivityLevel } from "../../src/features/profile/profile.types";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingCTA } from "./_cta";
import { OnboardingHeader } from "./_progress";

const LEVEL_KEYS = [
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
  const router = useRouter();
  const { t } = useAppTranslation();
  const { profile, saveActivityLevel } = useOnboarding();
  const selected = profile.activityLevel;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <OnboardingHeader step={3} total={7} theme={theme} />

        <View style={styles.content}>
          <Animated.View
            entering={FadeInDown.springify().damping(18).delay(100)}
          >
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              {t("onboarding.activity.heading")}
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
              {t("onboarding.activity.description")}
            </TText>
          </Animated.View>

          <View style={{ height: 24 }} />

          {LEVEL_KEYS.map((level, i) => {
            const isSelected = selected === level.id;
            return (
              <Animated.View
                key={level.id}
                entering={FadeInDown.springify()
                  .damping(20)
                  .delay(300 + i * 80)}
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
                          ? theme.colors.accent
                          : "transparent",
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.emojiBox,
                        {
                          backgroundColor: isSelected
                            ? theme.colors.primary + "15"
                            : theme.colors.surface,
                        },
                      ]}
                    >
                      <TText style={styles.emoji}>{level.emoji}</TText>
                    </View>
                    <View style={styles.levelText}>
                      <TText
                        style={[
                          styles.levelTitle,
                          {
                            color: isSelected
                              ? theme.colors.primary
                              : theme.colors.text,
                          },
                        ]}
                      >
                        {t(level.titleKey)}
                      </TText>
                      <TText
                        style={[
                          styles.levelSubtitle,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {t(level.subtitleKey)}
                      </TText>
                    </View>
                    {isSelected ? (
                      <LinearGradient
                        colors={[theme.colors.primary, theme.colors.accent]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[
                          styles.checkCircle,
                          { borderColor: "transparent" },
                        ]}
                      >
                        <Ionicons
                          name="checkmark"
                          size={14}
                          color={theme.colors.textInverse}
                        />
                      </LinearGradient>
                    ) : (
                      <View
                        style={[
                          styles.checkCircle,
                          {
                            borderColor: theme.colors.border,
                            backgroundColor: "transparent",
                          },
                        ]}
                      />
                    )}
                  </GlassSurface>
                </Pressable>
                <View style={{ height: 10 }} />
              </Animated.View>
            );
          })}
        </View>

        <OnboardingCTA
          label={t("common.continue")}
          onPress={() => router.push("/(onboarding)/weight-goal" as any)}
          disabled={!selected}
          theme={theme}
          testID="onboarding-next-3"
          delay={600}
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
  levelCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
  },
  emojiBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  emoji: {
    fontSize: 24,
  },
  levelText: {
    flex: 1,
  },
  levelTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  levelSubtitle: {
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
