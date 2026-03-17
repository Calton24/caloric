/**
 * WeeklyView — Week progress grid
 *
 * Shows M T W T F S S labels with circular day bubbles
 * and calorie progress arcs. Glass aesthetic.
 */

import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
const CIRCLE_SIZE = 40;
const STROKE_W = 3;

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
}

export function WeeklyView({
  weekDays,
  dayProgress,
  dayColors,
  selectedDate,
  onSelectDay,
  weekSummary,
  calorieBudget,
}: WeeklyViewProps) {
  const { theme } = useTheme();
  const radius = (CIRCLE_SIZE - STROKE_W) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={styles.container}>
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
              accessibilityLabel={`${DAY_LABELS[idx]}, day ${day.dayNumber}`}
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
                {DAY_LABELS[idx]}
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
              total cal
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
              avg / day
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
              days logged
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
