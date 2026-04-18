/**
 * Onboarding Step 8 — Personalized Plan / Results
 *
 * THE key conversion screen. Shows daily calorie target as a hero number,
 * macro split, projected result, social proof, and a gradient CTA.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
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
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingCTA } from "./_cta";
import { OnboardingHeader } from "./_progress";

export default function OnboardingPlanScreen() {
  const { theme } = useTheme();
  const { t, language } = useAppTranslation();
  const units = useUnits();
  const router = useRouter();
  const { user } = useAuth();
  const plan = useGoalsStore((s) => s.plan);
  const profile = useProfileStore((s) => s.profile);

  const PLAN = {
    calories: plan?.calorieBudget ?? 0,
    protein: plan?.macros.protein ?? 0,
    carbs: plan?.macros.carbs ?? 0,
    fat: plan?.macros.fat ?? 0,
    goalWeeks: plan?.timeframeWeeks ?? 0,
    goalDays: (plan?.timeframeWeeks ?? 0) * 7,
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
      icon: "pizza-outline" as const,
    },
    {
      label: t("onboarding.plan.fat"),
      grams: PLAN.fat,
      pct: totalCals > 0 ? Math.round(((PLAN.fat * 9) / totalCals) * 100) : 0,
      color: "#F87171",
      icon: "egg-outline" as const,
    },
  ];

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <OnboardingHeader step={6} total={7} theme={theme} />

        <View style={styles.content}>
          <Animated.View
            entering={FadeInDown.springify().damping(18).delay(100)}
          >
            <TText
              variant="heading"
              style={[styles.heading, { color: theme.colors.text }]}
            >
              {t("onboarding.plan.heading")}
            </TText>
          </Animated.View>

          <View style={{ height: 4 }} />

          <Animated.View entering={FadeIn.duration(600).delay(250)}>
            <TText style={[styles.sub, { color: theme.colors.textSecondary }]}>
              {t("onboarding.plan.subtitle")}
            </TText>
          </Animated.View>

          <View style={{ height: 14 }} />

          {/* ── Hero Calorie Card with gradient accent ── */}
          <Animated.View
            entering={FadeInDown.springify().damping(16).delay(350)}
          >
            <View style={styles.calorieOuter}>
              <LinearGradient
                colors={[
                  theme.colors.primary + "08",
                  theme.colors.accent + "05",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.calorieGradientBg}
              />
              <GlassSurface intensity="medium" style={styles.calorieCard}>
                <TText
                  style={[
                    styles.calorieLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("onboarding.plan.dailyCalorieTarget")}
                </TText>
                <View style={{ height: 4 }} />
                <View style={styles.calorieRow}>
                  <TText
                    style={[styles.calorieNum, { color: theme.colors.primary }]}
                  >
                    {PLAN.calories.toLocaleString()}
                  </TText>
                </View>
                <TText
                  style={[
                    styles.calorieUnit,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t("onboarding.plan.kcalPerDay")}
                </TText>

                {/* Inline gradient accent bar */}
                <View style={{ height: 10 }} />
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.accentBar}
                />
              </GlassSurface>
            </View>
          </Animated.View>

          <View style={{ height: 10 }} />

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
              <View style={{ height: 10 }} />

              {/* Stacked bar */}
              <View style={styles.macroBar}>
                {MACROS.map((m) => (
                  <View
                    key={m.label}
                    style={[
                      styles.macroSegment,
                      { flex: m.pct, backgroundColor: m.color },
                    ]}
                  />
                ))}
              </View>

              <View style={{ height: 12 }} />

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

          <View style={{ height: 10 }} />

          {/* ── Projected Result ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(650)}>
            <GlassSurface intensity="light" style={styles.projCard}>
              {/* Icon + heading */}
              <View style={styles.projHeader}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.projIcon}
                >
                  <Ionicons name="flag" size={20} color="#fff" />
                </LinearGradient>
                <TText
                  style={[
                    styles.projLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("onboarding.plan.projectedGoal")}
                </TText>
              </View>

              {/* Target weight + date */}
              <View style={styles.projHero}>
                <TText
                  style={[styles.projWeight, { color: theme.colors.text }]}
                >
                  {units.display(PLAN.goalWeight)}{" "}
                  <TText
                    style={[styles.projUnit, { color: theme.colors.textMuted }]}
                  >
                    {units.label}
                  </TText>
                </TText>
                <TText
                  style={[styles.projDate, { color: theme.colors.accent }]}
                >
                  {t("onboarding.plan.byDate", { date: PLAN.goalDate })}
                </TText>
              </View>

              {/* Stats row */}
              <View
                style={[
                  styles.projStats,
                  { borderTopColor: theme.colors.border },
                ]}
              >
                <View style={styles.projStat}>
                  <TText
                    style={[styles.projStatNum, { color: theme.colors.text }]}
                  >
                    {PLAN.goalWeeks}
                  </TText>
                  <TText
                    style={[
                      styles.projStatLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t("onboarding.plan.weeks")}
                  </TText>
                </View>
                <View
                  style={[
                    styles.projDivider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={styles.projStat}>
                  <TText
                    style={[styles.projStatNum, { color: theme.colors.text }]}
                  >
                    {PLAN.goalDays}
                  </TText>
                  <TText
                    style={[
                      styles.projStatLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {t("onboarding.plan.days")}
                  </TText>
                </View>
                <View
                  style={[
                    styles.projDivider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={styles.projStat}>
                  <TText
                    style={[styles.projStatNum, { color: theme.colors.text }]}
                  >
                    {units.display(
                      Math.round((PLAN.currentWeight - PLAN.goalWeight) * 10) /
                        10
                    )}
                  </TText>
                  <TText
                    style={[
                      styles.projStatLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {units.label} {t("onboarding.plan.toLose")}
                  </TText>
                </View>
              </View>
            </GlassSurface>
          </Animated.View>

          <View style={{ height: 10 }} />

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
        </View>

        {/* ── CTA ── */}
        <OnboardingCTA
          label={t("common.continue")}
          onPress={() =>
            router.push(
              user
                ? ("/(onboarding)/paywall" as any)
                : ("/(onboarding)/save-progress" as any)
            )
          }
          theme={theme}
          testID="onboarding-next-plan"
          delay={950}
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
  sub: {
    fontSize: 16,
    lineHeight: 22,
  },
  // Hero calorie card
  calorieOuter: {
    borderRadius: 20,
    overflow: "hidden",
  },
  calorieGradientBg: {
    ...StyleSheet.absoluteFillObject,
  },
  calorieCard: {
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
  },
  calorieLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  calorieRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  calorieNum: {
    fontSize: 48,
    fontWeight: "800",
    letterSpacing: -2,
  },
  calorieUnit: {
    fontSize: 14,
    fontWeight: "500",
    marginTop: -2,
  },
  accentBar: {
    width: 60,
    height: 4,
    borderRadius: 2,
  },
  // Macro card
  macroCard: {
    padding: 16,
    borderRadius: 16,
  },
  macroTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
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
    gap: 10,
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
  projHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  projIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  projLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  projHero: {
    alignItems: "center",
    marginBottom: 12,
  },
  projWeight: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  projUnit: {
    fontSize: 16,
    fontWeight: "500",
  },
  projDate: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 2,
  },
  projStats: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    justifyContent: "center",
    gap: 24,
  },
  projStat: {
    alignItems: "center",
  },
  projStatNum: {
    fontSize: 18,
    fontWeight: "700",
  },
  projStatLabel: {
    fontSize: 12,
    marginTop: 1,
  },
  projDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
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
});
