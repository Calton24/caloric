/**
 * LiveActivityDebugPanel
 *
 * Dev-only panel for testing Live Activity infrastructure via expo-widgets.
 * Shows support status, start/update/end buttons, and last result.
 */

import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { liveActivity } from "../../infrastructure/liveActivity";
import type { LAStartResult } from "../../infrastructure/liveActivity/types";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../glass/GlassCard";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

export function LiveActivityDebugPanel() {
  const { theme } = useTheme();
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const supported = liveActivity.isSupported();

  const handleStart = useCallback(() => {
    const result: LAStartResult = liveActivity.start("StatusWidget", {
      title: "Caloric Demo",
      status: "Running",
      progress: 0.3,
    });
    setLastResult(`start → ${result.status}`);
    if (result.status === "started") {
      setActiveId(result.activityId);
    }
  }, []);

  const handleUpdate = useCallback(() => {
    if (!activeId) {
      setLastResult("update → no active activity");
      return;
    }
    const result = liveActivity.update(activeId, "StatusWidget", {
      title: "Caloric Demo",
      status: "Updated!",
      progress: 0.75,
    });
    setLastResult(`update → ${result.status}`);
  }, [activeId]);

  const handleEnd = useCallback(() => {
    if (!activeId) {
      setLastResult("end → no active activity");
      return;
    }
    const result = liveActivity.end(activeId, "StatusWidget");
    setLastResult(`end → ${result.status}`);
    if (result.status === "ended") {
      setActiveId(null);
    }
  }, [activeId]);

  return (
    <GlassCard padding="md" style={styles.card}>
      {/* Header */}
      <View style={styles.row}>
        <Ionicons name="flash-outline" size={20} color={theme.colors.primary} />
        <TText style={[styles.title, { color: theme.colors.text }]}>
          Live Activities
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
        />
        <ActionButton
          label="Update"
          icon="refresh-outline"
          onPress={handleUpdate}
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
        Requires iOS dev build with native LiveActivityModule.
        {"\n"}Activities appear in the Dynamic Island and Lock Screen.
        {"\n"}Android / Expo Go will show &ldquo;Not available&rdquo;.
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
