/**
 * Analytics Widgets Demo Screen
 * Demonstrates: SpendingCard, ActivityRings, StepCounter,
 * HeartRateCard, SleepChart, WaterTracker.
 */

import { Redirect, useRouter } from "expo-router";
import React from "react";
import { StyleSheet } from "react-native";
import { ActivityRings } from "../../../src/ui/analytics/ActivityRings";
import { HeartRateCard } from "../../../src/ui/analytics/HeartRateCard";
import { NetCaloriesWidget } from "../../../src/ui/analytics/NetCaloriesWidget";
import { SleepChart } from "../../../src/ui/analytics/SleepChart";
import { SpendingCard } from "../../../src/ui/analytics/SpendingCard";
import { StepCounter } from "../../../src/ui/analytics/StepCounter";
import { WaterTracker } from "../../../src/ui/analytics/WaterTracker";
import { GlassHeader } from "../../../src/ui/patterns/GlassHeader";
import { ScreenShell } from "../../../src/ui/patterns/ScreenShell";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function WidgetsScreen() {
  const router = useRouter();

  // DEV-only gate — all hooks must be called before this
  if (!__DEV__) return <Redirect href="/(tabs)/mobile-core" />;

  return (
    <ScreenShell
      header={
        <GlassHeader
          title="Analytics Widgets"
          subtitle="Data visualization"
          onBack={() => router.back()}
        />
      }
    >
      <TSpacer size="md" />

      {/* ── Finance ── */}
      <TText variant="heading" style={s.sectionTitle}>
        Finance — Spending
      </TText>
      <SpendingCard
        title="Spent this month"
        amount={157}
        currency="£"
        change={157}
        data={[
          0, 0, 0, 0, 0, 120, 120, 120, 120, 120, 157, 157, 157, 157, 157, 157,
          157, 157, 157, 157, 157,
        ]}
        projectedData={[157, 157, 157, 157, 157, 157, 157]}
        periodLabels={["1", "6", "11", "16", "21", "28"]}
      />

      <TSpacer size="lg" />

      {/* ── Activity Rings ── */}
      <TText variant="heading" style={s.sectionTitle}>
        Fitness — Activity Rings
      </TText>
      <ActivityRings
        rings={[
          {
            label: "Move",
            current: 420,
            goal: 500,
            color: "#FF3B30",
            unit: "cal",
          },
          {
            label: "Exercise",
            current: 28,
            goal: 30,
            color: "#4CD964",
            unit: "min",
          },
          {
            label: "Stand",
            current: 10,
            goal: 12,
            color: "#5AC8FA",
            unit: "hrs",
          },
        ]}
      />

      <TSpacer size="lg" />

      {/* ── Steps ── */}
      <TText variant="heading" style={s.sectionTitle}>
        Fitness — Steps
      </TText>
      <StepCounter
        steps={8432}
        goal={10000}
        distance={5.8}
        calories={320}
        activeMinutes={42}
      />

      <TSpacer size="lg" />

      {/* ── Calorie Budget ── */}
      <TText variant="heading" style={s.sectionTitle}>
        Nutrition — Calorie Budget
      </TText>
      <NetCaloriesWidget
        baseGoal={2000}
        consumed={1580}
        activityBonus={500}
        subtitle="Live from activity"
      />

      <TSpacer size="md" />

      <NetCaloriesWidget
        baseGoal={2000}
        consumed={2300}
        activityBonus={200}
        title="Over Budget Demo"
        subtitle="Consumed exceeds budget"
      />

      <TSpacer size="lg" />

      {/* ── Heart Rate ── */}
      <TText variant="heading" style={s.sectionTitle}>
        Health — Heart Rate
      </TText>
      <HeartRateCard
        currentBpm={72}
        data={[
          68, 70, 72, 71, 73, 75, 72, 70, 68, 72, 74, 76, 73, 71, 69, 72, 78,
          82, 79, 74, 71, 70, 68, 67,
        ]}
        min={58}
        max={142}
        avg={72}
        restingBpm={62}
      />

      <TSpacer size="lg" />

      {/* ── Sleep ── */}
      <TText variant="heading" style={s.sectionTitle}>
        Health — Sleep
      </TText>
      <SleepChart
        data={[
          { day: "Mon", deep: 1.5, light: 3, rem: 1.5, awake: 0.5 },
          { day: "Tue", deep: 2, light: 3.5, rem: 1, awake: 0.3 },
          { day: "Wed", deep: 1.2, light: 3.8, rem: 1.2, awake: 0.8 },
          { day: "Thu", deep: 1.8, light: 3.2, rem: 1.4, awake: 0.4 },
          { day: "Fri", deep: 2.1, light: 2.8, rem: 1.6, awake: 0.2 },
          { day: "Sat", deep: 2.5, light: 3.5, rem: 1.8, awake: 0.2 },
          { day: "Sun", deep: 1.9, light: 3.1, rem: 1.5, awake: 0.5 },
        ]}
        averageHours={7.2}
        qualityScore={85}
      />

      <TSpacer size="lg" />

      {/* ── Hydration ── */}
      <TText variant="heading" style={s.sectionTitle}>
        Health — Hydration
      </TText>
      <WaterTracker
        current={1.4}
        goal={2.5}
        unit="L"
        glasses={6}
        glassSize={0.25}
      />

      <TSpacer size="xxl" />
    </ScreenShell>
  );
}

const s = StyleSheet.create({
  sectionTitle: { marginBottom: 12 },
});
