/**
 * FitnessActivityDebugPanel
 *
 * Dev-only panel for testing the Fitness Live Activity.
 * Shows a calorie ring depleting as you increase calories,
 * with step count on the left in the Dynamic Island.
 *
 * Provides:
 *   - Start (with configurable calorie goal)
 *   - Simulate walking (increments steps / calories / distance)
 *   - End
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
    fitnessActivity,
    type FitnessStartResult,
} from "../../infrastructure/liveActivity/FitnessActivity";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../glass/GlassCard";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

const CALORIE_GOAL = 2_000; // kcal
const STEP_INCREMENT = 500;
const CALORIE_INCREMENT = 60;
const DISTANCE_INCREMENT = 0.4; // km

export function FitnessActivityDebugPanel() {
  const { theme } = useTheme();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const supported = fitnessActivity.isSupported();

  // Simulated fitness state
  const stepsRef = useRef(0);
  const calsRef = useRef(0);
  const distRef = useRef(0);

  const handleStart = useCallback(() => {
    stepsRef.current = 0;
    calsRef.current = 0;
    distRef.current = 0;

    const result: FitnessStartResult = fitnessActivity.start({
      calorieGoal: CALORIE_GOAL,
      steps: 0,
      caloriesUsed: 0,
      distance: 0,
    });

    setLastResult(`start → ${result.status}`);
    if (result.status === "started") {
      setActiveId(result.activityId);
    }
  }, []);

  const handleSimulate = useCallback(() => {
    if (!activeId) {
      setLastResult("simulate → no active activity");
      return;
    }

    stepsRef.current += STEP_INCREMENT;
    calsRef.current = Math.min(
      calsRef.current + CALORIE_INCREMENT,
      CALORIE_GOAL
    );
    distRef.current = +(distRef.current + DISTANCE_INCREMENT).toFixed(1);

    const result = fitnessActivity.update(activeId, {
      steps: stepsRef.current,
      caloriesUsed: calsRef.current,
      distance: distRef.current,
    });

    setLastResult(
      `update → ${result.status}  (${stepsRef.current} steps, ${calsRef.current} kcal, ${distRef.current} km)`
    );
  }, [activeId]);

  const handleEnd = useCallback(() => {
    if (!activeId) {
      setLastResult("end → no active activity");
      return;
    }

    const result = fitnessActivity.end(activeId);
    setLastResult(`end → ${result.status}`);
    if (result.status === "ended") {
      setActiveId(null);
    }
  }, [activeId]);

  return (
    <GlassCard padding="md" style={styles.card}>
      {/* Header */}
      <View style={styles.row}>
        <Ionicons
          name="fitness-outline"
          size={20}
          color={theme.colors.primary}
        />
        <TText style={[styles.title, { color: theme.colors.text }]}>
          Fitness Activity
        </TText>
      </View>

      <TSpacer size="sm" />

      {/* Support status */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          ActivityKit
        </TText>
        <TText
          style={{
            color: supported ? theme.colors.success : theme.colors.error,
            fontWeight: "500",
            fontSize: 14,
          }}
        >
          {supported ? "Available" : "Not available"}
        </TText>
      </View>

      <TSpacer size="xs" />

      {/* Goal info */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          Calorie Goal
        </TText>
        <TText color="muted" style={styles.label}>
          {CALORIE_GOAL} kcal
        </TText>
      </View>

      <TSpacer size="xs" />

      {/* Active ID */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          Active ID
        </TText>
        <TText
          color="muted"
          style={styles.tokenText}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {activeId ?? "—"}
        </TText>
      </View>

      <TSpacer size="md" />

      {/* Actions */}
      <View style={styles.actions}>
        <ActionButton
          label="Start"
          icon="play-outline"
          onPress={handleStart}
          theme={theme}
          disabled={!!activeId}
        />
        <ActionButton
          label="Walk +500"
          icon="walk-outline"
          onPress={handleSimulate}
          theme={theme}
          disabled={!activeId}
        />
        <ActionButton
          label="End"
          icon="stop-outline"
          onPress={handleEnd}
          theme={theme}
          disabled={!activeId}
        />
      </View>

      {/* Last result */}
      {lastResult && (
        <>
          <TSpacer size="sm" />
          <TText color="muted" style={styles.hint}>
            Last: {lastResult}
          </TText>
        </>
      )}

      <TSpacer size="sm" />
      <TText color="muted" style={styles.hint}>
        Steps on the left, calorie ring on the right.{"\n"}The ring depletes as
        calories are burned toward the {CALORIE_GOAL} kcal goal.{"\n"}Tap
        &ldquo;Walk +500&rdquo; to simulate activity.
      </TText>
    </GlassCard>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  theme,
  disabled,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  theme: any;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.actionBtn,
        { borderColor: theme.colors.border },
        disabled && { opacity: 0.4 },
      ]}
    >
      <Ionicons name={icon} size={16} color={theme.colors.primary} />
      <TText style={{ color: theme.colors.text, fontSize: 13 }}>{label}</TText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 0 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 16, fontWeight: "600" },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 13, fontWeight: "500" },
  tokenText: { fontSize: 12, maxWidth: 180 },
  actions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  hint: { fontSize: 12, fontStyle: "italic" },
});
