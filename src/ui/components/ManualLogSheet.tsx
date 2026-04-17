/**
 * ManualLogSheet
 *
 * Bottom-sheet version of the manual/keyboard food logging UI.
 * Replaces the full-screen modal with an in-place sheet.
 */

import { Ionicons } from "@expo/vector-icons";
import { BottomSheetTextInput } from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useLoggingFlow } from "../../features/nutrition/use-logging-flow";
import { useAppTranslation } from "../../infrastructure/i18n";
import { useTheme } from "../../theme/useTheme";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

const QUICK_FOODS = [
  { icon: "🥚", labelKey: "manualLog.eggs", cal: 155 },
  { icon: "🍌", labelKey: "manualLog.banana", cal: 105 },
  { icon: "🥗", labelKey: "manualLog.salad", cal: 150 },
  { icon: "🍗", labelKey: "manualLog.chicken", cal: 335 },
  { icon: "🍚", labelKey: "manualLog.rice", cal: 206 },
  { icon: "🥛", labelKey: "manualLog.yogurt", cal: 100 },
];

interface ManualLogSheetProps {
  onClose: () => void;
}

export function ManualLogSheet({ onClose }: ManualLogSheetProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [query, setQuery] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { startFromInput } = useLoggingFlow();

  const handleLog = useCallback(async () => {
    if (!query.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      const ok = await startFromInput(query.trim(), "manual");
      if (ok) {
        onClose();
        // startFromInput already pushes /(modals)/confirm-meal
      }
    } finally {
      setIsProcessing(false);
    }
  }, [query, startFromInput, isProcessing, onClose]);

  return (
    <View style={styles.root}>
      {/* Search / text input */}
      <View
        style={[
          styles.searchBox,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <Ionicons name="search" size={20} color={theme.colors.textMuted} />
        <BottomSheetTextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t("manualLog.placeholder")}
          placeholderTextColor={theme.colors.textMuted}
          style={[styles.searchInput, { color: theme.colors.text }]}
          multiline
          autoFocus
          onSubmitEditing={handleLog}
        />
      </View>

      <TSpacer size="lg" />

      {/* Quick add */}
      <TText
        style={[styles.sectionLabel, { color: theme.colors.textSecondary }]}
      >
        {t("manualLog.quickAdd")}
      </TText>
      <TSpacer size="sm" />
      <View style={styles.quickGrid}>
        {QUICK_FOODS.map((food) => (
          <Pressable
            key={food.labelKey}
            onPress={() =>
              setQuery((q) =>
                q ? `${q}, ${t(food.labelKey)}` : t(food.labelKey)
              )
            }
            style={({ pressed }) => [
              styles.quickItem,
              {
                backgroundColor: theme.colors.surfaceSecondary,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <TText style={styles.quickEmoji}>{food.icon}</TText>
            <TText style={[styles.quickLabel, { color: theme.colors.text }]}>
              {t(food.labelKey)}
            </TText>
            <TText style={[styles.quickCal, { color: theme.colors.textMuted }]}>
              {food.cal} {t("tracking.cal")}
            </TText>
          </Pressable>
        ))}
      </View>

      {/* Log button — shown once there's text */}
      {query.length > 0 && (
        <View style={styles.bottomAction}>
          <Pressable
            onPress={handleLog}
            disabled={isProcessing}
            style={({ pressed }) => [
              styles.logBtn,
              { opacity: isProcessing ? 0.6 : pressed ? 0.9 : 1 },
            ]}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logGradient}
            >
              {isProcessing ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.textInverse}
                />
              ) : (
                <Ionicons
                  name="checkmark-circle"
                  size={22}
                  color={theme.colors.textInverse}
                />
              )}
              <TText
                style={[styles.logText, { color: theme.colors.textInverse }]}
              >
                {isProcessing ? t("common.processing") : t("manualLog.logFood")}
              </TText>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    minHeight: 90,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    paddingTop: 0,
    paddingBottom: 0,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickItem: {
    width: "30%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    gap: 4,
  },
  quickEmoji: {
    fontSize: 26,
  },
  quickLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  quickCal: {
    fontSize: 11,
  },
  bottomAction: {
    marginTop: 24,
  },
  logBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  logGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
  logText: {
    fontSize: 17,
    fontWeight: "700",
  },
});
