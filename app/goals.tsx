/**
 * Goals Screen
 *
 * View and edit nutrition goals, recalculate caloric intake.
 * Accessed from Settings > Edit Goals.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { buildGoalPlan } from "@/src/features/goals/goal-calculation.service";
import { useGoalsStore } from "@/src/features/goals/goals.store";
import type { GoalType } from "@/src/features/goals/goals.types";
import { useProfileStore } from "@/src/features/profile/profile.store";
import type { ActivityLevel } from "@/src/features/profile/profile.types";
import { haptics } from "@/src/infrastructure/haptics";
import { useAppTranslation } from "@/src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "@/src/theme/useTheme";
import { GlassSurface } from "@/src/ui/glass/GlassSurface";
import { TSpacer } from "@/src/ui/primitives/TSpacer";
import { TText } from "@/src/ui/primitives/TText";

// ─── Goal type options ────────────────────────────────────
const GOAL_OPTIONS: { id: GoalType; icon: string; labelKey: string }[] = [
  { id: "lose", icon: "trending-down-outline", labelKey: "goals.loseWeight" },
  {
    id: "maintain",
    icon: "swap-horizontal-outline",
    labelKey: "goals.maintain",
  },
  { id: "gain", icon: "trending-up-outline", labelKey: "goals.gainMuscle" },
];

// ─── Activity levels ──────────────────────────────────────
const ACTIVITY_OPTIONS: {
  id: ActivityLevel;
  labelKey: string;
  descKey: string;
}[] = [
  {
    id: "sedentary",
    labelKey: "goals.sedentary",
    descKey: "goals.sedentaryDesc",
  },
  { id: "light", labelKey: "goals.light", descKey: "goals.lightDesc" },
  { id: "moderate", labelKey: "goals.moderate", descKey: "goals.moderateDesc" },
  { id: "very", labelKey: "goals.veryActive", descKey: "goals.veryActiveDesc" },
  {
    id: "super",
    labelKey: "goals.superActive",
    descKey: "goals.superActiveDesc",
  },
];

// ─── Timeframe options ────────────────────────────────────
const TIMEFRAME_OPTIONS = [4, 8, 12, 16, 24, 36, 52];

// ─── Stepper Component ───────────────────────────────────
function Stepper({
  value,
  onDecrement,
  onIncrement,
  label,
  unit,
  min,
  max,
}: {
  value: number;
  onDecrement: () => void;
  onIncrement: () => void;
  label: string;
  unit: string;
  min?: number;
  max?: number;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.stepperRow}>
      <TText
        style={[styles.stepperLabel, { color: theme.colors.textSecondary }]}
      >
        {label}
      </TText>
      <View style={styles.stepperControls}>
        <Pressable
          onPress={onDecrement}
          disabled={min !== undefined && value <= min}
          style={[
            styles.stepperBtn,
            { backgroundColor: theme.colors.surfaceSecondary },
          ]}
          hitSlop={8}
        >
          <Ionicons
            name="remove"
            size={20}
            color={
              min !== undefined && value <= min
                ? theme.colors.textMuted
                : theme.colors.text
            }
          />
        </Pressable>
        <TText style={[styles.stepperValue, { color: theme.colors.text }]}>
          {value} {unit}
        </TText>
        <Pressable
          onPress={onIncrement}
          disabled={max !== undefined && value >= max}
          style={[
            styles.stepperBtn,
            { backgroundColor: theme.colors.surfaceSecondary },
          ]}
          hitSlop={8}
        >
          <Ionicons
            name="add"
            size={20}
            color={
              max !== undefined && value >= max
                ? theme.colors.textMuted
                : theme.colors.text
            }
          />
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────
export default function GoalsScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();

  // ── Store values ──
  const profile = useProfileStore((s) => s.profile);
  const updateProfile = useProfileStore((s) => s.updateProfile);
  const plan = useGoalsStore((s) => s.plan);
  const goalType = useGoalsStore((s) => s.goalType);
  const timeframeWeeks = useGoalsStore((s) => s.timeframeWeeks);
  const setGoalType = useGoalsStore((s) => s.setGoalType);
  const setTimeframeWeeks = useGoalsStore((s) => s.setTimeframeWeeks);
  const setPlan = useGoalsStore((s) => s.setPlan);

  // ── Local editing state (mirrors stores until "Recalculate") ──
  const [editGoalType, setEditGoalType] = useState<GoalType>(goalType);
  const [editActivity, setEditActivity] = useState<ActivityLevel>(
    profile.activityLevel ?? "moderate"
  );
  const [editCurrentWeight, setEditCurrentWeight] = useState(
    profile.currentWeightLbs ?? 150
  );
  const [editGoalWeight, setEditGoalWeight] = useState(
    profile.goalWeightLbs ?? 140
  );
  const [editTimeframe, setEditTimeframe] = useState(timeframeWeeks ?? 12);

  const isMetric = profile.weightUnit === "kg";
  const weightUnit = isMetric ? "kg" : "lbs";

  // Convert for display if metric
  const displayWeight = useCallback(
    (lbs: number) => (isMetric ? Math.round(lbs * 0.453592) : lbs),
    [isMetric]
  );
  const lbsFromDisplay = useCallback(
    (display: number) => (isMetric ? Math.round(display / 0.453592) : display),
    [isMetric]
  );

  const displayCurrentWeight = displayWeight(editCurrentWeight);
  const displayGoalWeight = displayWeight(editGoalWeight);

  // Detect if user changed anything
  const hasChanges = useMemo(() => {
    return (
      editGoalType !== goalType ||
      editActivity !== (profile.activityLevel ?? "moderate") ||
      editCurrentWeight !== (profile.currentWeightLbs ?? 150) ||
      editGoalWeight !== (profile.goalWeightLbs ?? 140) ||
      editTimeframe !== (timeframeWeeks ?? 12)
    );
  }, [
    editGoalType,
    goalType,
    editActivity,
    profile.activityLevel,
    editCurrentWeight,
    profile.currentWeightLbs,
    editGoalWeight,
    profile.goalWeightLbs,
    editTimeframe,
    timeframeWeeks,
  ]);

  // Check if we can calculate
  const canCalculate =
    profile.birthYear != null &&
    profile.heightCm != null &&
    profile.gender != null;

  const handleRecalculate = useCallback(() => {
    if (!canCalculate) {
      Alert.alert(
        t("goals.missingProfile"),
        "Please complete your profile in settings first (gender, age, height)."
      );
      return;
    }

    try {
      // Persist edits to stores
      setGoalType(editGoalType);
      updateProfile({
        activityLevel: editActivity,
        currentWeightLbs: editCurrentWeight,
        goalWeightLbs: editGoalWeight,
      });
      setTimeframeWeeks(editTimeframe);

      // Build new plan
      const updatedProfile = {
        ...profile,
        activityLevel: editActivity,
        currentWeightLbs: editCurrentWeight,
        goalWeightLbs: editGoalWeight,
      };

      const newPlan = buildGoalPlan({
        profile: updatedProfile,
        goalType: editGoalType,
        timeframeWeeks: editTimeframe,
      });

      setPlan(newPlan);
      haptics.impact("medium");

      Alert.alert(
        t("progress.planUpdated"),
        `${t("goals.calDay")}: ${newPlan.calorieBudget}\n${t("home.protein")}: ${newPlan.macros.protein}g · ${t("home.carbs")}: ${newPlan.macros.carbs}g · ${t("home.fat")}: ${newPlan.macros.fat}g`
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : t("common.error");
      Alert.alert(t("common.error"), msg);
    }
  }, [
    canCalculate,
    editGoalType,
    editActivity,
    editCurrentWeight,
    editGoalWeight,
    editTimeframe,
    profile,
    setGoalType,
    updateProfile,
    setTimeframeWeeks,
    setPlan,
  ]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            {t("goals.title")}
          </TText>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Current Plan Summary ── */}
          <Animated.View entering={FadeIn.duration(400)}>
            <GlassSurface intensity="medium" style={styles.summaryCard}>
              {plan ? (
                <>
                  <View style={styles.summaryRow}>
                    <View style={styles.summaryItem}>
                      <TText
                        style={[
                          styles.summaryValue,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {plan.calorieBudget}
                      </TText>
                      <TText
                        style={[
                          styles.summaryLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {t("goals.calDay")}
                      </TText>
                    </View>
                    <View
                      style={[
                        styles.summaryDivider,
                        { backgroundColor: theme.colors.border },
                      ]}
                    />
                    <View style={styles.summaryItem}>
                      <TText
                        style={[
                          styles.summaryValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {plan.macros.protein}g
                      </TText>
                      <TText
                        style={[
                          styles.summaryLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {t("home.protein")}
                      </TText>
                    </View>
                    <View
                      style={[
                        styles.summaryDivider,
                        { backgroundColor: theme.colors.border },
                      ]}
                    />
                    <View style={styles.summaryItem}>
                      <TText
                        style={[
                          styles.summaryValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {plan.macros.carbs}g
                      </TText>
                      <TText
                        style={[
                          styles.summaryLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {t("home.carbs")}
                      </TText>
                    </View>
                    <View
                      style={[
                        styles.summaryDivider,
                        { backgroundColor: theme.colors.border },
                      ]}
                    />
                    <View style={styles.summaryItem}>
                      <TText
                        style={[
                          styles.summaryValue,
                          { color: theme.colors.text },
                        ]}
                      >
                        {plan.macros.fat}g
                      </TText>
                      <TText
                        style={[
                          styles.summaryLabel,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {t("home.fat")}
                      </TText>
                    </View>
                  </View>
                  <TSpacer size="xs" />
                  <TText
                    style={[
                      styles.summaryMeta,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    {plan.goalType === "lose"
                      ? t("goals.losing")
                      : plan.goalType === "gain"
                        ? t("goals.gaining")
                        : t("goals.maintaining")}{" "}
                    ·{" "}
                    {plan.weeklyRateLbs > 0
                      ? `${plan.weeklyRateLbs} ${t("goals.lbsWk")}`
                      : t("goals.steady")}{" "}
                    · {plan.timeframeWeeks} {t("goals.weeks")}
                  </TText>
                </>
              ) : (
                <TText
                  style={[styles.noGoal, { color: theme.colors.textMuted }]}
                >
                  {t("goals.noplanYet")}
                </TText>
              )}
            </GlassSurface>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Goal Type ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <TText
              style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
            >
              {t("goals.goalSectionTitle")}
            </TText>
            <View style={styles.goalRow}>
              {GOAL_OPTIONS.map((opt) => {
                const selected = editGoalType === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      haptics.impact("light");
                      setEditGoalType(opt.id);
                    }}
                    style={[
                      styles.goalPill,
                      {
                        backgroundColor: selected
                          ? theme.colors.primary + "22"
                          : theme.colors.surfaceSecondary,
                        borderColor: selected
                          ? theme.colors.primary
                          : theme.colors.borderSecondary,
                      },
                    ]}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={
                        selected
                          ? theme.colors.primary
                          : theme.colors.textSecondary
                      }
                    />
                    <TText
                      style={[
                        styles.goalPillText,
                        {
                          color: selected
                            ? theme.colors.primary
                            : theme.colors.textSecondary,
                        },
                      ]}
                    >
                      {t(opt.labelKey)}
                    </TText>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Body & Weight ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <TText
              style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
            >
              {t("goals.weight")}
            </TText>
            <GlassSurface intensity="light" style={styles.card}>
              <Stepper
                label={t("goals.currentWeight")}
                value={displayCurrentWeight}
                unit={weightUnit}
                onDecrement={() =>
                  setEditCurrentWeight((w) =>
                    lbsFromDisplay(displayWeight(w) - 1)
                  )
                }
                onIncrement={() =>
                  setEditCurrentWeight((w) =>
                    lbsFromDisplay(displayWeight(w) + 1)
                  )
                }
                min={lbsFromDisplay(60)}
                max={lbsFromDisplay(500)}
              />
              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.border },
                ]}
              />
              <Stepper
                label={t("goals.goalWeight")}
                value={displayGoalWeight}
                unit={weightUnit}
                onDecrement={() =>
                  setEditGoalWeight((w) => lbsFromDisplay(displayWeight(w) - 1))
                }
                onIncrement={() =>
                  setEditGoalWeight((w) => lbsFromDisplay(displayWeight(w) + 1))
                }
                min={lbsFromDisplay(60)}
                max={lbsFromDisplay(500)}
              />
            </GlassSurface>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Activity Level ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <TText
              style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
            >
              {t("goals.activityLevel").toUpperCase()}
            </TText>
            <GlassSurface intensity="light" style={styles.card}>
              {ACTIVITY_OPTIONS.map((opt, i) => {
                const selected = editActivity === opt.id;
                return (
                  <React.Fragment key={opt.id}>
                    {i > 0 && (
                      <View
                        style={[
                          styles.divider,
                          { backgroundColor: theme.colors.border },
                        ]}
                      />
                    )}
                    <Pressable
                      onPress={() => {
                        haptics.impact("light");
                        setEditActivity(opt.id);
                      }}
                      style={styles.activityRow}
                    >
                      <View style={styles.activityInfo}>
                        <TText
                          style={[
                            styles.activityLabel,
                            { color: theme.colors.text },
                          ]}
                        >
                          {t(opt.labelKey)}
                        </TText>
                        <TText
                          style={[
                            styles.activityDesc,
                            { color: theme.colors.textMuted },
                          ]}
                        >
                          {t(opt.descKey)}
                        </TText>
                      </View>
                      <View
                        style={[
                          styles.radio,
                          {
                            borderColor: selected
                              ? theme.colors.primary
                              : theme.colors.borderSecondary,
                          },
                        ]}
                      >
                        {selected && (
                          <View
                            style={[
                              styles.radioInner,
                              { backgroundColor: theme.colors.primary },
                            ]}
                          />
                        )}
                      </View>
                    </Pressable>
                  </React.Fragment>
                );
              })}
            </GlassSurface>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Timeframe ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <TText
              style={[styles.sectionTitle, { color: theme.colors.textMuted }]}
            >
              {t("goals.timeframe").toUpperCase()}
            </TText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.timeframeScroll}
            >
              {TIMEFRAME_OPTIONS.map((weeks) => {
                const selected = editTimeframe === weeks;
                return (
                  <Pressable
                    key={weeks}
                    onPress={() => {
                      haptics.impact("light");
                      setEditTimeframe(weeks);
                    }}
                    style={[
                      styles.timeframePill,
                      {
                        backgroundColor: selected
                          ? theme.colors.primary + "22"
                          : theme.colors.surfaceSecondary,
                        borderColor: selected
                          ? theme.colors.primary
                          : theme.colors.borderSecondary,
                      },
                    ]}
                  >
                    <TText
                      style={[
                        styles.timeframePillText,
                        {
                          color: selected
                            ? theme.colors.primary
                            : theme.colors.textSecondary,
                          fontWeight: selected ? "700" : "500",
                        },
                      ]}
                    >
                      {weeks}w
                    </TText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Recalculate Button ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <Pressable
              onPress={handleRecalculate}
              style={[
                styles.recalcBtn,
                {
                  backgroundColor:
                    hasChanges || !plan
                      ? theme.colors.primary
                      : theme.colors.surfaceSecondary,
                  opacity: hasChanges || !plan ? 1 : 0.5,
                },
              ]}
            >
              <Ionicons
                name="calculator-outline"
                size={20}
                color={hasChanges || !plan ? "#fff" : theme.colors.textMuted}
              />
              <TText
                style={[
                  styles.recalcBtnText,
                  {
                    color:
                      hasChanges || !plan ? "#fff" : theme.colors.textMuted,
                  },
                ]}
              >
                {plan ? t("settings.recalculatePlan") : "Calculate Plan"}
              </TText>
            </Pressable>
          </Animated.View>

          <TSpacer size="xl" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  // Summary card
  summaryCard: {
    padding: 20,
    borderRadius: 20,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  summaryMeta: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 8,
  },
  noGoal: {
    fontSize: 14,
    textAlign: "center",
    paddingVertical: 12,
  },

  // Section
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
    paddingHorizontal: 4,
  },

  // Goal pills
  goalRow: {
    flexDirection: "row",
    gap: 10,
  },
  goalPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  goalPillText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Card
  card: {
    padding: 16,
    borderRadius: 16,
  },

  // Stepper
  stepperRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  stepperLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  stepperControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 80,
    textAlign: "center",
  },

  // Divider
  divider: {
    height: 1,
    marginVertical: 4,
  },

  // Activity
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  activityInfo: { flex: 1 },
  activityLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  activityDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  // Timeframe
  timeframeScroll: {
    gap: 10,
    paddingVertical: 4,
  },
  timeframePill: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  timeframePillText: {
    fontSize: 14,
  },

  // Recalculate button
  recalcBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  recalcBtnText: {
    fontSize: 16,
    fontWeight: "700",
  },
});
