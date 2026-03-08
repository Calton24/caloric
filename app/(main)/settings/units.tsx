/**
 * Units Settings
 *
 * Pick between Metric, Imperial, or System default.
 * Reads/writes unitsPreference from useSettingsStore.
 */

import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSettingsStore } from "../../../src/features/settings";
import type { UnitsPreference } from "../../../src/features/settings/settings.types";
import { useTheme } from "../../../src/theme/useTheme";
import { TSpacer } from "../../../src/ui/primitives/TSpacer";
import { TText } from "../../../src/ui/primitives/TText";

const UNIT_OPTIONS: {
  label: string;
  description: string;
  value: UnitsPreference;
}[] = [
  {
    label: "Metric",
    description: "Kilograms, centimeters",
    value: "metric",
  },
  {
    label: "Imperial",
    description: "Pounds, feet & inches",
    value: "imperial",
  },
  {
    label: "Use System",
    description: "Follow your device settings",
    value: "system",
  },
];

export default function UnitsScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const unitsPreference = useSettingsStore((s) => s.settings.unitsPreference);
  const setUnitsPreference = useSettingsStore((s) => s.setUnitsPreference);

  const handleSelect = useCallback(
    (value: UnitsPreference) => {
      setUnitsPreference(value);
    },
    [setUnitsPreference]
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
            Units
          </TText>
          <View style={{ width: 24 }} />
        </View>

        <TSpacer size="md" />

        {/* Options */}
        <View style={styles.optionsContainer}>
          <View
            style={[
              styles.section,
              { backgroundColor: theme.colors.surfaceSecondary },
            ]}
          >
            {UNIT_OPTIONS.map((option, index) => {
              const isSelected = option.value === unitsPreference;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => handleSelect(option.value)}
                  style={[
                    styles.row,
                    index < UNIT_OPTIONS.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                >
                  <View style={styles.rowContent}>
                    <TText style={[styles.label, { color: theme.colors.text }]}>
                      {option.label}
                    </TText>
                    <TText
                      style={[
                        styles.description,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      {option.description}
                    </TText>
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
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
  optionsContainer: {
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
  },
  rowContent: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
  },
  description: {
    fontSize: 13,
    marginTop: 2,
  },
});
