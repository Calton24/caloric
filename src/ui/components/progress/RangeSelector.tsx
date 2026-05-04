/**
 * RangeSelector
 *
 * Pill-style segmented control: 7D / 30D / 90D / All.
 * Memoised. Drives all charts on the dashboard.
 */

import React, { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../../theme/useTheme";
import { useAppTranslation } from "../../../infrastructure/i18n/useAppTranslation";
import { TText } from "../../primitives/TText";
import type { DashboardRange } from "../../../features/progress/dashboard.selectors";

const RANGES: DashboardRange[] = ["7d", "30d", "90d", "all"];

interface RangeSelectorProps {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
}

function RangeSelectorImpl({ value, onChange }: RangeSelectorProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const labels: Record<DashboardRange, string> = {
    "7d": t("progress.ranges.7d"),
    "30d": t("progress.ranges.30d"),
    "90d": t("progress.ranges.90d"),
    "all": t("progress.ranges.all"),
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceSecondary },
      ]}
    >
      {RANGES.map((r) => {
        const selected = r === value;
        return (
          <Pressable
            key={r}
            onPress={() => {
              if (!selected) {
                Haptics.selectionAsync().catch(() => {});
                onChange(r);
              }
            }}
            style={[
              styles.segment,
              selected && {
                backgroundColor: theme.colors.surfaceElevated,
                shadowColor: theme.colors.glassShadow,
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 1,
                shadowRadius: 3,
                elevation: 2,
              },
            ]}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <TText
              style={[
                styles.label,
                {
                  color: selected ? theme.colors.text : theme.colors.textMuted,
                  fontWeight: selected ? "700" : "500",
                },
              ]}
            >
              {labels[r]}
            </TText>
          </Pressable>
        );
      })}
    </View>
  );
}

export const RangeSelector = memo(RangeSelectorImpl);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderRadius: 12,
    padding: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
  },
});
