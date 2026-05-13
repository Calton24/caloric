/**
 * MilestoneInsightCard
 *
 * One unified, adaptive coaching card that replaces the old stacked
 * StreakInsightCard + CoachInsight components.
 *
 * Architecture:
 *   - ONE stable visual shell
 *   - Adaptive content (title, subtitle, progress, CTA)
 *   - Fixed coach insights pill (bulb + label) in the meta row
 *   - Accent color shifts by state, not layout
 *   - No chatbot styling, no alert banners
 *
 * Visual anatomy:
 *   Row 1: Icon badge (left) + Coach insights pill (bulb icon + label, right)
 *   Row 2: Title + Subtitle
 *   Row 3: Progress bar (optional)
 *   Row 4: CTA or chevron (optional)
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import type {
    MilestoneInsightAccent,
    MilestoneInsightIcon,
    MilestoneInsightModel,
} from "../../features/milestone/milestone-insight.types";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TText } from "../primitives/TText";
import { ProgressBar } from "./ProgressBar";

// ── Accent color mapping ────────────────────────────────────

function useAccentColors(accent: MilestoneInsightAccent) {
  const { theme } = useTheme();
  switch (accent) {
    case "warning":
      return {
        primary: theme.colors.warning,
        tint: theme.colors.warning + "14",
        chipBg: theme.colors.warning + "1A",
      };
    case "success":
      return {
        primary: theme.colors.primary,
        tint: theme.colors.primary + "14",
        chipBg: theme.colors.primary + "1A",
      };
    case "highlight":
      return {
        primary: theme.colors.info,
        tint: theme.colors.info + "14",
        chipBg: theme.colors.info + "1A",
      };
    case "neutral":
    default:
      return {
        primary: theme.colors.textSecondary,
        tint: theme.colors.textSecondary + "14",
        chipBg: theme.colors.textSecondary + "1A",
      };
  }
}

// ── Icon mapping ────────────────────────────────────────────

const ICON_MAP: Record<MilestoneInsightIcon, keyof typeof Ionicons.glyphMap> = {
  shield: "shield-checkmark",
  flame: "flame",
  target: "flag",
  trophy: "trophy",
  refresh: "refresh",
};

// ── Tone → ProgressBar tone ────────────────────────────────

function progressTone(
  accent: MilestoneInsightAccent
): "primary" | "success" | "warning" | "error" {
  switch (accent) {
    case "warning":
      return "warning";
    case "success":
      return "primary";
    case "highlight":
      return "primary";
    case "neutral":
    default:
      return "primary";
  }
}

// ── Component ───────────────────────────────────────────────

interface MilestoneInsightCardProps {
  model: MilestoneInsightModel;
  onPress?: () => void;
  onCTA?: () => void;
}

export function MilestoneInsightCard({
  model,
  onPress,
  onCTA,
}: MilestoneInsightCardProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const colors = useAccentColors(model.accent);
  const isRisk = model.state === "risk" || model.state === "recovery";
  const coachInsightsPill = t("coaching.coachInsightsPill");

  const showProgress =
    model.progress != null && model.progress.target > 0 && !isRisk;

  return (
    <Animated.View entering={FadeIn.duration(350)}>
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole={onPress ? "button" : "text"}
        accessibilityLabel={`${coachInsightsPill}. ${model.title}. ${model.subtitle}`}
        style={({ pressed }) => [
          pressed &&
            onPress && { opacity: 0.96, transform: [{ scale: 0.985 }] },
        ]}
      >
        <GlassSurface
          variant="card"
          intensity="light"
          style={[
            styles.card,
            isRisk && {
              borderWidth: 1,
              borderColor: colors.primary,
              backgroundColor: colors.tint,
            },
          ]}
        >
          {/* Row 1: Meta row — icon badge + coach insights pill */}
          <Animated.View
            entering={FadeInDown.delay(80).duration(280)}
            style={styles.metaRow}
          >
            <View
              style={[styles.iconBadge, { backgroundColor: colors.chipBg }]}
            >
              <Ionicons
                name={ICON_MAP[model.icon]}
                size={16}
                color={colors.primary}
              />
            </View>

            <View
              style={[
                styles.chip,
                {
                  backgroundColor: colors.chipBg,
                  borderColor: colors.primary + "33",
                },
              ]}
            >
              <View style={styles.chipInner}>
                <Ionicons
                  name="bulb-outline"
                  size={15}
                  color={colors.primary}
                />
                <TText
                  style={[styles.chipLabel, { color: colors.primary }]}
                  numberOfLines={1}
                >
                  {t("coaching.coachInsightsPill")}
                </TText>
              </View>
            </View>
          </Animated.View>

          {/* Row 2: Content — title + subtitle */}
          <Animated.View
            entering={FadeInDown.delay(120).duration(280)}
            style={styles.contentBlock}
          >
            <TText
              style={[
                styles.title,
                { color: isRisk ? colors.primary : theme.colors.text },
              ]}
              numberOfLines={2}
            >
              {model.title}
            </TText>
            <TText
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              numberOfLines={2}
            >
              {model.subtitle}
            </TText>
          </Animated.View>

          {/* Row 3: Progress (optional) */}
          {showProgress && model.progress && (
            <Animated.View
              entering={FadeInDown.delay(160).duration(280)}
              style={styles.progressBlock}
            >
              <ProgressBar
                progress={model.progress.current / model.progress.target}
                tone={progressTone(model.accent)}
                height={5}
              />
              <TText
                style={[
                  styles.progressLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                {model.progress.current} of {model.progress.target} days
              </TText>
            </Animated.View>
          )}

          {/* Row 4: Action row (optional) */}
          {(model.ctaLabel || model.action !== "none") && (
            <Animated.View
              entering={FadeInDown.delay(200).duration(280)}
              style={styles.actionRow}
            >
              <View style={{ flex: 1 }} />
              {model.ctaLabel ? (
                <Pressable
                  onPress={onCTA ?? onPress}
                  hitSlop={8}
                  style={[styles.ctaButton, { backgroundColor: colors.chipBg }]}
                >
                  <TText style={[styles.ctaText, { color: colors.primary }]}>
                    {model.ctaLabel}
                  </TText>
                  <Ionicons
                    name="chevron-forward"
                    size={14}
                    color={colors.primary}
                  />
                </Pressable>
              ) : model.action !== "none" ? (
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={theme.colors.textMuted}
                />
              ) : null}
            </Animated.View>
          )}
        </GlassSurface>
      </Pressable>
    </Animated.View>
  );
}

// ── Styles ──────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },

  // Row 1: Meta
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 14,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  chip: {
    flexShrink: 1,
    maxWidth: "72%",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  /** Tight row so label never stretches to pill width (avoids lopsided padding). */
  chipInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    maxWidth: "100%",
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 15,
    flexShrink: 1,
    includeFontPadding: false,
  },

  // Row 2: Content
  contentBlock: {
    marginBottom: 14,
  },
  title: {
    fontSize: 21,
    fontWeight: "700",
    lineHeight: 26,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 19,
    marginTop: 5,
  },

  // Row 3: Progress
  progressBlock: {
    marginBottom: 14,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 6,
  },

  // Row 4: Action
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
