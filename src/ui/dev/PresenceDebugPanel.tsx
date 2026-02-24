/**
 * PresenceDebugPanel
 *
 * Dev-only panel for testing presence/lifecycle infrastructure.
 * Shows current lifecycle state and logs transitions.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { presence } from "../../infrastructure/presence";
import type { AppLifecycleState } from "../../infrastructure/presence/types";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../glass/GlassCard";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

interface LogEntry {
  state: AppLifecycleState;
  time: string;
}

function stateColor(
  state: AppLifecycleState,
  colors: { success: string; warning: string; error: string }
): string {
  if (state === "active") return colors.success;
  if (state === "background") return colors.error;
  return colors.warning;
}

function stateLabel(state: AppLifecycleState): string {
  if (state === "active") return "Active";
  if (state === "background") return "Background";
  return "Inactive";
}

export function PresenceDebugPanel() {
  const { theme } = useTheme();
  const [currentState, setCurrentState] = useState<AppLifecycleState>(
    presence.getState()
  );
  const [log, setLog] = useState<LogEntry[]>([
    {
      state: presence.getState(),
      time: new Date().toLocaleTimeString(),
    },
  ]);

  useEffect(() => {
    const unsub = presence.onChange((state) => {
      setCurrentState(state);
      setLog((prev) => [
        { state, time: new Date().toLocaleTimeString() },
        ...prev.slice(0, 19), // keep last 20
      ]);
    });
    return unsub;
  }, []);

  return (
    <GlassCard padding="md" style={styles.card}>
      {/* Header */}
      <View style={styles.row}>
        <Ionicons name="pulse-outline" size={20} color={theme.colors.primary} />
        <TText style={[styles.title, { color: theme.colors.text }]}>
          Presence / Lifecycle
        </TText>
      </View>

      <TSpacer size="sm" />

      {/* Current state */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          Current State
        </TText>
        <View style={styles.statusPill}>
          <View
            style={[
              styles.dot,
              {
                backgroundColor: stateColor(currentState, theme.colors),
              },
            ]}
          />
          <TText
            style={[
              styles.statusText,
              { color: stateColor(currentState, theme.colors) },
            ]}
          >
            {stateLabel(currentState)}
          </TText>
        </View>
      </View>

      <TSpacer size="md" />

      {/* Transition log */}
      <TText color="muted" style={styles.label}>
        Transition Log
      </TText>
      <TSpacer size="xs" />
      <View style={styles.logContainer}>
        {log.map((entry, i) => (
          <View key={`${entry.time}-${i}`} style={styles.logRow}>
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: stateColor(entry.state, theme.colors),
                },
              ]}
            />
            <TText color="muted" style={styles.logTime}>
              {entry.time}
            </TText>
            <TText style={{ color: theme.colors.text }}>
              {stateLabel(entry.state)}
            </TText>
          </View>
        ))}
        {log.length === 0 && (
          <TText color="muted">No transitions recorded yet.</TText>
        )}
      </View>

      <TSpacer size="sm" />
      <TText color="muted" style={styles.hint}>
        Background the app or switch to another app to see transitions.
      </TText>
    </GlassCard>
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
  statusPill: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 14, fontWeight: "500" },
  label: { fontSize: 13, fontWeight: "500" },
  logContainer: { gap: 4 },
  logRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  logTime: { fontSize: 12, minWidth: 80 },
  hint: { fontSize: 12, fontStyle: "italic" },
});
