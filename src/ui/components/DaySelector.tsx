/**
 * DaySelector — Individual Circular Day Buttons with Swipeable Carousel
 *
 * 5-page tray [w-2, w-1, CURRENT, w+1, w+2] rendered in a clipped viewport.
 * Each day is an individual circle with a progress arc ring — no connected
 * strip background.  All drag + snap logic runs on the UI thread via
 * Reanimated worklets.  1:1 finger tracking, velocity-aware snapping.
 */

import React, { useCallback, useMemo } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    Easing,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

/* ── layout ───────────────────────────────────────────────────────── */

const { width: SCREEN_W } = Dimensions.get("window");
const H_PAD = 20;
const PAGE_W = SCREEN_W - H_PAD * 2;
const GAP = 8;
const SNAP = PAGE_W + GAP;

const NUM_PAGES = 5;
const CENTER_IDX = 2;

const DRAG_THRESHOLD = PAGE_W * 0.12;
const VEL_THRESHOLD = 300;

const SNAP_EASING = Easing.bezier(0.25, 0.1, 0.25, 1.0);
const SNAP_DURATION_BASE = 200;
const SNAP_DURATION_MIN = 100;

/* circle sizing */
const CIRCLE_SZ = 40;
const RING_STR = 2.5;
const RING_R = (CIRCLE_SZ - RING_STR) / 2;
const RING_C = 2 * Math.PI * RING_R;

/* ── types ────────────────────────────────────────────────────────── */

export interface WeekDay {
  key: string;
  label: string;
  dayNumber: number;
  isToday: boolean;
}

