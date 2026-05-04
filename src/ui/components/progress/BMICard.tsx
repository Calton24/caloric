/**
 * BMICard
 *
 * Renders BMI value, classification, and a coloured WHO-aligned scale bar
 * with the user's position indicator. Empty state when height is missing.
 */

import React, { memo } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { useTheme } from "../../../theme/useTheme";
import { useAppTranslation } from "../../../infrastructure/i18n/useAppTranslation";
import { TText } from "../../primitives/TText";
import { DashboardCard } from "./DashboardCard";
import type { BMIInfo } from "../../../features/progress/dashboard.selectors";

interface BMICardProps {
  bmi: BMIInfo;
}

function BMICardImpl({ bmi }: BMICardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [w, setW] = React.useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (Math.abs(next - w) > 0.5) setW(next);
  };

  if (bmi.bmi == null || bmi.classification === "unknown") {
    return (
      <DashboardCard variant="default" padding={16} radius={24}>
        <View style={styles.headerRow}>
          <TText
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t("progress.bmiTitle")}
          </TText>
        </View>
        <TText
          style={[styles.empty, { color: theme.colors.textMuted }]}
          numberOfLines={2}
        >
          {t("progress.bmiNeedsHeight")}
        </TText>
      </DashboardCard>
    );
  }

  const classificationKey =
    bmi.classification === "underweight"
      ? "progress.bmiUnderweight"
      : bmi.classification === "overweight"
        ? "progress.bmiOverweight"
        : bmi.classification === "obese"
          ? "progress.bmiObese"
          : "progress.bmiHealthy";

  const classificationColor =
    bmi.classification === "healthy"
      ? theme.colors.success
      : bmi.classification === "underweight"
        ? theme.colors.info
        : bmi.classification === "overweight"
          ? theme.colors.warning
          : theme.colors.error;

  // Pre-compute slot widths from clamped BMI scale (15..40):
  //   <18.5 underweight, 18.5–25 healthy, 25–30 overweight, 30+ obese
  const slots: { color: string; flex: number }[] = [
    { color: theme.colors.info + "AA", flex: (18.5 - 15) / (40 - 15) },
    { color: theme.colors.success + "AA", flex: (25 - 18.5) / (40 - 15) },
    { color: theme.colors.warning + "AA", flex: (30 - 25) / (40 - 15) },
    { color: theme.colors.error + "AA", flex: (40 - 30) / (40 - 15) },
  ];

  return (
    <DashboardCard variant="default" padding={16} radius={24}>
      <View style={styles.headerRow}>
        <TText
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {t("progress.bmiTitle")}
        </TText>
        <TText
          style={[styles.classification, { color: classificationColor }]}
          numberOfLines={1}
        >
          {t(classificationKey)}
        </TText>
      </View>

      <View style={styles.row}>
        <TText
          variant="heading"
          style={[styles.bmiValue, { color: theme.colors.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {bmi.bmi.toFixed(1)}
        </TText>
        <TText style={[styles.suffix, { color: theme.colors.textMuted }]}>
          kg/m²
        </TText>
      </View>

      <View style={styles.scaleWrap} onLayout={onLayout}>
        <View style={styles.scaleRow}>
          {slots.map((s, i) => (
            <View
              key={`slot-${i}`}
              style={{
                flex: s.flex,
                height: 8,
                backgroundColor: s.color,
                borderTopLeftRadius: i === 0 ? 4 : 0,
                borderBottomLeftRadius: i === 0 ? 4 : 0,
                borderTopRightRadius: i === slots.length - 1 ? 4 : 0,
                borderBottomRightRadius: i === slots.length - 1 ? 4 : 0,
              }}
            />
          ))}
        </View>
        {w > 0 && (
          <View
            style={[
              styles.indicator,
              {
                left: Math.max(0, Math.min(w - 4, w * bmi.scalePosition - 2)),
                backgroundColor: theme.colors.text,
                shadowColor: theme.colors.glassShadow,
              },
            ]}
          />
        )}
      </View>

      <View style={styles.scaleLabels}>
        <TText style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>
          15
        </TText>
        <TText style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>
          18.5
        </TText>
        <TText style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>
          25
        </TText>
        <TText style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>
          30
        </TText>
        <TText style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>
          40
        </TText>
      </View>
    </DashboardCard>
  );
}

export const BMICard = memo(BMICardImpl);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
  },
  classification: {
    fontSize: 12,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 6,
  },
  bmiValue: {
    fontSize: 32,
    fontWeight: "800",
  },
  suffix: {
    fontSize: 12,
    fontWeight: "600",
  },
  scaleWrap: {
    marginTop: 14,
    height: 16,
    justifyContent: "center",
  },
  scaleRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 8,
    width: "100%",
    overflow: "hidden",
    borderRadius: 4,
  },
  indicator: {
    position: "absolute",
    width: 4,
    height: 16,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
    elevation: 2,
  },
  scaleLabels: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  scaleLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  empty: {
    fontSize: 13,
    fontWeight: "500",
    marginTop: 8,
  },
});
