/**
 * StreakModal
 * Celebration modal shown when user taps the streak counter.
 * Displays flame, streak count, weekly dot grid, and motivational message.
 */

import React, { useEffect } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import {
    getNextMilestone,
    getProgressionMessage,
    getStreakLabel,
    type ProgressionMessage,
} from "../../features/streak/streak-psychology.service";
import { useAppTranslation } from "../../infrastructure/i18n";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface StreakModalProps {
  visible: boolean;
  onClose: () => void;
  currentStreak: number;
  longestStreak: number;
  streakStartDate: string | null;
  lastLogDate: string | null;
  /** Whether the user has a streak freeze available */
  freezeAvailable?: boolean;
  /** Show upsell for streak freeze (free users) */
  showFreezeUpsell?: boolean;
  /** Called when user taps the freeze upsell */
  onFreezeUpsell?: () => void;
}

/** Day abbreviation keys starting Monday */
const DAY_LABEL_KEYS = [
  "days.monShort",
  "days.tueShort",
  "days.wedShort",
  "days.thuShort",
  "days.friShort",
  "days.satShort",
  "days.sunShort",
];

/** Returns ISO date string for each day of the current week (Mon–Sun) */
function getCurrentWeekDays(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=Sun
  // Monday = index 0
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().split("T")[0];
  });
}

function getStreakMotivation(streak: number): ProgressionMessage | null {
  return getProgressionMessage(streak);
}

