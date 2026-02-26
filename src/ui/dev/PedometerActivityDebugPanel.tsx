/**
 * PedometerActivityDebugPanel
 *
 * Dev-only panel for testing the Pedometer Live Activity.
 * Uses the real device CMPedometer to track actual steps,
 * distance, floors, and pace throughout the day.
 *
 * Provides:
 *   - Start (with configurable step goal)
 *   - Live data polling
 *   - End
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
    pedometerActivity,
    type PedometerData,
} from "../../infrastructure/liveActivity/PedometerActivity";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../glass/GlassCard";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

const DEFAULT_STEP_GOAL = 10_000;

export function PedometerActivityDebugPanel() {
  const { theme } = useTheme();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [data, setData] = useState<PedometerData | null>(null);
  const [stepGoal, setStepGoal] = useState(DEFAULT_STEP_GOAL);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const supported = pedometerActivity.isSupported();
  const pedometerAvailable = pedometerActivity.isPedometerAvailable();

  // Poll for live data while tracking
  useEffect(() => {
    if (activeId) {
      pollRef.current = setInterval(() => {
        const snapshot = pedometerActivity.getData();
        if (snapshot) {
          setData(snapshot);
        }
      }, 3000); // Every 3 seconds
    } else {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [activeId]);

  const handleStart = useCallback(() => {
    setData(null);
    const result = pedometerActivity.start({ stepGoal });

    setLastResult(`start → ${result.status}`);
    if (result.status === "started") {
      setActiveId(result.activityId);
    } else if (result.status === "unavailable") {
      setLastResult(`start → ${result.reason}`);
    }
  }, [stepGoal]);

  const handleEnd = useCallback(() => {
    if (!activeId) {
      setLastResult("end → no active activity");
      return;
    }

    const result = pedometerActivity.end();
    setLastResult(`end → ${result.status}`);
    if (result.status === "ended") {
      setActiveId(null);
      setData(null);
    }
  }, [activeId]);

  const handleRefresh = useCallback(() => {
    const snapshot = pedometerActivity.getData();
    if (snapshot) {
      setData(snapshot);
      setLastResult(
        `refresh → ${snapshot.steps} steps, ${formatDistance(snapshot.distance)}`
      );
    } else {
      setLastResult("refresh → no data");
    }
  }, []);

  const adjustGoal = useCallback((delta: number) => {
    setStepGoal((g) => Math.max(1000, g + delta));
  }, []);

  return (
    <GlassCard padding="md" style={styles.card}>
      {/* Header */}
      <View style={styles.row}>
        <Ionicons
          name="footsteps-outline"
          size={20}
          color={theme.colors.info}
        />
        <TText style={[styles.title, { color: theme.colors.text }]}>
          Pedometer Activity
        </TText>
        <View style={{ flex: 1 }} />
        {activeId && (
          <View
            style={[
              styles.liveBadge,
              { backgroundColor: theme.colors.success + "20" },
            ]}
          >
            <View
              style={[
                styles.liveDot,
                { backgroundColor: theme.colors.success },
              ]}
            />
            <TText
              style={{
                color: theme.colors.success,
                fontSize: 11,
                fontWeight: "600",
              }}
            >
              LIVE
            </TText>
          </View>
        )}
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

      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          CMPedometer
        </TText>
        <TText
          style={{
            color: pedometerAvailable
              ? theme.colors.success
              : theme.colors.error,
            fontWeight: "500",
            fontSize: 14,
          }}
        >
          {pedometerAvailable ? "Available" : "Not available"}
        </TText>
      </View>

      <TSpacer size="xs" />

      {/* Step goal adjuster */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          Step Goal
        </TText>
        <View style={styles.goalAdjuster}>
          <Pressable
            onPress={() => adjustGoal(-1000)}
            disabled={!!activeId}
            style={[
              styles.goalBtn,
              { borderColor: theme.colors.border },
              activeId ? { opacity: 0.4 } : undefined,
            ]}
          >
            <TText style={{ color: theme.colors.text, fontSize: 14 }}>−</TText>
          </Pressable>
          <TText
            style={{
              color: theme.colors.text,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            {stepGoal.toLocaleString()}
          </TText>
          <Pressable
            onPress={() => adjustGoal(1000)}
            disabled={!!activeId}
            style={[
              styles.goalBtn,
              { borderColor: theme.colors.border },
              activeId ? { opacity: 0.4 } : undefined,
            ]}
          >
            <TText style={{ color: theme.colors.text, fontSize: 14 }}>+</TText>
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

      {/* ── Live Data ── */}
      {data && (
        <>
          <TSpacer size="md" />
          <View
            style={[
              styles.dataCard,
              { backgroundColor: theme.colors.backgroundSecondary },
            ]}
          >
            <DataRow
              icon="footsteps"
              label="Steps"
              value={`${data.steps.toLocaleString()} / ${data.stepGoal.toLocaleString()}`}
              valueColor={
                data.steps >= data.stepGoal
                  ? theme.colors.success
                  : theme.colors.text
              }
              theme={theme}
            />
            <DataRow
              icon="navigate"
              label="Distance"
              value={formatDistance(data.distance)}
              valueColor={theme.colors.text}
              theme={theme}
            />
            <DataRow
              icon="arrow-up"
              label="Floors"
              value={`${data.floorsAscended}`}
              valueColor={theme.colors.text}
              theme={theme}
            />
            <DataRow
              icon="speedometer"
              label="Pace"
              value={data.pace > 0 ? `${Math.round(data.pace)} steps/min` : "—"}
              valueColor={theme.colors.text}
              theme={theme}
            />
            <DataRow
              icon="time"
              label="Elapsed"
              value={formatElapsed(data.elapsedSeconds)}
              valueColor={theme.colors.text}
              theme={theme}
            />
          </View>
        </>
      )}

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
          label="Refresh"
          icon="refresh-outline"
          onPress={handleRefresh}
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
        Uses real CMPedometer data — walk around to see live updates.{"\n"}Step
        progress ring fills clockwise toward your goal.{"\n"}Data auto-refreshes
        every 3 seconds while tracking.
      </TText>
    </GlassCard>
  );
}

// ── Helpers ──

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

// ── Sub-components ──

function DataRow({
  icon,
  label,
  value,
  valueColor,
  theme,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  valueColor: string;
  theme: any;
}) {
  return (
    <View style={styles.dataRow}>
      <View style={styles.dataRowLeft}>
        <Ionicons name={icon} size={14} color={theme.colors.textMuted} />
        <TText style={[styles.dataLabel, { color: theme.colors.textMuted }]}>
          {label}
        </TText>
      </View>
      <TText style={[styles.dataValue, { color: valueColor }]}>{value}</TText>
    </View>
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
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 13, fontWeight: "500" },
  tokenText: { fontSize: 12, maxWidth: 180 },
  goalAdjuster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  goalBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dataCard: {
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dataRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dataLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  dataValue: {
    fontSize: 14,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
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
