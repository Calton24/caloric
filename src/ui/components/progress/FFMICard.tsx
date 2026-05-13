/**
 * FFMICard
 *
 * Fat-free mass index calculator: profile height + weight plus an estimated
 * body-fat % input. Same shell and scale pattern as BMICard.
 */

import React, { memo, useMemo, useState } from "react";
import { LayoutChangeEvent, StyleSheet, View } from "react-native";
import { useTheme } from "../../../theme/useTheme";
import { useAppTranslation } from "../../../infrastructure/i18n/useAppTranslation";
import { getFFMI } from "../../../features/progress/dashboard.selectors";
import { TInput } from "../../primitives/TInput";
import { TText } from "../../primitives/TText";
import { DashboardCard } from "./DashboardCard";

interface FFMICardProps {
  heightCm: number | null;
  currentWeightLbs: number | null;
}

function parseBodyFatInput(raw: string): {
  value: number | null;
  invalid: boolean;
} {
  const trimmed = raw.trim().replace(",", ".");
  if (trimmed === "") return { value: null, invalid: false };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || n >= 100) {
    return { value: null, invalid: true };
  }
  return { value: n, invalid: false };
}

function FFMICardImpl({ heightCm, currentWeightLbs }: FFMICardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const [bodyFatStr, setBodyFatStr] = useState("");
  const [w, setW] = useState(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const next = e.nativeEvent.layout.width;
    if (Math.abs(next - w) > 0.5) setW(next);
  };

  const { value: bodyFatPct, invalid: bodyFatInvalid } = useMemo(
    () => parseBodyFatInput(bodyFatStr),
    [bodyFatStr]
  );

  const ffmi = useMemo(
    () => getFFMI(heightCm, currentWeightLbs, bodyFatPct),
    [heightCm, currentWeightLbs, bodyFatPct]
  );

  const hasProfile = Boolean(heightCm && currentWeightLbs);

  if (!hasProfile) {
    return (
      <DashboardCard variant="default" padding={16} radius={24}>
        <View style={styles.headerRow}>
          <TText
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t("progress.ffmiTitle")}
          </TText>
        </View>
        <TText
          style={[styles.empty, { color: theme.colors.textMuted }]}
          numberOfLines={3}
        >
          {t("progress.ffmiNeedsProfile")}
        </TText>
      </DashboardCard>
    );
  }

  const classificationKey =
    ffmi.classification === "below"
      ? "progress.ffmiBelow"
      : ffmi.classification === "average"
        ? "progress.ffmiAverage"
        : ffmi.classification === "fit"
          ? "progress.ffmiFit"
          : ffmi.classification === "athletic"
            ? "progress.ffmiAthletic"
            : ffmi.classification === "exceptional"
              ? "progress.ffmiExceptional"
              : "";

  const classificationColor =
    ffmi.classification === "below"
      ? theme.colors.info
      : ffmi.classification === "average"
        ? theme.colors.textSecondary
        : ffmi.classification === "fit"
          ? theme.colors.success
          : ffmi.classification === "athletic"
            ? theme.colors.warning
            : ffmi.classification === "exceptional"
              ? theme.colors.error
              : theme.colors.textMuted;

  // Reference bands 14–28 (aligned with common FFMI charts)
  const slots: { color: string; flex: number }[] = [
    { color: theme.colors.info + "AA", flex: (17 - 14) / (28 - 14) },
    { color: theme.colors.success + "66", flex: (18 - 17) / (28 - 14) },
    { color: theme.colors.success + "AA", flex: (20 - 18) / (28 - 14) },
    { color: theme.colors.warning + "AA", flex: (22 - 20) / (28 - 14) },
    { color: theme.colors.error + "AA", flex: (28 - 22) / (28 - 14) },
  ];

  const showResult = ffmi.ffmi != null && !bodyFatInvalid;

  return (
    <DashboardCard variant="default" padding={16} radius={24}>
      <View style={styles.headerRow}>
        <TText
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {t("progress.ffmiTitle")}
        </TText>
        {showResult && classificationKey ? (
          <TText
            style={[styles.classification, { color: classificationColor }]}
            numberOfLines={1}
          >
            {t(classificationKey)}
          </TText>
        ) : (
          <View style={{ minWidth: 1 }} />
        )}
      </View>

      <View style={styles.inputRow}>
        <TText style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
          {t("progress.ffmiBodyFatLabel")}
        </TText>
        <View style={styles.inputFieldWrap}>
          <TInput
            value={bodyFatStr}
            onChangeText={setBodyFatStr}
            keyboardType="decimal-pad"
            placeholder={t("progress.ffmiBodyFatPlaceholder")}
            maxLength={5}
            returnKeyType="done"
            containerStyle={styles.inputContainer}
            style={styles.inputInner}
          />
        </View>
        <TText style={[styles.percent, { color: theme.colors.textMuted }]}>
          %
        </TText>
      </View>

      {bodyFatInvalid ? (
        <TText style={[styles.errorText, { color: theme.colors.error }]}>
          {t("progress.ffmiInvalidBodyFat")}
        </TText>
      ) : null}

      {!showResult && !bodyFatInvalid ? (
        <TText style={[styles.empty, { color: theme.colors.textMuted }]}>
          {t("progress.ffmiEnterBodyFat")}
        </TText>
      ) : null}

      {showResult ? (
        <>
          <View style={styles.row}>
            <TText
              variant="heading"
              style={[styles.ffmiValue, { color: theme.colors.text }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {ffmi.ffmi!.toFixed(1)}
            </TText>
            <TText style={[styles.suffix, { color: theme.colors.textMuted }]}>
              kg/m²
            </TText>
          </View>

          <View style={styles.scaleWrap} onLayout={onLayout}>
            <View style={styles.scaleRow}>
              {slots.map((s, i) => (
                <View
                  key={`ffmi-slot-${i}`}
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
            {w > 0 ? (
              <View
                style={[
                  styles.indicator,
                  {
                    left: Math.max(
                      0,
                      Math.min(w - 4, w * ffmi.scalePosition - 2)
                    ),
                    backgroundColor: theme.colors.text,
                    shadowColor: theme.colors.glassShadow,
                  },
                ]}
              />
            ) : null}
          </View>

          <View style={styles.scaleLabels}>
            <TText style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>
              14
            </TText>
            <TText style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>
              17
            </TText>
            <TText style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>
              20
            </TText>
            <TText style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>
              22
            </TText>
            <TText style={[styles.scaleLabel, { color: theme.colors.textMuted }]}>
              28
            </TText>
          </View>
        </>
      ) : null}
    </DashboardCard>
  );
}

export const FFMICard = memo(FFMICardImpl);

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
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    gap: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    flexShrink: 0,
  },
  inputFieldWrap: {
    flex: 1,
    maxWidth: 120,
  },
  inputContainer: {
    marginBottom: 0,
  },
  inputInner: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 56,
    textAlign: "center",
  },
  percent: {
    fontSize: 14,
    fontWeight: "700",
  },
  row: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginTop: 10,
  },
  ffmiValue: {
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
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
});
