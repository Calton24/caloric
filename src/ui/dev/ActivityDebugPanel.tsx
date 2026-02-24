/**
 * ActivityDebugPanel
 *
 * Dev-only panel for testing Activity Monitor infrastructure.
 * Buttons to start / update / end example activities, shows current state.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { activityMonitor } from "../../infrastructure/activityMonitor";
import { activityStore } from "../../infrastructure/activityMonitor/store";
import type { ActivityState } from "../../infrastructure/activityMonitor/types";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../glass/GlassCard";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

function payloadSummary(state: ActivityState): string {
  const { payload } = state;
  switch (payload.type) {
    case "steps":
      return `${payload.current} / ${payload.goal} steps`;
    case "eta":
      return `ETA: ${payload.estimatedArrival}`;
    case "timer":
      return `${payload.elapsedSeconds}s / ${payload.totalSeconds}s`;
    case "progress":
      return `${Math.round(payload.progress * 100)}%`;
    default:
      return "Unknown";
  }
}

export function ActivityDebugPanel() {
  const { theme } = useTheme();
  const [activities, setActivities] = useState<ActivityState[]>([]);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setActivities(activityStore.getAll());
  }, []);

  const handleStartSteps = useCallback(() => {
    const result = activityMonitor.start("steps-demo", {
      type: "steps",
      current: 1200,
      goal: 10000,
      label: "Daily Steps",
    });
    setLastResult(`start → ${result}`);
    refresh();
  }, [refresh]);

  const handleStartEta = useCallback(() => {
    const eta = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const result = activityMonitor.start("eta-demo", {
      type: "eta",
      estimatedArrival: eta,
      label: "Pizza Delivery",
      status: "On the way",
    });
    setLastResult(`start → ${result}`);
    refresh();
  }, [refresh]);

  const handleUpdateSteps = useCallback(() => {
    const existing = activityStore.get("steps-demo");
    if (!existing || existing.payload.type !== "steps") {
      setLastResult("update → no steps activity to update");
      return;
    }
    const result = activityMonitor.update("steps-demo", {
      type: "steps",
      current: Math.min(existing.payload.current + 500, 10000),
      goal: 10000,
      label: "Daily Steps",
    });
    setLastResult(`update → ${result}`);
    refresh();
  }, [refresh]);

  const handleEndAll = useCallback(() => {
    const all = activityStore.getAll();
    for (const act of all) {
      activityMonitor.end(act.id);
    }
    setLastResult(`ended ${all.length} activities`);
    refresh();
  }, [refresh]);

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
          Activity Monitor
        </TText>
      </View>

      <TSpacer size="sm" />

      {/* Supported */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          Supported
        </TText>
        <TText
          style={{
            color: activityMonitor.isSupported()
              ? theme.colors.success
              : theme.colors.error,
            fontWeight: "500",
            fontSize: 14,
          }}
        >
          {activityMonitor.isSupported() ? "Yes" : "No"}
        </TText>
      </View>

      <TSpacer size="sm" />

      {/* Active count */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          Active
        </TText>
        <TText style={{ color: theme.colors.text, fontSize: 14 }}>
          {activities.length} activities
        </TText>
      </View>

      <TSpacer size="md" />

      {/* Actions */}
      <View style={styles.actions}>
        <ActionButton
          label="Start Steps"
          icon="footsteps-outline"
          onPress={handleStartSteps}
          theme={theme}
        />
        <ActionButton
          label="Start ETA"
          icon="time-outline"
          onPress={handleStartEta}
          theme={theme}
        />
        <ActionButton
          label="+500 Steps"
          icon="arrow-up-outline"
          onPress={handleUpdateSteps}
          theme={theme}
        />
        <ActionButton
          label="End All"
          icon="close-circle-outline"
          onPress={handleEndAll}
          theme={theme}
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

      {/* Activity list */}
      {activities.length > 0 && (
        <>
          <TSpacer size="md" />
          <TText color="muted" style={styles.label}>
            Current Activities
          </TText>
          <TSpacer size="xs" />
          {activities.map((act) => (
            <View key={act.id} style={styles.actRow}>
              <TText style={{ color: theme.colors.text, fontWeight: "500" }}>
                {act.id}
              </TText>
              <TText color="muted" style={{ fontSize: 12 }}>
                {payloadSummary(act)}
              </TText>
            </View>
          ))}
        </>
      )}
    </GlassCard>
  );
}

function ActionButton({
  label,
  icon,
  onPress,
  theme,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.actionBtn, { borderColor: theme.colors.border }]}
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
  actRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
});
