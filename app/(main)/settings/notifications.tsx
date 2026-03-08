/**
 * Notifications Settings
 *
 * Toggle for log-reminder notifications.
 * Reads/writes logReminderEnabled from useSettingsStore.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettingsStore } from "../../../src/features/settings";
import { useTheme } from "../../../src/theme/useTheme";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

export default function NotificationsScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const logReminderEnabled = useSettingsStore(
    (s) => s.settings.logReminderEnabled
  );
  const setLogReminderEnabled = useSettingsStore(
    (s) => s.setLogReminderEnabled
  );

  const handleToggle = useCallback(
    (value: boolean) => {
      setLogReminderEnabled(value);
    },
    [setLogReminderEnabled]
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            Notifications
          </TText>
          <View style={{ width: 24 }} />
        </View>

        <TSpacer size="md" />

        <View style={styles.content}>
          <View
            style={[
              styles.section,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            <View
              style={[styles.row, { borderBottomColor: theme.colors.border }]}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: "#FBBF24" + "22" },
                ]}
              >
                <Ionicons name="alarm-outline" size={18} color="#FBBF24" />
              </View>
              <TText style={[styles.rowLabel, { color: theme.colors.text }]}>
                Log Reminder
              </TText>
              <Switch
                value={logReminderEnabled}
                onValueChange={handleToggle}
                trackColor={{
                  false: theme.colors.surfaceSecondary,
                  true: theme.colors.primary + "88",
                }}
                thumbColor={
                  logReminderEnabled
                    ? theme.colors.primary
                    : theme.colors.textMuted
                }
              />
            </View>
          </View>

          <TSpacer size="sm" />

          <TText style={[styles.hint, { color: theme.colors.textMuted }]}>
            Get a daily reminder to log your meals and stay on track with your
            nutrition goals.
          </TText>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 20,
  },
  section: {
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  hint: {
    fontSize: 13,
    paddingHorizontal: 4,
    lineHeight: 18,
  },
});
