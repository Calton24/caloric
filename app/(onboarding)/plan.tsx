/**
 * Onboarding Step 8 — Personalized Plan / Results
 *
 * THE key conversion screen.  Shows daily calorie target, macro split
 * (protein / carbs / fat), projected result, and a "Continue" CTA
 * to the paywall.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUnits } from "../../hooks/useUnits";
import { useAuth } from "../../src/features/auth/useAuth";
import { useGoalsStore } from "../../src/features/goals/goals.store";
import { useProfileStore } from "../../src/features/profile/profile.store";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function OnboardingPlanScreen() {
  const { theme } = useTheme();
  const { t, language } = useAppTranslation();
  const units = useUnits();
  const router = useRouter();
  const { user } = useAuth();
  const plan = useGoalsStore((s) => s.plan);
  const profile = useProfileStore((s) => s.profile);

  // Derive display values from store
  const PLAN = {
    calories: plan?.calorieBudget ?? 0,
    protein: plan?.macros.protein ?? 0,
    carbs: plan?.macros.carbs ?? 0,
    fat: plan?.macros.fat ?? 0,
    goalWeeks: plan?.timeframeWeeks ?? 0,
    goalDate: plan?.targetDate
      ? new Date(plan.targetDate).toLocaleDateString(language, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
    currentWeight: profile.currentWeightLbs ?? 0,
    goalWeight: profile.goalWeightLbs ?? 0,
  };

  const totalCals = PLAN.protein * 4 + PLAN.carbs * 4 + PLAN.fat * 9;
  const MACROS = [
    {
      label: t("onboarding.plan.protein"),
      grams: PLAN.protein,
      pct:
        totalCals > 0 ? Math.round(((PLAN.protein * 4) / totalCals) * 100) : 0,
      color: "#60A5FA",
      icon: "fish-outline" as const,
    },
    {
      label: t("onboarding.plan.carbs"),
      grams: PLAN.carbs,
      pct: totalCals > 0 ? Math.round(((PLAN.carbs * 4) / totalCals) * 100) : 0,
      color: "#FBBF24",
      icon: "nutrition-outline" as const,
    },
    {
      label: t("onboarding.plan.fat"),
      grams: PLAN.fat,
      pct: totalCals > 0 ? Math.round(((PLAN.fat * 9) / totalCals) * 100) : 0,
      color: "#F87171",
      icon: "water-outline" as const,
    },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <TSpacer size="lg" />

          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              {t("onboarding.plan.heading")}
            </TText>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeIn.duration(600).delay(250)}>
            <TText color="secondary" style={styles.sub}>
              {t("onboarding.plan.subtitle")}
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Daily Calorie Target ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(350)}>
            <GlassSurface intensity="medium" style={styles.calorieCard}>
              <TText
                style={[
                  styles.calorieLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("onboarding.plan.dailyCalorieTarget")}
              </TText>
              <TSpacer size="xs" />
              <View style={styles.calorieRow}>
                <TText
                  style={[styles.calorieNum, { color: theme.colors.primary }]}
                >
                  {PLAN.calories.toLocaleString()}
                </TText>
                <TText
                  style={[
                    styles.calorieUnit,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t("onboarding.plan.kcalPerDay")}
                </TText>
              </View>
            </GlassSurface>
          </Animated.View>

          <TSpacer size="md" />

          {/* ── Macro split ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            <GlassSurface intensity="light" style={styles.macroCard}>
              <TText
                style={[
                  styles.macroTitle,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("onboarding.plan.dailyMacros")}
              </TText>
              <TSpacer size="md" />

              {/* Stacked bar */}
              <View style={styles.macroBar}>
                {MACROS.map((m) => (
                  <View
                    key={m.label}
                    style={[
                      styles.macroSegment,
                      {
                        flex: m.pct,
                        backgroundColor: m.color,
                      },
                    ]}
                  />
                ))}
              </View>

              <TSpacer size="md" />

              {/* Macro rows */}
              <View style={styles.macroRows}>
                {MACROS.map((m) => (
                  <View key={m.label} style={styles.macroRow}>
                    <View style={styles.macroLeft}>
                      <View
                        style={[styles.macroDot, { backgroundColor: m.color }]}
                      />
                      <Ionicons name={m.icon} size={18} color={m.color} />
                      <TText
                        style={[styles.macroName, { color: theme.colors.text }]}
                      >
                        {m.label}
                      </TText>
                    </View>
                    <View style={styles.macroRight}>
                      <TText
                        style={[
                          styles.macroGrams,
                          { color: theme.colors.text },
                        ]}
                      >
                        {m.grams}g
                      </TText>
                      <TText
                        style={[
                          styles.macroPct,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {m.pct}%
                      </TText>
                    </View>
                  </View>
                ))}
              </View>
            </GlassSurface>
          </Animated.View>

          <TSpacer size="md" />

          {/* ── Projected Result ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(650)}>
            <GlassSurface intensity="light" style={styles.projCard}>
              <View style={styles.projRow}>
                <View
                  style={[
                    styles.projIcon,
                    { backgroundColor: theme.colors.success + "1A" },
                  ]}
                >
                  <Ionicons
                    name="trending-down"
                    size={24}
                    color={theme.colors.success}
                  />
                </View>
                <View style={styles.projText}>
                  <TText
                    style={[styles.projTitle, { color: theme.colors.text }]}
                  >
                    {t("onboarding.plan.reachGoal", {
                      weight: units.display(PLAN.goalWeight),
                      unit: units.label,
                      date: PLAN.goalDate,
                    })}
                  </TText>
                  <TText
                    style={[
                      styles.projSub,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t("onboarding.plan.weeksToLose", {
                      weeks: PLAN.goalWeeks,
                      amount: units.display(
                        PLAN.currentWeight - PLAN.goalWeight
                      ),
                      unit: units.label,
                    })}
                  </TText>
                </View>
              </View>
            </GlassSurface>
          </Animated.View>

          <TSpacer size="md" />

          {/* ── Social proof ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(800)}>
            <View style={styles.socialRow}>
              <Ionicons
                name="people-outline"
                size={16}
                color={theme.colors.textMuted}
              />
              <TText
                style={[styles.socialText, { color: theme.colors.textMuted }]}
              >
                {t("onboarding.plan.socialProof")}
              </TText>
            </View>
          </Animated.View>

          <TSpacer size="xl" />
        </ScrollView>

        {/* ── CTA ── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(950)}
          style={styles.ctaArea}
        >
          <Pressable
            testID="onboarding-next-plan"
            onPress={() =>
              router.push(
                user
                  ? ("/(onboarding)/paywall" as any)
                  : ("/(onboarding)/save-progress" as any)
              )
            }
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              <TText
                style={[styles.ctaText, { color: theme.colors.textInverse }]}
              >
                {t("common.continue")}
              </TText>
              <Ionicons
                name="arrow-forward"
                size={20}
                color={theme.colors.textInverse}
              />
            </LinearGradient>
          </Pressable>
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
  sub: {
    fontSize: 17,
    lineHeight: 24,
  },
  // Calorie card
  calorieCard: {
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
  },
  calorieLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  calorieRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  calorieNum: {
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -2,
  },
  calorieUnit: {
    fontSize: 16,
    fontWeight: "500",
  },
  // Macro card
  macroCard: {
    padding: 20,
    borderRadius: 20,
  },
  macroTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  macroBar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    gap: 2,
  },
  macroSegment: {
    borderRadius: 5,
  },
  macroRows: {
    gap: 14,
  },
  macroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  macroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  macroName: {
    fontSize: 15,
    fontWeight: "500",
  },
  macroRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  macroGrams: {
    fontSize: 15,
    fontWeight: "700",
  },
  macroPct: {
    fontSize: 13,
  },
  // Projection card
  projCard: {
    padding: 16,
    borderRadius: 16,
  },
  projRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  projIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  projText: {
    flex: 1,
  },
  projTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  projSub: {
    fontSize: 14,
    marginTop: 2,
  },
  // Social
  socialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  socialText: {
    fontSize: 13,
  },
  // CTA
  ctaArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 9999,
    gap: 8,
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "700",
  },
});
