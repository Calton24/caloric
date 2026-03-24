/**
 * MonthlyView — Month calendar grid with progress
 *
 * Shows full month grid with numbered day circles,
 * progress arcs for days with data, and month summary.
 * Prev/next month navigation arrows.
 * Glass aesthetic matching the app's design system.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];
const CELL_SIZE = 36;
const STROKE_W = 2.5;

interface MonthlyViewProps {
  monthGrid: {
    days: ({
      key: string;
      dayNumber: number;
      date: Date;
      isToday: boolean;
    } | null)[];
    monthLabel: string;
  };
  monthProgress: Map<string, number>; // iso date → 0–1
  dayColors?: Map<string, string>; // iso date → severity color
  selectedDate: string;
  onSelectDay: (isoDate: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToday?: () => void;
  isToday?: boolean;
}

export function MonthlyView({
  monthGrid,
  monthProgress,
  dayColors,
  selectedDate,
  onSelectDay,
  onPrevMonth,
  onNextMonth,
  onToday,
  isToday,
}: MonthlyViewProps) {
  const { theme } = useTheme();
  const radius = (CELL_SIZE - STROKE_W) / 2;
  const circumference = 2 * Math.PI * radius;

  // Build rows of 7
  const rows: (typeof monthGrid.days)[] = [];
  for (let i = 0; i < monthGrid.days.length; i += 7) {
    rows.push(monthGrid.days.slice(i, i + 7));
  }

  // Count stats
  let daysLogged = 0;
  monthProgress.forEach((p) => {
    if (p > 0) daysLogged++;
  });

  return (
    <View style={styles.container}>
      {/* Month navigation header */}
      <View style={styles.navRow}>
        <Pressable onPress={onPrevMonth} hitSlop={12}>
          <Ionicons
            name="chevron-back"
            size={22}
            color={theme.colors.textSecondary}
          />
        </Pressable>
        <Pressable onPress={onToday} disabled={isToday}>
          <TText
            style={[
              styles.monthLabel,
              {
                color: isToday ? theme.colors.text : theme.colors.primary,
              },
            ]}
          >
            {monthGrid.monthLabel}
          </TText>
        </Pressable>
        <Pressable onPress={onNextMonth} hitSlop={12}>
          <Ionicons
            name="chevron-forward"
            size={22}
            color={theme.colors.textSecondary}
          />
        </Pressable>
      </View>

      {/* Day headers */}
      <View style={styles.headerRow}>
        {DAY_HEADERS.map((d, i) => (
          <View key={i} style={styles.headerCell}>
            <TText
              style={[styles.headerText, { color: theme.colors.textMuted }]}
            >
              {d}
            </TText>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.gridRow}>
          {row.map((day, colIdx) => {
            if (!day) {
              return <View key={`empty-${colIdx}`} style={styles.cell} />;
            }

            const progress = monthProgress.get(day.key) ?? 0;
            const hasData = progress > 0;
            const isSelected = day.key === selectedDate;
            const isToday = day.isToday;
            const offset = circumference * (1 - progress);
            const arcColor = dayColors?.get(day.key) ?? theme.colors.primary;

            return (
              <Pressable
                key={day.key}
                onPress={() => onSelectDay(day.key)}
                style={styles.cell}
                accessibilityLabel={`${day.dayNumber}`}
              >
                <View
                  style={[
                    styles.dayCellInner,
                    isSelected && {
                      backgroundColor: `${theme.colors.primary}20`,
                      borderRadius: CELL_SIZE / 2,
                      overflow: "hidden",
                    },
                  ]}
                >
                  {/* SVG progress arc */}
                  <Svg
                    width={CELL_SIZE}
                    height={CELL_SIZE}
                    style={StyleSheet.absoluteFill}
                  >
                    {hasData && (
                      <>
                        <Circle
                          cx={CELL_SIZE / 2}
                          cy={CELL_SIZE / 2}
                          r={radius}
                          stroke={`${theme.colors.surfaceElevated}50`}
                          strokeWidth={STROKE_W}
                          fill="none"
                        />
                        <Circle
                          cx={CELL_SIZE / 2}
                          cy={CELL_SIZE / 2}
                          r={radius}
                          stroke={arcColor}
                          strokeWidth={STROKE_W}
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          rotation={-90}
                          origin={`${CELL_SIZE / 2}, ${CELL_SIZE / 2}`}
                        />
                      </>
                    )}
                  </Svg>

                  <TText
                    style={[
                      styles.dayNumber,
                      {
                        color: hasData
                          ? theme.colors.text
                          : theme.colors.textMuted,
                        fontWeight: isToday ? "800" : "500",
                      },
                      isToday && { color: theme.colors.primary },
                    ]}
                  >
                    {day.dayNumber}
                  </TText>
                </View>
              </Pressable>
            );
          })}
          {/* Pad row to 7 */}
          {Array.from({ length: 7 - row.length }).map((_, i) => (
            <View key={`pad-${i}`} style={styles.cell} />
          ))}
        </View>
      ))}

      {/* Summary */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: `${theme.colors.surfaceElevated}40` },
        ]}
      >
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <TText style={[styles.summaryValue, { color: theme.colors.text }]}>
              {daysLogged}
            </TText>
            <TText
              style={[styles.summaryLabel, { color: theme.colors.textMuted }]}
            >
              days logged
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
              {monthGrid.days.filter(Boolean).length}
            </TText>
            <TText
              style={[styles.summaryLabel, { color: theme.colors.textMuted }]}
            >
              days in month
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
    gap: 8,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  headerCell: {
    width: CELL_SIZE + 4,
    alignItems: "center",
  },
  headerText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 4,
  },
  cell: {
    width: CELL_SIZE + 4,
    height: CELL_SIZE + 4,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellInner: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: CELL_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dayNumber: {
    fontSize: 13,
    fontWeight: "500",
  },
  summaryCard: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: "100%",
    marginTop: 8,
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
