/**
 * RecalibrationCard — shows when the user's actual TDEE
 * diverges from the formula estimate, suggesting a calorie
 * budget adjustment based on real weight trend + intake data.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeOut } from "react-native-reanimated";
import type { RecalibrationResult } from "../../features/goals/recalibration.service";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

interface RecalibrationCardProps {
  result: RecalibrationResult;
  onApply: () => void;
  onDismiss: () => void;
}

export function RecalibrationCard({
  result,
  onApply,
  onDismiss,
}: RecalibrationCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  if (!result.shouldRecalibrate || !result.suggestedBudget) return null;

  const icon = result.tdeeDifference > 0 ? "trending-up" : "trending-down";
  const accentColor =
    result.tdeeDifference > 0 ? theme.colors.success : theme.colors.warning;

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      exiting={FadeOut.duration(200)}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surfaceSecondary,
            borderColor: accentColor + "44",
          },
        ]}
      >
        {/* Dismiss */}
        <Pressable
          onPress={onDismiss}
          hitSlop={12}
          style={styles.dismiss}
          accessibilityLabel="Dismiss recalibration suggestion"
        >
          <Ionicons name="close" size={18} color={theme.colors.textMuted} />
        </Pressable>

        {/* Header */}
        <View style={styles.header}>
          <View
            style={[styles.iconCircle, { backgroundColor: accentColor + "22" }]}
          >
            <Ionicons name={icon as any} size={18} color={accentColor} />
          </View>
          <TText
            variant="subheading"
            style={{ color: theme.colors.text, flex: 1 }}
          >
            {t("recalibration.heading")}
          </TText>
        </View>

        <TSpacer size="xs" />

        {/* Summary */}
        <TText
          variant="caption"
          style={{ color: theme.colors.textSecondary, lineHeight: 20 }}
        >
          {result.summary}
        </TText>

        <TSpacer size="sm" />

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <TText variant="caption" style={{ color: theme.colors.textMuted }}>
              {t("recalibration.estimated")}
            </TText>
            <TText
              style={[styles.statValue, { color: theme.colors.textSecondary }]}
            >
              {result.estimatedTDEE.toLocaleString()}
            </TText>
          </View>
          <Ionicons
            name="arrow-forward"
            size={16}
            color={theme.colors.textMuted}
          />
          <View style={styles.stat}>
            <TText variant="caption" style={{ color: theme.colors.textMuted }}>
              {t("recalibration.actual")}
            </TText>
            <TText style={[styles.statValue, { color: accentColor }]}>
              {result.actualTDEE.toLocaleString()}
            </TText>
          </View>
          <View style={{ flex: 1 }} />
          <View style={[styles.stat, { alignItems: "flex-end" }]}>
            <TText variant="caption" style={{ color: theme.colors.textMuted }}>
              {t("recalibration.newGoal")}
            </TText>
            <TText
              style={[
                styles.statValue,
                { color: theme.colors.text, fontWeight: "700" },
              ]}
            >
              {result.suggestedBudget.toLocaleString()}
            </TText>
          </View>
        </View>

        <TSpacer size="sm" />

        {/* Apply button */}
        <Pressable
          onPress={onApply}
          style={({ pressed }) => [
            styles.applyBtn,
            {
              backgroundColor: accentColor,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          accessibilityLabel={t("recalibration.applyBudgetA11y", {
            calories: result.suggestedBudget,
          })}
        >
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <TText style={styles.applyLabel}>
            {t("recalibration.applyAdjustment")}
          </TText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  dismiss: {
    position: "absolute",
    top: 10,
    right: 10,
    zIndex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingRight: 24,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stat: {
    gap: 2,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
  },
  applyLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
});
