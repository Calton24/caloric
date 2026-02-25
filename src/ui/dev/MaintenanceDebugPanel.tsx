/**
 * MaintenanceDebugPanel
 *
 * Dev-only panel for testing the maintenance / degraded-mode system.
 * Shows current resolved state, allows forcing overrides, and
 * triggering on-demand health checks.
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import {
    getHealthMonitor,
    maintenance,
} from "../../infrastructure/maintenance";
import type { MaintenanceState } from "../../infrastructure/maintenance/types";
import { DEFAULT_MAINTENANCE_STATE } from "../../infrastructure/maintenance/types";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../glass/GlassCard";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

// ── Helpers ──

function modeColor(
  mode: string,
  colors: { success: string; warning: string; error: string; info: string }
): string {
  switch (mode) {
    case "normal":
      return colors.success;
    case "degraded":
      return colors.warning;
    case "read_only":
      return colors.info;
    case "maintenance":
      return colors.error;
    default:
      return colors.warning;
  }
}

function modeLabel(mode: string): string {
  switch (mode) {
    case "normal":
      return "Normal";
    case "degraded":
      return "Degraded";
    case "read_only":
      return "Read-Only";
    case "maintenance":
      return "Maintenance";
    default:
      return mode;
  }
}

// ── Component ──

export function MaintenanceDebugPanel() {
  const { theme } = useTheme();
  const [state, setState] = useState<MaintenanceState>(
    DEFAULT_MAINTENANCE_STATE
  );
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const s = await maintenance.getState();
      setState(s);
    } catch {
      // never crash
    }
  }, []);

  useEffect(() => {
    void refresh();
    const unsub = maintenance.subscribe((s) => setState(s));
    const interval = setInterval(refresh, 10_000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [refresh]);

  const handleOverride = useCallback(
    async (mode: MaintenanceState["mode"]) => {
      try {
        await maintenance.setLocalOverride({
          mode,
          reason: "manual_override",
          message: `Debug override → ${mode}`,
          updatedAt: Date.now(),
        });
        await refresh();
      } catch {
        Alert.alert("Error", "Failed to set override");
      }
    },
    [refresh]
  );

  const handleClear = useCallback(async () => {
    try {
      await maintenance.setLocalOverride(null);
      await refresh();
    } catch {
      Alert.alert("Error", "Failed to clear override");
    }
  }, [refresh]);

  const handleCheckNow = useCallback(async () => {
    const monitor = getHealthMonitor();
    if (!monitor) {
      Alert.alert("No Monitor", "SupabaseHealthMonitor is not active.");
      return;
    }
    setLoading(true);
    try {
      await monitor.checkOnce();
      await refresh();
    } catch {
      // never crash
    } finally {
      setLoading(false);
    }
  }, [refresh]);

  const blocked =
    state.blockedFeatures && state.blockedFeatures.length > 0
      ? state.blockedFeatures.join(", ")
      : "none";

  return (
    <GlassCard padding="md" style={styles.card}>
      {/* Header */}
      <View style={styles.row}>
        <Ionicons
          name="construct-outline"
          size={20}
          color={theme.colors.primary}
        />
        <TText style={[styles.title, { color: theme.colors.text }]}>
          Maintenance
        </TText>
      </View>

      <TSpacer size="sm" />

      {/* Current state */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          Mode
        </TText>
        <View style={styles.statusPill}>
          <View
            style={[
              styles.dot,
              { backgroundColor: modeColor(state.mode, theme.colors) },
            ]}
          />
          <TText
            style={[
              styles.statusText,
              { color: modeColor(state.mode, theme.colors) },
            ]}
          >
            {modeLabel(state.mode)}
          </TText>
        </View>
      </View>

      <TSpacer size="xs" />

      <View style={styles.infoRow}>
        <TText color="muted" style={styles.label}>
          Reason
        </TText>
        <TText style={{ color: theme.colors.text, fontSize: 13 }}>
          {state.reason ?? "—"}
        </TText>
      </View>

      <View style={styles.infoRow}>
        <TText color="muted" style={styles.label}>
          Message
        </TText>
        <TText
          style={{ color: theme.colors.text, fontSize: 13, flex: 1 }}
          numberOfLines={2}
        >
          {state.message ?? "—"}
        </TText>
      </View>

      <View style={styles.infoRow}>
        <TText color="muted" style={styles.label}>
          Blocked
        </TText>
        <TText style={{ color: theme.colors.text, fontSize: 13 }}>
          {blocked}
        </TText>
      </View>

      {state.until && (
        <View style={styles.infoRow}>
          <TText color="muted" style={styles.label}>
            Until
          </TText>
          <TText style={{ color: theme.colors.text, fontSize: 13 }}>
            {new Date(state.until).toLocaleString()}
          </TText>
        </View>
      )}

      <TSpacer size="md" />

      {/* Override buttons */}
      <TText color="muted" style={styles.label}>
        Local Override
      </TText>
      <TSpacer size="xs" />
      <View style={styles.buttonGrid}>
        <Pressable
          style={[styles.gridBtn, { borderColor: theme.colors.border }]}
          onPress={() => handleOverride("normal")}
        >
          <TText style={styles.btnText}>Normal</TText>
        </Pressable>
        <Pressable
          style={[styles.gridBtn, { borderColor: theme.colors.border }]}
          onPress={() => handleOverride("degraded")}
        >
          <TText style={styles.btnText}>Degraded</TText>
        </Pressable>
        <Pressable
          style={[styles.gridBtn, { borderColor: theme.colors.border }]}
          onPress={() => handleOverride("read_only")}
        >
          <TText style={styles.btnText}>Read-Only</TText>
        </Pressable>
        <Pressable
          style={[styles.gridBtn, { borderColor: theme.colors.border }]}
          onPress={() => handleOverride("maintenance")}
        >
          <TText style={styles.btnText}>Maintenance</TText>
        </Pressable>
      </View>

      <TSpacer size="xs" />

      <Pressable
        style={[
          styles.actionBtn,
          { backgroundColor: theme.colors.secondary + "20" },
        ]}
        onPress={handleClear}
      >
        <TText style={styles.btnText}>Clear Override</TText>
      </Pressable>

      <TSpacer size="md" />

      {/* Health check */}
      <Pressable
        style={[
          styles.actionBtn,
          { borderColor: theme.colors.border, borderWidth: 1 },
        ]}
        onPress={handleCheckNow}
        disabled={loading}
      >
        <TText style={styles.btnText}>
          {loading ? "Checking…" : "Trigger Health Check"}
        </TText>
      </Pressable>

      <TSpacer size="xs" />
      <TText color="muted" style={styles.hint}>
        Force a single Supabase health ping. Requires the outage monitor to be
        active.
      </TText>
    </GlassCard>
  );
}

// ── Styles ──

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
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 2,
  },
  buttonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridBtn: {
    minWidth: "45%",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  actionBtn: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  btnText: { fontSize: 13, fontWeight: "500" },
  hint: { fontSize: 12, fontStyle: "italic" },
});
