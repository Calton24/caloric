/**
 * PushDebugPanel
 *
 * Dev-only panel for testing push notification infrastructure.
 * Shows permission state, push token, and action buttons.
 *
 * Import only from feature / dev screens — not from infrastructure.
 * Uses the notifications proxy (never expo-notifications directly).
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { notifications } from "../../infrastructure/notifications";
import type { PermissionStatus } from "../../infrastructure/notifications/types";
import { useTheme } from "../../theme/useTheme";
import { GlassCard } from "../glass/GlassCard";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

// Dynamic require — clipboard is optional
let Clipboard: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  Clipboard = require("expo-clipboard");
} catch {
  Clipboard = null;
}

// ---------- Helpers ----------

function statusColor(
  status: PermissionStatus,
  colors: { success: string; warning: string; error: string }
): string {
  if (status === "granted") return colors.success;
  if (status === "undetermined") return colors.warning;
  return colors.error;
}

function statusLabel(status: PermissionStatus): string {
  if (status === "granted") return "Granted";
  if (status === "undetermined") return "Not Asked";
  return "Denied";
}

// ---------- Component ----------

export function PushDebugPanel() {
  const { theme } = useTheme();

  const [permission, setPermission] =
    useState<PermissionStatus>("undetermined");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scheduled, setScheduled] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Fetch current state on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await notifications.getPermissions();
        if (mounted) setPermission(status);
        if (status === "granted") {
          const t = await notifications.getPushToken();
          if (mounted) setToken(t);
        }
      } catch (e: any) {
        if (mounted) setLastError(e?.message ?? "getPermissions failed");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleRequestPermission = useCallback(async () => {
    setLoading(true);
    setLastError(null);
    try {
      const status = await notifications.requestPermissions();
      setPermission(status);
      if (status === "granted") {
        const t = await notifications.getPushToken();
        setToken(t);
      }
    } catch (e: any) {
      setLastError(e?.message ?? "requestPermissions failed");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCopyToken = useCallback(async () => {
    if (!token) return;
    if (Clipboard?.setStringAsync) {
      await Clipboard.setStringAsync(token);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [token]);

  const handleScheduleLocal = useCallback(async () => {
    await notifications.scheduleLocal({
      title: "Test Notification",
      body: "This is a local push test from Mobile Core dev panel.",
      data: { source: "push_debug_panel" },
      delaySeconds: 5,
    });
    setScheduled(true);
    setTimeout(() => setScheduled(false), 3000);
  }, []);

  const handleClearBadge = useCallback(async () => {
    await notifications.clearBadge();
  }, []);

  return (
    <GlassCard padding="md" style={styles.card}>
      {/* Header */}
      <View style={styles.row}>
        <Ionicons
          name="notifications-outline"
          size={20}
          color={theme.colors.primary}
        />
        <TText style={[styles.title, { color: theme.colors.text }]}>
          Push Notifications
        </TText>
      </View>

      <TSpacer size="sm" />

      {/* Permission status */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          Permission
        </TText>
        <View style={styles.statusPill}>
          <View
            style={[
              styles.dot,
              { backgroundColor: statusColor(permission, theme.colors) },
            ]}
          />
          <TText
            style={[
              styles.statusText,
              { color: statusColor(permission, theme.colors) },
            ]}
          >
            {statusLabel(permission)}
          </TText>
        </View>
      </View>

      <TSpacer size="xs" />

      {/* Token */}
      <View style={styles.statusRow}>
        <TText color="muted" style={styles.label}>
          Token
        </TText>
        <TText
          color="muted"
          style={styles.tokenText}
          numberOfLines={1}
          ellipsizeMode="middle"
        >
          {token ? `${token.slice(0, 20)}...${token.slice(-8)}` : "—"}
        </TText>
      </View>

      <TSpacer size="md" />

      {/* Actions */}
      <View style={styles.actions}>
        {permission !== "granted" && (
          <ActionButton
            icon="key-outline"
            label={loading ? "Requesting…" : "Request Permission"}
            onPress={handleRequestPermission}
            disabled={loading}
            color={theme.colors.primary}
            bg={theme.colors.primary + "15"}
          />
        )}

        {token && (
          <ActionButton
            icon={copied ? "checkmark-circle" : "copy-outline"}
            label={copied ? "Copied!" : "Copy Token"}
            onPress={handleCopyToken}
            color={copied ? theme.colors.success : theme.colors.primary}
            bg={(copied ? theme.colors.success : theme.colors.primary) + "15"}
          />
        )}

        <ActionButton
          icon="timer-outline"
          label={scheduled ? "Scheduled!" : "Local in 5s"}
          onPress={handleScheduleLocal}
          color={scheduled ? theme.colors.success : theme.colors.accent}
          bg={(scheduled ? theme.colors.success : theme.colors.accent) + "15"}
        />

        <ActionButton
          icon="close-circle-outline"
          label="Clear Badge"
          onPress={handleClearBadge}
          color={theme.colors.textSecondary}
          bg={theme.colors.textSecondary + "15"}
        />
      </View>
    </GlassCard>
  );
}

// ---------- Sub-component ----------

function ActionButton({
  icon,
  label,
  onPress,
  disabled,
  color,
  bg,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  color: string;
  bg: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.actionBtn,
        { backgroundColor: bg, opacity: pressed || disabled ? 0.6 : 1 },
      ]}
    >
      <Ionicons name={icon} size={16} color={color} />
      <TText style={[styles.actionLabel, { color }]}>{label}</TText>
    </Pressable>
  );
}

// ---------- Styles ----------

const styles = StyleSheet.create({
  card: {
    marginBottom: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "500",
  },
  tokenText: {
    fontSize: 12,
    fontFamily: "monospace",
    maxWidth: 180,
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
    borderRadius: 10,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
});
