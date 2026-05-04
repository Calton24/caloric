/**
 * InsightBanner — primary action banner produced by the insight engine.
 *
 * Visual hierarchy:
 *
 *   [Icon] [TONE LABEL]
 *          Title (bold)
 *          Message (1–2 lines)
 *          CTA → chevron
 *                                                              [×]
 *
 * Tone drives the entire visual treatment:
 *   - urgent   → error  (red)
 *   - warning  → warning (amber)
 *   - positive → success (green)
 *   - neutral  → primary (brand)
 *
 * Interactions:
 *   - tap the body  → fires CTA (haptic light)
 *   - swipe-left    → dismiss (only when `dismissible` and `onDismiss`)
 *   - tap × button  → dismiss
 *
 * The banner fires `onShown` once per (id + payloadHash) tuple so the
 * engine can fire `insight_shown` analytics correctly when the same
 * rule produces an updated payload (e.g. "5 lbs to goal" → "4 lbs").
 */

import React, { memo, useCallback, useEffect, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../theme/useTheme";
import { TText } from "../../primitives/TText";
import { DashboardCard } from "./DashboardCard";
import type {
  Insight,
  InsightTone,
} from "../../../features/insights";

interface InsightBannerProps {
  insight: Insight;
  /** Called once per unique (id + payloadHash) tuple when visible. */
  onShown?: () => void;
  /** Called when the user taps the banner body (CTA dispatch). */
  onCtaPress?: () => void;
  /** Called when the user dismisses (× button or swipe). */
  onDismiss?: () => void;
  /** Whether the rule that produced this insight allows dismissal. */
  dismissible?: boolean;
}

function toneIcon(tone: InsightTone): keyof typeof Ionicons.glyphMap {
  switch (tone) {
    case "positive":
      return "trending-up";
    case "warning":
      return "alert-circle-outline";
    case "urgent":
      return "flame";
    default:
      return "sparkles-outline";
  }
}

function toneLabelKey(tone: InsightTone): string {
  switch (tone) {
    case "positive":
      return "PROGRESS";
    case "warning":
      return "WARNING";
    case "urgent":
      return "ACTION";
    default:
      return "INSIGHT";
  }
}

const SWIPE_THRESHOLD = 90;

function InsightBannerImpl({
  insight,
  onShown,
  onCtaPress,
  onDismiss,
  dismissible = false,
}: InsightBannerProps) {
  const { theme } = useTheme();

  useEffect(() => {
    onShown?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insight.id, insight.payloadHash]);

  const tint = useMemo(() => {
    switch (insight.tone) {
      case "positive":
        return theme.colors.success;
      case "warning":
        return theme.colors.warning;
      case "urgent":
        return theme.colors.error;
      default:
        return theme.colors.primary;
    }
  }, [insight.tone, theme]);

  const hasCta = insight.cta != null && onCtaPress != null;
  const canSwipeDismiss = dismissible && !!onDismiss;

  const handlePress = () => {
    if (!hasCta) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onCtaPress?.();
  };

  const handleDismiss = (e: { stopPropagation?: () => void }) => {
    e.stopPropagation?.();
    Haptics.selectionAsync().catch(() => {});
    onDismiss?.();
  };

  // Swipe-to-dismiss — only active when `canSwipeDismiss`.
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const onSwipedAway = useCallback(() => {
    Haptics.selectionAsync().catch(() => {});
    onDismiss?.();
  }, [onDismiss]);

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(canSwipeDismiss)
      .activeOffsetX([-12, 12])
      .failOffsetY([-15, 15])
      .onUpdate((e) => {
        translateX.value = Math.max(-300, Math.min(20, e.translationX));
        opacity.value = Math.max(0.4, 1 - Math.abs(e.translationX) / 240);
      })
      .onEnd((e) => {
        if (e.translationX < -SWIPE_THRESHOLD) {
          translateX.value = withTiming(-400, { duration: 220 });
          opacity.value = withTiming(0, { duration: 220 }, () => {
            runOnJS(onSwipedAway)();
          });
        } else {
          translateX.value = withTiming(0, { duration: 200 });
          opacity.value = withTiming(1, { duration: 200 });
        }
      });
  }, [canSwipeDismiss, opacity, translateX, onSwipedAway]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    opacity: opacity.value,
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        key={`${insight.id}-${insight.payloadHash}`}
        entering={FadeIn.duration(280)}
        style={animatedStyle}
      >
        <Pressable
          onPress={handlePress}
          accessibilityRole={hasCta ? "button" : "summary"}
          accessibilityLabel={`${insight.title}. ${insight.message}`}
          disabled={!hasCta}
        >
          <DashboardCard variant="tinted" padding={14} radius={20}>
            {/* Accent bar — color cue at a glance */}
            <View
              style={[
                styles.accentBar,
                { backgroundColor: tint },
              ]}
            />

            <View style={styles.row}>
              <View
                style={[
                  styles.iconWrap,
                  { backgroundColor: tint + "22", borderColor: tint + "55" },
                ]}
              >
                <Ionicons
                  name={toneIcon(insight.tone)}
                  size={18}
                  color={tint}
                />
              </View>

              <View style={styles.copy}>
                <TText
                  style={[styles.toneLabel, { color: tint }]}
                  numberOfLines={1}
                >
                  {toneLabelKey(insight.tone)}
                </TText>
                <TText
                  style={[styles.title, { color: theme.colors.text }]}
                  numberOfLines={2}
                >
                  {insight.title}
                </TText>
                <TText
                  style={[
                    styles.subtitle,
                    { color: theme.colors.textSecondary },
                  ]}
                  numberOfLines={2}
                >
                  {insight.message}
                </TText>
                {insight.cta && hasCta ? (
                  <View
                    style={[
                      styles.ctaPill,
                      { backgroundColor: tint, marginTop: 8 },
                    ]}
                  >
                    <TText
                      style={[
                        styles.ctaLabel,
                        { color: theme.colors.background },
                      ]}
                      numberOfLines={1}
                    >
                      {insight.cta.label}
                    </TText>
                    <Ionicons
                      name="chevron-forward"
                      size={12}
                      color={theme.colors.background}
                    />
                  </View>
                ) : null}
              </View>

              {dismissible && onDismiss ? (
                <Pressable
                  onPress={handleDismiss}
                  hitSlop={8}
                  accessibilityLabel="Dismiss insight"
                  style={styles.dismiss}
                >
                  <Ionicons
                    name="close"
                    size={14}
                    color={theme.colors.textMuted}
                  />
                </Pressable>
              ) : null}
            </View>
          </DashboardCard>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

export const InsightBanner = memo(InsightBannerImpl);

const styles = StyleSheet.create({
  accentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 20,
    borderBottomLeftRadius: 20,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingLeft: 6,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  toneLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  ctaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  ctaLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  dismiss: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
});
