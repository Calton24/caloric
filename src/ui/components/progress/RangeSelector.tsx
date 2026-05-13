/**
 * RangeSelector
 *
 * Pill-style segmented control: 7D / 30D / 90D / All.
 * Memoised. Drives all charts on the dashboard.
 */

import React, { memo } from "react";
import { Pressable, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../../theme/useTheme";
import { useAppTranslation } from "../../../infrastructure/i18n/useAppTranslation";
import { GlassSurface } from "../../glass/GlassSurface";
import { TText } from "../../primitives/TText";
import type { DashboardRange } from "../../../features/progress/dashboard.selectors";

const RANGES: DashboardRange[] = ["7d", "30d", "90d", "all"];

interface RangeSelectorProps {
  value: DashboardRange;
  onChange: (range: DashboardRange) => void;
}

function RangeSelectorImpl({ value, onChange }: RangeSelectorProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const { t } = useAppTranslation();
  const selectedSegmentBg = isDark
    ? "rgba(255,255,255,0.22)"
    : "rgba(255,255,255,0.95)";

  const labels: Record<DashboardRange, string> = {
    "7d": t("progress.ranges.7d"),
    "30d": t("progress.ranges.30d"),
    "90d": t("progress.ranges.90d"),
    "all": t("progress.ranges.all"),
  };

  return (
    <GlassSurface variant="card" intensity="light" style={styles.container}>
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
              selected && { backgroundColor: selectedSegmentBg },
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
    </GlassSurface>
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
