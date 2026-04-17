/**
 * StreakRecoveryBanner
 *
 * Loss-aversion banner shown when a user's streak has broken.
 * Creates emotional urgency to log a meal and restart.
 * Dismisses automatically once the user logs their first meal of the day.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { StreakRecovery } from "../../features/retention/retention.types";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface StreakRecoveryBannerProps {
  recovery: StreakRecovery;
  onPress?: () => void;
}

export function StreakRecoveryBanner({
  recovery,
  onPress,
}: StreakRecoveryBannerProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const accentColor =
    recovery.urgency === "intense"
      ? "#ef4444"
      : recovery.urgency === "firm"
        ? "#F5A623"
        : theme.colors.primary;

  const bgColor =
    recovery.urgency === "intense"
      ? "rgba(239, 68, 68, 0.12)"
      : recovery.urgency === "firm"
        ? "rgba(245, 166, 35, 0.10)"
        : theme.colors.primary + "12";

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <Pressable
        onPress={onPress}
        style={[
          styles.banner,
          { backgroundColor: bgColor, borderColor: accentColor },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${t("streak.yourStreakReset")} ${recovery.ctaText}`}
      >
        <Ionicons name="refresh-outline" size={22} color={accentColor} />
        <View style={styles.textBlock}>
          <TText style={[styles.title, { color: accentColor }]}>
            {recovery.lostStreak > 0
              ? t("streak.streakEnded", { count: recovery.lostStreak })
              : t("streak.streakReset")}
          </TText>
          <TText
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            {recovery.message}
          </TText>
        </View>
        <View style={[styles.ctaBadge, { backgroundColor: accentColor }]}>
          <TText style={styles.ctaText}>{recovery.ctaText}</TText>
        </View>
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
    lineHeight: 17,
  },
  ctaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  ctaText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
});
