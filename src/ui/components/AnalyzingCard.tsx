/**
 * AnalyzingCard
 *
 * Compact home-screen card that reflects the background scan state.
 * Returns null when no scan job is active.
 *
 * States:
 *   analyzing  — thumbnail + pulse + rotating stage labels + progress dots
 *   complete   — thumbnail + meal name + calories + "Review" CTA
 *                Stays on screen until the user swipes to remove (same
 *                gesture family as MealCard) or clears from scan-result.
 *   error      — dimmed thumbnail + message + swipe to dismiss
 */

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useBackgroundScanStore } from "../../features/camera/background-scan.store";
import { useAppTranslation } from "../../infrastructure/i18n";
import { useTheme } from "../../theme/useTheme";
import { formatFoodName } from "../../utils/formatFoodName";
import { TText } from "../primitives/TText";

// ─── Stage labels ─────────────────────────────────────────────────────────────

const STAGE_LABELS = [
  "Detecting food…",
  "Reading packaging…",
  "Matching product…",
  "Estimating nutrition…",
];

// ─── Pulse animation ──────────────────────────────────────────────────────────

function PulsingThumbnail({ uri }: { uri: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.65, { duration: 800 }),
        withTiming(1, { duration: 800 })
      ),
      -1,
      true
    );
    return () => {
      cancelAnimation(opacity);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.thumbnail, animStyle]}>
      <Image source={{ uri }} style={styles.thumbnailImg} contentFit="cover" />
    </Animated.View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AnalyzingCard() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const job = useBackgroundScanStore((s) => s.job);
  const { resetScan } = useBackgroundScanStore.getState();
  const swipeRef = useRef<Swipeable>(null);

  const [stageIndex, setStageIndex] = useState(0);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const confirmSwipeRemove = useCallback(() => {
    swipeRef.current?.close();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(t("home.dismissPendingScanTitle"), t("home.dismissPendingScanMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          resetScan();
        },
      },
    ]);
  }, [resetScan, t]);

  const renderRightActions = useCallback(() => {
    return (
      <Animated.View
        entering={SlideInRight.duration(250).damping(20)}
        exiting={SlideOutRight.duration(200)}
        style={styles.deleteActionContainer}
      >
        <Pressable
          onPress={confirmSwipeRemove}
          style={({ pressed }) => [
            styles.deleteAction,
            {
              backgroundColor: theme.colors.error,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.96 : 1 }],
            },
          ]}
        >
          <Ionicons name="trash" size={20} color="#fff" />
          <TText style={styles.deleteText}>{t("common.delete")}</TText>
        </Pressable>
      </Animated.View>
    );
  }, [confirmSwipeRemove, t, theme.colors.error]);

  // Cycle stage labels while analyzing
  useEffect(() => {
    if (job?.status === "analyzing") {
      setStageIndex(0);
      cycleRef.current = setInterval(() => {
        setStageIndex((i) => (i + 1) % STAGE_LABELS.length);
      }, 1800);
    } else {
      if (cycleRef.current) clearInterval(cycleRef.current);
    }
    return () => {
      if (cycleRef.current) clearInterval(cycleRef.current);
    };
  }, [job?.status]);

  if (!job) return null;

  const cardBg = theme.colors.surface ?? theme.colors.surfaceSecondary;

  const swipeableProps = {
    ref: swipeRef,
    renderRightActions,
    overshootRight: false,
    friction: 2,
    rightThreshold: 40,
    onSwipeableWillOpen: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  } as const;

  // ── Error state ─────────────────────────────────────────────────────────────
  if (job.status === "error") {
    return (
      <View style={styles.cardShell}>
        <Swipeable {...swipeableProps}>
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(200)}
            style={[
              styles.card,
              { backgroundColor: cardBg, borderColor: theme.colors.error + "44" },
            ]}
          >
            <View style={[styles.thumbnail, { opacity: 0.5 }]}>
              <Image
                source={{ uri: job.imageUri }}
                style={styles.thumbnailImg}
                contentFit="cover"
              />
            </View>

            <View style={styles.body}>
              <TText
                style={[styles.title, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                Analysis failed
              </TText>
              <TText
                style={[styles.subtitle, { color: theme.colors.error }]}
                numberOfLines={1}
              >
                {job.error ?? "Swipe to dismiss"}
              </TText>
            </View>
          </Animated.View>
        </Swipeable>
      </View>
    );
  }

  // ── Complete state ──────────────────────────────────────────────────────────
  if (job.status === "complete" && job.draft) {
    return (
      <View style={styles.cardShell}>
        <Swipeable {...swipeableProps}>
          <Animated.View
            entering={FadeIn.duration(250)}
            exiting={FadeOut.duration(200)}
            style={[
              styles.card,
              styles.completeCard,
              {
                backgroundColor: cardBg,
                borderColor: theme.colors.primary + "55",
              },
            ]}
          >
            <View style={styles.thumbnail}>
              <Image
                source={{ uri: job.imageUri }}
                style={styles.thumbnailImg}
                contentFit="cover"
              />
            </View>

            <View style={styles.completeBody}>
              <TText
                style={[styles.title, { color: theme.colors.text }]}
                numberOfLines={1}
              >
                {formatFoodName(job.draft.title)}
              </TText>
              <TText
                style={[styles.subtitle, { color: theme.colors.textSecondary }]}
                numberOfLines={1}
              >
                {job.draft.calories} kcal detected
              </TText>
            </View>

            <Pressable
              onPress={() => router.push("/(modals)/scan-result" as never)}
              style={[styles.reviewBtn, { backgroundColor: theme.colors.primary }]}
              hitSlop={6}
            >
              <TText style={styles.reviewBtnText}>Review</TText>
            </Pressable>
          </Animated.View>
        </Swipeable>
      </View>
    );
  }

  // ── Analyzing state ─────────────────────────────────────────────────────────
  return (
    <View style={styles.cardShell}>
      <Swipeable {...swipeableProps}>
        <Animated.View
          entering={FadeIn.duration(250)}
          style={[
            styles.card,
            { backgroundColor: cardBg, borderColor: theme.colors.border },
          ]}
        >
          <PulsingThumbnail uri={job.imageUri} />

          <View style={styles.body}>
            <TText
              style={[styles.title, { color: theme.colors.text }]}
              numberOfLines={1}
            >
              {STAGE_LABELS[stageIndex]}
            </TText>

            <View style={styles.dotsRow}>
              {STAGE_LABELS.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        i <= (job.stageIndex ?? 0)
                          ? theme.colors.primary
                          : theme.colors.border,
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        </Animated.View>
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  cardShell: {
    marginHorizontal: 16,
    marginBottom: 8,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    minHeight: 72,
    maxHeight: 100,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    overflow: "hidden",
    flexShrink: 0,
  },
  thumbnailImg: {
    width: 56,
    height: 56,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  subtitle: {
    fontSize: 12,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  completeCard: {
    maxHeight: 120,
  },
  completeBody: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  reviewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    flexShrink: 0,
  },
  reviewBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  deleteActionContainer: {
    justifyContent: "center",
    marginLeft: 8,
  },
  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 75,
    height: "100%",
    borderRadius: 14,
    gap: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
});
