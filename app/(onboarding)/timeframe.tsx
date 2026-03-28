/**
 * Onboarding Step 6 — Timeframe
 *
 * User picks a timeframe to reach their goal weight.
 * Each option shows weeks, weekly rate, and a difficulty label
 * (Relaxed → Realistic → Ambitious → Challenging) with colour coding.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnits } from "../../hooks/useUnits";
import { useOnboarding } from "../../src/features/onboarding/use-onboarding";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TButton } from "../../src/ui/primitives/TButton";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingHeader } from "./_progress";

interface TimeframeOption {
  id: string;
  weeks: number;
  rateLbsPerWeek: number;
  difficulty: string;
  difficultyColor: string;
  recommended?: boolean;
}

const TIMEFRAMES: TimeframeOption[] = [
  {
    id: "relaxed",
    weeks: 35,
    rateLbsPerWeek: 0.45,
    difficulty: "Relaxed",
    difficultyColor: "#34D399",
  },
  {
    id: "realistic",
    weeks: 17,
    rateLbsPerWeek: 0.9,
    difficulty: "Realistic",
    difficultyColor: "#60A5FA",
    recommended: true,
  },
  {
    id: "ambitious",
    weeks: 11,
    rateLbsPerWeek: 1.35,
    difficulty: "Ambitious",
    difficultyColor: "#FBBF24",
  },
  {
    id: "challenging",
    weeks: 8,
    rateLbsPerWeek: 1.9,
    difficulty: "Challenging",
    difficultyColor: "#F87171",
  },
];

export default function OnboardingTimeframeScreen() {
  const { theme } = useTheme();
  const units = useUnits();
  const router = useRouter();
  const { timeframeWeeks, saveTimeframe, profile } = useOnboarding();
  // Map weeks back to id for selection highlighting
  const selectedId =
    TIMEFRAMES.find((t) => t.weeks === timeframeWeeks)?.id ?? null;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <OnboardingHeader step={5} total={6} theme={theme} />

          <TSpacer size="lg" />

          <Animated.View entering={FadeInDown.duration(500).delay(100)}>
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              Choose your{"\n"}pace
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <TText color="secondary" style={styles.description}>
              {`How quickly do you want to reach ${units.display(profile.goalWeightLbs ?? 0)} ${units.label}?`}
            </TText>
          </Animated.View>

          <TSpacer size="lg" />

          {TIMEFRAMES.map((tf, i) => {
            const isSelected = selectedId === tf.id;
            return (
              <Animated.View
                key={tf.id}
                entering={FadeInDown.duration(400).delay(300 + i * 80)}
              >
                <Pressable
                  onPress={() => saveTimeframe(tf.weeks)}
                  testID={`timeframe-${tf.id}`}
                >
                  <GlassSurface
                    intensity={isSelected ? "medium" : "light"}
                    style={[
                      styles.card,
                      {
                        borderColor: isSelected
                          ? theme.colors.primary
                          : "transparent",
                        borderWidth: 2,
                      },
                    ]}
                  >
                    <View style={styles.cardLeft}>
                      <View style={styles.cardTopRow}>
                        <TText
                          style={[styles.weeks, { color: theme.colors.text }]}
                        >
                          {tf.weeks} Weeks
                        </TText>
                        {tf.recommended && (
                          <View
                            style={[
                              styles.recBadge,
                              {
                                backgroundColor: theme.colors.primary + "22",
                              },
                            ]}
                          >
                            <TText
                              style={[
                                styles.recText,
                                { color: theme.colors.primary },
                              ]}
                            >
                              Recommended
                            </TText>
                          </View>
                        )}
                      </View>
                      <TSpacer size="xs" />
                      <TText
                        style={[
                          styles.rate,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {`-${units.display(tf.rateLbsPerWeek, 2)} ${units.label}/week`}
                      </TText>
                    </View>
                    <View style={styles.cardRight}>
                      <View
                        style={[
                          styles.diffPill,
                          {
                            backgroundColor: tf.difficultyColor + "22",
                          },
                        ]}
                      >
                        <TText
                          style={[
                            styles.diffLabel,
                            { color: tf.difficultyColor },
                          ]}
                        >
                          {tf.difficulty}
                        </TText>
                      </View>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={theme.colors.primary}
                          style={styles.check}
                        />
                      )}
                    </View>
                  </GlassSurface>
                </Pressable>
                <TSpacer size="sm" />
              </Animated.View>
            );
          })}

          <TSpacer size="md" />

          <Animated.View entering={FadeInDown.duration(400).delay(700)}>
            <View style={styles.infoRow}>
              <Ionicons
                name="information-circle-outline"
                size={18}
                color={theme.colors.textMuted}
              />
              <TText
                style={[styles.infoText, { color: theme.colors.textMuted }]}
              >
                A safe rate is 0.2–1 {units.label} per week. Faster rates may
                not be sustainable long term.
              </TText>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Bottom CTA */}
        <View style={styles.footer}>
          <TButton
            disabled={!timeframeWeeks}
            onPress={() => router.push("/(onboarding)/calculating" as any)}
            size="lg"
            testID="onboarding-next-timeframe"
          >
            Build My Plan
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
  },
  cardLeft: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  weeks: {
    fontSize: 18,
    fontWeight: "700",
  },
  recBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  rate: {
    fontSize: 14,
  },
  cardRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  diffPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  diffLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  check: {
    marginLeft: 2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 4,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
});