interface DaySelectorProps {
  selectedIndex: number;
  onSelect: (index: number) => void;
  weekPages: WeekDay[][];
  weekPagesProgress?: number[][];
  /** Per-day severity colors for progress arcs (current week, 7 entries) */
  dayColors?: string[];
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

/* ── component ────────────────────────────────────────────────────── */

export function DaySelector({
  selectedIndex,
  onSelect,
  weekPages,
  weekPagesProgress,
  dayColors,
  onPrevWeek,
  onNextWeek,
}: DaySelectorProps) {
  const { theme } = useTheme();

  const offsetX = useSharedValue(0);
  const dragging = useSharedValue(false);

  const pages = useMemo(() => {
    const p0 = weekPages[0] ?? weekPages[1];
    const p1 = weekPages[0];
    const p2 = weekPages[1];
    const p3 = weekPages[2];
    const p4 = weekPages[2] ?? weekPages[1];
    return [p0, p1, p2, p3, p4];
  }, [weekPages]);

  const pagesProgress = useMemo(() => {
    if (!weekPagesProgress) return undefined;
    const pp0 = weekPagesProgress[0] ?? weekPagesProgress[1];
    const pp1 = weekPagesProgress[0];
    const pp2 = weekPagesProgress[1];
    const pp3 = weekPagesProgress[2];
    const pp4 = weekPagesProgress[2] ?? weekPagesProgress[1];
    return [pp0, pp1, pp2, pp3, pp4];
  }, [weekPagesProgress]);

  const doPrev = useCallback(() => {
    onPrevWeek();
  }, [onPrevWeek]);
  const doNext = useCallback(() => {
    onNextWeek();
  }, [onNextWeek]);

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-8, 8])
    .onStart(() => {
      dragging.value = true;
    })
    .onUpdate((e) => {
      offsetX.value = e.translationX;
    })
    .onEnd((e) => {
      dragging.value = false;
      const tx = e.translationX;
      const vx = e.velocityX;

      let target = 0;
      if (tx > DRAG_THRESHOLD || (tx > 10 && vx > VEL_THRESHOLD)) {
        target = SNAP;
      } else if (tx < -DRAG_THRESHOLD || (tx < -10 && vx < -VEL_THRESHOLD)) {
        target = -SNAP;
      }

      const absVel = Math.abs(vx);
      const velFactor = Math.min(absVel / 2000, 1);
      const duration = Math.max(
        SNAP_DURATION_BASE * (1 - velFactor * 0.6),
        SNAP_DURATION_MIN
      );

      if (target === 0) {
        offsetX.value = withTiming(0, {
          duration: Math.min(duration, 150),
          easing: SNAP_EASING,
        });
        return;
      }

      offsetX.value = withTiming(
        target,
        { duration, easing: SNAP_EASING },
        (finished) => {
          if (!finished) return;
          if (target > 0) {
            runOnJS(doNext)();
          } else {
            runOnJS(doPrev)();
          }
          offsetX.value = 0;
        }
      );
    });

  const trayStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value - CENTER_IDX * SNAP }],
  }));

  return (
    <View style={styles.viewport}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[styles.tray, trayStyle]}>
          {pages.map((page, pageIdx) => {
            const isCenterPage = pageIdx === CENTER_IDX;

            return (
              <View
                key={`${page[0]?.key ?? "p"}-${pageIdx}`}
                style={styles.page}
              >
                {page.map((day, dayIdx) => {
                  const isSelected = isCenterPage && dayIdx === selectedIndex;
                  const progress = pagesProgress?.[pageIdx]?.[dayIdx] ?? 0;
                  const hasRing = progress > 0;
                  // Use per-day severity color on the center (current) page
                  const arcColor =
                    isCenterPage && dayColors?.[dayIdx]
                      ? dayColors[dayIdx]
                      : theme.colors.primary;

                  return (
                    <Pressable
                      key={day.key}
                      onPress={() => {
                        if (isCenterPage) onSelect(dayIdx);
                      }}
                      accessibilityLabel={`${day.label} ${day.dayNumber}${isSelected ? ", selected" : ""}${day.isToday ? ", today" : ""}`}
                      accessibilityRole="button"
                      style={styles.cell}
                    >
                      {/* Day letter */}
                      <TText
                        style={[
                          styles.letter,
                          {
                            color: isSelected
                              ? arcColor
                              : theme.colors.textMuted,
                          },
                        ]}
                      >
                        {day.label}
                      </TText>

                      {/* Circular day button */}
                      <View
                        style={[
                          styles.circle,
                          isSelected &&
                            !day.isToday && {
                              backgroundColor: arcColor,
                            },
                          day.isToday && {
                            borderWidth: 1.5,
                            borderColor: arcColor,
                          },
                        ]}
                      >
                        {/* Progress arc ring */}
                        {hasRing && !isSelected && (
                          <Svg
                            width={CIRCLE_SZ}
                            height={CIRCLE_SZ}
                            style={styles.ring}
                          >
                            <Circle
                              cx={CIRCLE_SZ / 2}
                              cy={CIRCLE_SZ / 2}
                              r={RING_R}
                              stroke={theme.colors.surfaceElevated}
                              strokeWidth={RING_STR}
                              fill="none"
                            />
                            <Circle
                              cx={CIRCLE_SZ / 2}
                              cy={CIRCLE_SZ / 2}
                              r={RING_R}
                              stroke={arcColor}
                              strokeWidth={RING_STR}
                              fill="none"
                              strokeLinecap="round"
                              strokeDasharray={RING_C}
                              strokeDashoffset={
                                RING_C * (1 - Math.min(progress, 1))
                              }
                              rotation={-90}
                              origin={`${CIRCLE_SZ / 2}, ${CIRCLE_SZ / 2}`}
                            />
                          </Svg>
                        )}
                        <TText
                          style={[
                            styles.num,
                            {
                              color:
                                isSelected && !day.isToday
                                  ? theme.colors.textInverse
                                  : arcColor,
                              fontWeight:
                                isSelected || day.isToday ? "700" : "500",
                            },
                          ]}
                        >
                          {day.dayNumber}
                        </TText>
                      </View>

                      {/* Today dot indicator */}
                      {day.isToday && !isSelected && (
                        <View
                          style={[styles.dot, { backgroundColor: arcColor }]}
                        />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            );
          })}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/* ── styles ───────────────────────────────────────────────────────── */

const TRAY_W = NUM_PAGES * PAGE_W + (NUM_PAGES - 1) * GAP;

const styles = StyleSheet.create({
  viewport: {
    width: PAGE_W,
    overflow: "hidden",
    alignSelf: "center",
  },
  tray: {
    flexDirection: "row",
    width: TRAY_W,
    gap: GAP,
  },
  page: {
    width: PAGE_W,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 4,
  },
  cell: {
    alignItems: "center",
    gap: 4,
  },
  letter: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  circle: {
    width: CIRCLE_SZ,
    height: CIRCLE_SZ,
    borderRadius: CIRCLE_SZ / 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  ring: {
    position: "absolute",
  },
  num: {
    fontSize: 15,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 2,
  },
});