export function StreakModal({
  visible,
  onClose,
  currentStreak,
  longestStreak,
  streakStartDate,
  lastLogDate,
  freezeAvailable = false,
  showFreezeUpsell = false,
  onFreezeUpsell,
}: StreakModalProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const isDark = theme.mode === "dark";

  // Animation values
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const flameScale = useSharedValue(0.5);
  const flameRotate = useSharedValue(-0.1);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);

  useEffect(() => {
    if (visible) {
      // Container fade + scale in
      opacity.value = withTiming(1, { duration: 250 });
      scale.value = withSpring(1, { damping: 16, stiffness: 200 });

      // Flame bounces in with a little wiggle
      flameScale.value = withDelay(
        100,
        withSequence(
          withSpring(1.2, { damping: 6, stiffness: 300 }),
          withSpring(1, { damping: 10, stiffness: 200 })
        )
      );
      flameRotate.value = withDelay(
        100,
        withSequence(
          withTiming(0.08, { duration: 150, easing: Easing.out(Easing.ease) }),
          withTiming(-0.04, { duration: 120 }),
          withTiming(0, { duration: 100 })
        )
      );

      // Title slides up
      titleOpacity.value = withDelay(300, withTiming(1, { duration: 300 }));
      titleY.value = withDelay(
        300,
        withSpring(0, { damping: 14, stiffness: 180 })
      );
    } else {
      scale.value = withTiming(0.85, { duration: 180 });
      opacity.value = withTiming(0, { duration: 180 });
      flameScale.value = 0.5;
      flameRotate.value = -0.1;
      titleOpacity.value = 0;
      titleY.value = 20;
    }
    // SharedValues (scale, opacity, etc.) are stable Reanimated refs — no re-run risk
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const flameStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: flameScale.value },
      { rotate: `${flameRotate.value}rad` },
    ],
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));

  const weekDays = getCurrentWeekDays();
  const todayISO = new Date().toISOString().split("T")[0];

  // Build which days in the current week are "active" (within the streak window)
  const activeDays = weekDays.map((dayISO) => {
    if (!lastLogDate || !streakStartDate) return false;
    return dayISO >= streakStartDate && dayISO <= lastLogDate;
  });

  // Today's day index (0=Mon)
  const todayIndex = weekDays.indexOf(todayISO);

  const FLAME_COLOR = "#F5A623";
  const BG = isDark ? "#1C1C1E" : "#FFFFFF";
  const BACKDROP = isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: BACKDROP }]}
        onPress={onClose}
      >
        <Animated.View
          style={[styles.card, { backgroundColor: BG }, containerStyle]}
        >
          {/* Prevent inner taps from closing */}
          <Pressable onPress={() => {}} style={{ width: "100%" }}>
            {/* Sparkles + Flame */}
            <View style={styles.flameContainer}>
              {/* Sparkle dots */}
              <TText style={[styles.sparkle, styles.sparkleTopLeft]}>✦</TText>
              <TText style={[styles.sparkle, styles.sparkleTopRight]}>✦</TText>
              <TText style={[styles.sparkle, styles.sparkleLeft]}>·</TText>
              <TText style={[styles.sparkle, styles.sparkleRight]}>·</TText>

              {/* Animated flame */}
              <Animated.View style={flameStyle}>
                <TText style={styles.flameEmoji}>🔥</TText>
                {/* Streak count badge over flame */}
                <View style={styles.streakBadge}>
                  <TText
                    style={[styles.streakBadgeText, { color: FLAME_COLOR }]}
                  >
                    {currentStreak}
                  </TText>
                </View>
              </Animated.View>
            </View>

            {/* Title */}
            <Animated.View style={[styles.titleRow, titleStyle]}>
              <TText style={[styles.title, { color: FLAME_COLOR }]}>
                {t("streak.dayStreak", { count: currentStreak })}
              </TText>
            </Animated.View>

            {/* Weekly dot grid */}
            <View style={styles.weekRow}>
              {DAY_LABEL_KEYS.map((key, i) => {
                const isActive = activeDays[i];
                const isToday = i === todayIndex;
                return (
                  <View key={i} style={styles.dayCol}>
                    <TText
                      style={[
                        styles.dayLabel,
                        {
                          color: isToday
                            ? FLAME_COLOR
                            : theme.colors.textSecondary,
                          fontWeight: isToday ? "700" : "400",
                        },
                      ]}
                    >
                      {t(key)}
                    </TText>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor: isActive
                            ? FLAME_COLOR
                            : theme.colors.surfaceElevated,
                        },
                      ]}
                    >
                      {isActive && <TText style={styles.checkmark}>✓</TText>}
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Longest streak note */}
            {longestStreak > 0 && (
              <TText
                style={[
                  styles.longestLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("streak.best", { count: longestStreak })}
              </TText>
            )}

            {/* Identity label */}
            {(() => {
              const label = getStreakLabel(currentStreak);
              return label ? (
                <TText style={[styles.identityLabel, { color: FLAME_COLOR }]}>
                  {label.emoji} {t(label.labelKey)}
                </TText>
              ) : null;
            })()}

            {/* Next milestone */}
            {(() => {
              const milestone = getNextMilestone(currentStreak);
              return milestone ? (
                <TText
                  style={[
                    styles.milestoneLabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("streak.milestone", {
                    remaining: milestone.remaining,
                    target: milestone.target,
                    count: milestone.remaining,
                  })}
                </TText>
              ) : null;
            })()}

            {/* Continue button */}
            <Pressable
              onPress={onClose}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: isDark ? "#FFFFFF" : "#000000" },
                pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
              ]}
            >
              <TText
                style={[
                  styles.buttonText,
                  { color: isDark ? "#000000" : "#FFFFFF" },
                ]}
              >
                {t("common.continue")}
              </TText>
            </Pressable>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 16,
  },
  flameContainer: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  flameEmoji: {
    fontSize: 100,
    textAlign: "center",
  },
  streakBadge: {
    position: "absolute",
    bottom: 14,
    alignSelf: "center",
  },
  streakBadgeText: {
    fontSize: 36,
    fontWeight: "800",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sparkle: {
    position: "absolute",
    fontSize: 20,
    color: "#F5A623",
  },
  sparkleTopLeft: { top: 12, left: 16 },
  sparkleTopRight: { top: 8, right: 20 },
  sparkleLeft: { top: "50%", left: 4, fontSize: 14, opacity: 0.6 },
  sparkleRight: { top: "40%", right: 6, fontSize: 14, opacity: 0.6 },
  titleRow: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  weekRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  dayCol: {
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  dayLabel: {
    fontSize: 14,
  },
  dot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  checkmark: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  longestLabel: {
    fontSize: 13,
    marginTop: 12,
    fontWeight: "500",
  },
  identityLabel: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  milestoneLabel: {
    fontSize: 12,
    fontWeight: "400",
    marginTop: 4,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  button: {
    width: "100%",
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "700",
  },
  freezeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  freezeIcon: {
    fontSize: 18,
  },
  freezeText: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  freezeUpsell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: 16,
  },
  freezeUpsellTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  freezeUpsellBody: {
    fontSize: 11,
    fontWeight: "400",
    marginTop: 2,
  },
});
