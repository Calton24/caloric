/**
 * CalorieBudgetActivityDebugPanel
 *
 * Dev-only panel for testing the Calorie Budget Live Activity.
 * Shows a budget ring filling as calories are consumed, with
 * an activity bonus that increases the total budget.
 *
 * Provides:
 *   - Start (with configurable base goal)
 *   - Simulate Eating (+200 consumed)
 *   - Simulate Activity (+100 activity bonus)
 *   - End
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
    calorieBudgetActivity,
    type CalorieBudgetMode,
    type CalorieBudgetStartResult,
} from "../../infrastructure/liveActivity/CalorieBudgetActivity";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../glass/GlassCard";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

const BASE_GOAL = 2_000; // kcal
const EAT_INCREMENT = 200; // kcal per "eat" tap
const ACTIVITY_INCREMENT = 100; // kcal bonus per "exercise" tap

export function CalorieBudgetActivityDebugPanel() {
  const { theme } = useTheme();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [mode, setMode] = useState<CalorieBudgetMode>("adaptive");
  const supported = calorieBudgetActivity.isSupported();

  // Simulated budget state
  const consumedRef = useRef(0);
  const bonusRef = useRef(0);

  const handleStart = useCallback(() => {
    consumedRef.current = 0;
    bonusRef.current = 0;

    const result: CalorieBudgetStartResult = calorieBudgetActivity.start({
      baseGoal: BASE_GOAL,
      consumed: 0,
      activityBonus: 0,
      mode,
    });

    setLastResult(`start → ${result.status}`);
    if (result.status === "started") {
      setActiveId(result.activityId);
    }
  }, []);

  const handleEat = useCallback(() => {
    if (!activeId) {
      setLastResult("eat → no active activity");
      return;
    }

    consumedRef.current += EAT_INCREMENT;

    const result = calorieBudgetActivity.update(activeId, {
      consumed: consumedRef.current,
      activityBonus: bonusRef.current,
    });

    const budget = mode === "strict" ? BASE_GOAL : BASE_GOAL + bonusRef.current;
    const remaining = budget - consumedRef.current;
    setLastResult(
      `update → ${result.status}  (${consumedRef.current}/${budget} cal, ${remaining} left)`
    );
  }, [activeId, mode]);

  const handleExercise = useCallback(() => {
    if (!activeId) {
      setLastResult("exercise → no active activity");
      return;
    }

    bonusRef.current += ACTIVITY_INCREMENT;

    const result = calorieBudgetActivity.update(activeId, {
      consumed: consumedRef.current,
      activityBonus: bonusRef.current,
    });

    const budget = mode === "strict" ? BASE_GOAL : BASE_GOAL + bonusRef.current;
    const remaining = budget - consumedRef.current;
    setLastResult(
      `update → ${result.status}  (+${bonusRef.current} earned, budget ${budget}, ${remaining} left)`
    );
  }, [activeId, mode]);

  const handleEnd = useCallback(() => {
    if (!activeId) {
      setLastResult("end → no active activity");
      return;
    }

    const result = calorieBudgetActivity.end(activeId);
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
          name="restaurant-outline"
          size={20}
          color={theme.colors.primary}
        />
        <TText style={[styles.title, { color: theme.colors.text }]}>
          Calorie Budget Activity
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
          Base Goal
        </TText>
        <TText color="muted" style={styles.label}>
          {BASE_GOAL} kcal
        </TText>
      </View>

      <TSpacer size="xs" />

      {/* Mode toggle */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          Mode
        </TText>
        <View style={{ flexDirection: "row", gap: 6 }}>
          <Pressable
            onPress={() => !activeId && setMode("strict")}
            style={[
              styles.modePill,
              {
                borderColor:
                  mode === "strict"
                    ? theme.colors.warning
                    : theme.colors.border,
                backgroundColor:
                  mode === "strict"
                    ? theme.colors.warning + "20"
                    : "transparent",
              },
              activeId != null && { opacity: 0.4 },
            ]}
          >
            <TText
              style={{
                fontSize: 11,
                fontWeight: mode === "strict" ? "700" : "500",
                color:
                  mode === "strict" ? theme.colors.warning : theme.colors.muted,
              }}
            >
              Strict
            </TText>
          </Pressable>
          <Pressable
            onPress={() => !activeId && setMode("adaptive")}
            style={[
              styles.modePill,
              {
                borderColor:
                  mode === "adaptive"
                    ? theme.colors.success
                    : theme.colors.border,
                backgroundColor:
                  mode === "adaptive"
                    ? theme.colors.success + "20"
                    : "transparent",
              },
              activeId != null && { opacity: 0.4 },
            ]}
          >
            <TText
              style={{
                fontSize: 11,
                fontWeight: mode === "adaptive" ? "700" : "500",
                color:
                  mode === "adaptive"
                    ? theme.colors.success
                    : theme.colors.muted,
              }}
            >
              Adaptive
            </TText>
          </Pressable>
        </View>
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
          label="Eat +200"
          icon="fast-food-outline"
          onPress={handleEat}
          theme={theme}
          disabled={!activeId}
        />
        <ActionButton
          label="Exercise +100"
          icon="barbell-outline"
          onPress={handleExercise}
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
        {mode === "strict"
          ? `Strict: Budget fixed at ${BASE_GOAL} kcal. Exercise bonus is tracked but does NOT increase your budget.`
          : `Adaptive: Budget = ${BASE_GOAL} goal + activity bonus. Ring goes green → amber (90%) → red (over).`}
        {"\n"}Tap &ldquo;Eat +200&rdquo; to simulate meals
        {mode === "adaptive" ? ', "Exercise +100" to earn more' : ""}.
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
  modePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  hint: { fontSize: 12, fontStyle: "italic" },
});
