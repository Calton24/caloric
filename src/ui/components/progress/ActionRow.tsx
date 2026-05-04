/**
 * ActionRow
 *
 * Bottom-of-dashboard action buttons. Primary = Log Weight (filled),
 * Secondary = Recalculate Plan (outlined). Disabled state for plan recalc
 * when prerequisites aren't met. Haptic feedback on press.
 */

import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { useAppTranslation } from "../../../infrastructure/i18n/useAppTranslation";
import { TText } from "../../primitives/TText";

interface ActionRowProps {
  canRecalculate: boolean;
  onLogWeight: () => void;
  onRecalculate: () => void;
}

function ActionRowImpl({
  canRecalculate,
  onLogWeight,
  onRecalculate,
}: ActionRowProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onLogWeight();
        }}
        style={({ pressed }) => [
          styles.btn,
          styles.primaryBtn,
          {
            backgroundColor: theme.colors.primary,
            opacity: pressed ? 0.9 : 1,
            shadowColor: theme.colors.primary,
          },
        ]}
      >
        <Ionicons name="add" size={18} color={theme.colors.textInverse} />
        <TText
          style={[styles.primaryText, { color: theme.colors.textInverse }]}
        >
          {t("progress.logWeight")}
        </TText>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !canRecalculate }}
        onPress={() => {
          Haptics.selectionAsync().catch(() => {});
          onRecalculate();
        }}
        style={({ pressed }) => [
          styles.btn,
          styles.secondaryBtn,
          {
            backgroundColor: theme.colors.surfaceElevated,
            borderColor: theme.colors.border,
            opacity: pressed ? 0.85 : canRecalculate ? 1 : 0.55,
          },
        ]}
      >
        <Ionicons
          name="refresh-outline"
          size={18}
          color={theme.colors.primary}
        />
        <TText
          style={[styles.secondaryText, { color: theme.colors.primary }]}
        >
          {t("progress.recalculatePlan")}
        </TText>
      </Pressable>
    </View>
  );
}

export const ActionRow = memo(ActionRowImpl);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  primaryBtn: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryBtn: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  primaryText: {
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
