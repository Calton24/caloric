/**
 * StreakAtRiskBanner
 *
 * Loss-aversion banner shown when the user has an active streak
 * but hasn't logged today and it's past 6pm.
 * Two urgency levels: warning (6-9pm) and critical (9pm+).
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { getStreakUrgency } from "../../features/streak/streak-psychology.service";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface StreakAtRiskBannerProps {
  lastLogDate: string | null;
  currentStreak: number;
  onPress?: () => void;
}

export function StreakAtRiskBanner({
  lastLogDate,
  currentStreak,
  onPress,
}: StreakAtRiskBannerProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const urgency = getStreakUrgency(lastLogDate, currentStreak);

  if (!urgency) return null;

  const isCritical = urgency === "critical";
  const bgColor = isCritical
    ? "rgba(239, 68, 68, 0.15)"
    : "rgba(245, 166, 35, 0.12)";
  const accentColor = isCritical ? "#ef4444" : "#F5A623";

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Pressable
        onPress={onPress}
        style={[
          styles.banner,
          { backgroundColor: bgColor, borderColor: accentColor },
        ]}
        accessibilityRole="button"
        accessibilityLabel="Your streak is at risk. Tap to log a meal."
      >
        <Ionicons
          name={isCritical ? "alert-circle" : "warning"}
          size={20}
          color={accentColor}
        />
        <View style={styles.textBlock}>
          <TText style={[styles.title, { color: accentColor }]}>
            {isCritical
              ? t("streak.lastChance")
              : t("streak.atRisk", { count: currentStreak })}
          </TText>
          <TText
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            {t("streak.logNowToKeep")}
          </TText>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={theme.colors.textMuted}
        />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "400",
  },
});
