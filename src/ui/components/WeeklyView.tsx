/**
 * WeeklyView — Week progress grid
 *
 * Shows M T W T F S S labels with circular day bubbles
 * and calorie progress arcs. Glass aesthetic.
 * Prev/next week navigation arrows with date range label.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { formatMonthDay } from "../../infrastructure/i18n";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

const DAY_LABEL_KEYS = [
  "days.monShort",
  "days.tueShort",
  "days.wedShort",
  "days.thuShort",
  "days.friShort",
  "days.satShort",
  "days.sunShort",
];
const CIRCLE_SIZE = 40;
const STROKE_W = 3;

/** Format "2025-03-15" → "Mar 15" (locale-aware) */
function formatShortDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return formatMonthDay(d);
}

interface WeeklyViewProps {
  weekDays: {
    key: string;
    label: string;
    dayNumber: number;
    isToday: boolean;
  }[];
  dayProgress: number[]; // 0–1 per day
  dayColors?: string[]; // per-day severity color (green/yellow/orange/red)
  selectedDate: string;
  onSelectDay: (index: number) => void;
  weekSummary: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    daysWithData: number;
  };
  calorieBudget: number;
  onPrevWeek: () => void;
  onNextWeek: () => void;
  onToday?: () => void;
  isToday?: boolean;
}

export function WeeklyView({
  weekDays,
  dayProgress,
  dayColors,
  selectedDate,
  onSelectDay,
  weekSummary,
  calorieBudget,
  onPrevWeek,
  onNextWeek,
  onToday,
  isToday,
}: WeeklyViewProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const radius = (CIRCLE_SIZE - STROKE_W) / 2;
  const circumference = 2 * Math.PI * radius;

  // Date range label from first to last day of this week
  const weekLabel =
    weekDays.length >= 7
      ? `${formatShortDate(weekDays[0].key)} – ${formatShortDate(weekDays[6].key)}`
      : "";

  return (
    <View style={styles.container}>
      {/* Week navigation header */}
      <View style={styles.navRow}>
        <Pressable onPress={onPrevWeek} hitSlop={12}>
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.colors.textSecondary}
          />
        </Pressable>
        <Pressable onPress={onToday} disabled={isToday}>
          <TText
            style={[
              styles.navLabel,
              {
                color: isToday ? theme.colors.textMuted : theme.colors.primary,
              },
            ]}
          >
            {weekLabel}
          </TText>
        </Pressable>
        <Pressable onPress={onNextWeek} hitSlop={12}>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>
      {/* Day circles grid */}
      <View style={styles.daysRow}>
        {weekDays.map((day, idx) => {
          const progress = dayProgress[idx] ?? 0;
          const isSelected = day.key === selectedDate;
          const hasData = progress > 0;
          const offset = circumference * (1 - progress);
          const arcColor = dayColors?.[idx] ?? theme.colors.primary;

          return (
            <Pressable
              key={day.key}
              onPress={() => onSelectDay(idx)}
              style={styles.dayColumn}
              accessibilityLabel={t("weekly.dayA11y", {
                label: t(DAY_LABEL_KEYS[idx]),
                number: day.dayNumber,
              })}
            >
              <TText
                style={[
                  styles.dayLabel,
                  {
                    color: isSelected
                      ? theme.colors.primary
                      : theme.colors.textMuted,
                  },
                ]}
              >
                {t(DAY_LABEL_KEYS[idx])}
              </TText>

              <View
                style={[
                  styles.circleWrap,
                  isSelected && {
                    backgroundColor: `${theme.colors.primary}20`,
                  },
                ]}
              >
                {/* Progress arc */}
                <Svg
                  width={CIRCLE_SIZE}
                  height={CIRCLE_SIZE}
                  style={StyleSheet.absoluteFill}
                >
                  {/* Track */}
                  <Circle
                    cx={CIRCLE_SIZE / 2}
                    cy={CIRCLE_SIZE / 2}
                    r={radius}
                    stroke={`${theme.colors.surfaceElevated}60`}
                    strokeWidth={STROKE_W}
                    fill="none"
                  />
                  {/* Progress */}
                  {hasData && (
                    <Circle
                      cx={CIRCLE_SIZE / 2}
                      cy={CIRCLE_SIZE / 2}
                      r={radius}
                      stroke={arcColor}
                      strokeWidth={STROKE_W}
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={offset}
                      rotation={-90}
                      origin={`${CIRCLE_SIZE / 2}, ${CIRCLE_SIZE / 2}`}
                    />
                  )}
                </Svg>

                <TText
                  style={[
                    styles.dayNumber,
                    {
                      color: hasData
                        ? theme.colors.text
                        : theme.colors.textMuted,
                      fontWeight: day.isToday ? "800" : "600",
                    },
                  ]}
                >
                  {day.dayNumber}
                </TText>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Week summary */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: `${theme.colors.surfaceElevated}40` },
        ]}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <TText style={[styles.summaryValue, { color: theme.colors.text }]}>
              {Math.round(weekSummary.calories).toLocaleString()}
            </TText>
            <TText
              style={[styles.summaryLabel, { color: theme.colors.textMuted }]}
            >
              {t("weekly.totalCal")}
            </TText>
          </View>
          <View
            style={[
              styles.summaryDivider,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <View style={styles.summaryItem}>
            <TText style={[styles.summaryValue, { color: theme.colors.text }]}>
              {weekSummary.daysWithData > 0
                ? Math.round(
                    weekSummary.calories / weekSummary.daysWithData
                  ).toLocaleString()
                : "—"}
            </TText>
            <TText
              style={[styles.summaryLabel, { color: theme.colors.textMuted }]}
            >
              {t("weekly.avgPerDay")}
            </TText>
          </View>
          <View
            style={[
              styles.summaryDivider,
              { backgroundColor: theme.colors.border },
            ]}
          />
          <View style={styles.summaryItem}>
            <TText style={[styles.summaryValue, { color: theme.colors.text }]}>
              {weekSummary.daysWithData}
            </TText>
            <TText
              style={[styles.summaryLabel, { color: theme.colors.textMuted }]}
            >
              {t("weekly.daysLogged")}
            </TText>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 20,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
  },
  navLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dayColumn: {
    alignItems: "center",
    gap: 6,
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  circleWrap: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: "600",
  },
  summaryCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 28,
  },
});
