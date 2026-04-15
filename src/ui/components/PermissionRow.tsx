/**
 * PermissionRow
 * Row component for the Permissions Required screen.
 * Shows icon, label, and a circular status indicator.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import type { PermissionStatus } from "../../types/nutrition";
import { TText } from "../primitives/TText";

interface PermissionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  status: PermissionStatus;
  onPress: () => void;
}

export function PermissionRow({
  icon,
  label,
  description,
  status,
  onPress,
}: PermissionRowProps) {
  const { theme } = useTheme();

  const statusColor =
    status === "granted"
      ? theme.colors.success
      : status === "denied"
        ? theme.colors.error
        : theme.colors.textMuted;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          { backgroundColor: theme.colors.primary + "1A" },
        ]}
      >
        <Ionicons name={icon} size={22} color={theme.colors.primary} />
      </View>
      <View style={styles.content}>
        <TText style={[styles.label, { color: theme.colors.text }]}>
          {label}
        </TText>
        <TText style={[styles.desc, { color: theme.colors.textMuted }]}>
          {description}
        </TText>
      </View>
      <View
        style={[
          styles.statusDot,
          {
            backgroundColor: statusColor,
            borderColor: statusColor + "33",
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
  },
  desc: {
    fontSize: 13,
    fontWeight: "400",
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
  },
});
