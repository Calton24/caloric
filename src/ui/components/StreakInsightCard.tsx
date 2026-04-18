/**
 * StreakInsightCard
 *
 * Single adaptive streak card that replaces StreakHero,
 * StreakAtRiskBanner, StreakRecoveryBanner, and DayJourneyBanner.
 *
 * Shows the single most important streak message at a time.
 * Layout is consistent across states; content swaps intelligently.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import type { StreakInsightModel } from "../../features/streak/streak-insight.service";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TText } from "../primitives/TText";
import { ProgressBar } from "./ProgressBar";

// ── State icon map ───────────────────────────────────────────

const STATE_ICON: Record<
  StreakInsightModel["state"],
  keyof typeof Ionicons.glyphMap
> = {
  risk: "warning",
  recovery: "refresh",
  milestone_achieved: "trophy",
  milestone_preview: "star",
  momentum: "flame",
};

// ── Tone → ProgressBar tone mapping ─────────────────────────

function progressTone(
  tone: StreakInsightModel["tone"]
): "primary" | "success" | "warning" | "error" {
  switch (tone) {
    case "warning":
      return "warning";
    case "critical":
      return "error";
    case "recovery":
      return "warning";
    case "celebratory":
      return "success";
    case "anticipatory":
      return "primary";
    case "positive":
      return "success";
  }
}

// ── Component ────────────────────────────────────────────────

interface StreakInsightCardProps {
  model: StreakInsightModel;
  onPress?: () => void;
}

export function StreakInsightCard({ model, onPress }: StreakInsightCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();

  const icon = STATE_ICON[model.state];
  const isRiskState = model.state === "risk" || model.state === "recovery";

  const title =
    model.state === "momentum" && model.label
      ? `${model.label.emoji} ${t(model.titleKey, model.titleParams)}`
      : t(model.titleKey, model.titleParams);

  const subtitle = t(model.subtitleKey, model.subtitleParams);

  return (
    <Animated.View entering={FadeIn.duration(400)}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : "text"}
        accessibilityLabel={`${title}. ${subtitle}`}
      >
        <GlassSurface
          variant="card"
          intensity="light"
          style={[
            styles.card,
            isRiskState && {
              borderWidth: 1,
              borderColor: model.accent,
              backgroundColor: model.accent + "14",
            },
          ]}
        >
          <Animated.View
            entering={FadeInDown.delay(100).duration(300)}
            style={styles.content}
          >
            {/* Left: streak count or icon */}
            <View style={styles.leftBlock}>
              {model.streakCount > 0 && !isRiskState ? (
                <View style={styles.numberBlock}>
                  <TText style={[styles.streakNumber, { color: model.accent }]}>
                    {model.streakCount}
                  </TText>
                  <TText
                    style={[
                      styles.daysLabel,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t("streakInsight.days", { count: model.streakCount })}
                  </TText>
                </View>
              ) : (
                <View
                  style={[
                    styles.iconCircle,
                    { backgroundColor: model.accent + "1A" },
                  ]}
                >
                  <Ionicons name={icon} size={20} color={model.accent} />
                </View>
              )}
            </View>

            {/* Center: text + progress */}
            <View style={styles.textBlock}>
              <TText
                style={[
                  styles.title,
                  {
                    color: isRiskState ? model.accent : theme.colors.text,
                  },
                ]}
                numberOfLines={1}
              >
                {title}
              </TText>
              <TText
                style={[styles.subtitle, { color: theme.colors.textSecondary }]}
                numberOfLines={2}
              >
                {subtitle}
              </TText>

              {model.progress !== null && (
                <View style={styles.progressRow}>
                  <ProgressBar
                    progress={model.progress}
                    tone={progressTone(model.tone)}
                    height={4}
                  />
                </View>
              )}
            </View>

            {/* Right: CTA badge or chevron */}
            {model.ctaKey ? (
              <View
                style={[
                  styles.ctaBadge,
                  { backgroundColor: model.accent + "1A" },
                ]}
              >
                <TText style={[styles.ctaText, { color: model.accent }]}>
                  {t(model.ctaKey)}
                </TText>
              </View>
            ) : model.showChevron ? (
              <Ionicons
                name="chevron-forward"
                size={16}
                color={theme.colors.textMuted}
              />
            ) : null}
          </Animated.View>
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

// ── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  leftBlock: {
    alignItems: "center",
    justifyContent: "center",
  },
  numberBlock: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: "800",
    lineHeight: 40,
  },
  daysLabel: {
    fontSize: 13,
    fontWeight: "500",
    marginLeft: 3,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },
  progressRow: {
    marginTop: 6,
  },
  ctaBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
