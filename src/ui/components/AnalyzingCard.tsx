/**
 * AnalyzingCard
 *
 * Compact home-screen card that reflects the background scan state.
 * Returns null when no scan job is active.
 *
 * States:
 *   analyzing  — thumbnail + pulse + rotating stage labels + progress dots
 *   complete   — thumbnail + meal name + calories + "Tap to review →"
 *                Auto-opens scan-result modal once (tracked in store, not a ref)
 *   error      — dimmed thumbnail + retry / dismiss
 */

import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeOut,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { useBackgroundScanStore } from "../../features/camera/background-scan.store";
import { useTheme } from "../../theme/useTheme";
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
  }, [opacity]);

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
  const router = useRouter();
  const job = useBackgroundScanStore((s) => s.job);
  const { resetScan, markAutoOpened } = useBackgroundScanStore.getState();

  const [stageIndex, setStageIndex] = useState(0);
  const cycleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDismissRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Auto-open scan-result once when complete.
  // Deferred to next event-loop tick so the push doesn't fire
  // synchronously inside a Zustand-triggered re-render (invariant crash).
  useEffect(() => {
    if (job?.status === "complete" && !job.hasAutoOpened && job.id) {
      const capturedId = job.id;
      markAutoOpened(capturedId);
      setTimeout(() => {
        try {
          router.push("/(modals)/scan-result" as never);
        } catch {
          // Navigation failed — card stays visible, user can tap manually
        }
      }, 0);
    }
  }, [job?.status, job?.hasAutoOpened, job?.id, markAutoOpened, router]);

  // Auto-dismiss the "complete" card after 8 s if the user ignores it.
  // This prevents it from sitting on home indefinitely after a confirm or swipe-away.
  useEffect(() => {
    if (job?.status === "complete") {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
      autoDismissRef.current = setTimeout(() => {
        resetScan();
      }, 8000);
    } else {
      if (autoDismissRef.current) {
        clearTimeout(autoDismissRef.current);
        autoDismissRef.current = null;
      }
    }
    return () => {
      if (autoDismissRef.current) clearTimeout(autoDismissRef.current);
    };
  }, [job?.status, resetScan]);

  if (!job) return null;

  const cardBg = theme.colors.surface ?? theme.colors.surfaceSecondary;

  // ── Error state ─────────────────────────────────────────────────────────────
  if (job.status === "error") {
    return (
      <Animated.View
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(200)}
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: theme.colors.error + "44" },
        ]}
      >
        {/* Dimmed thumbnail */}
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
            {job.error ?? "Tap to retry"}
          </TText>
        </View>

        {/* Dismiss */}
        <Pressable
          onPress={() => resetScan()}
          hitSlop={12}
          style={styles.dismissBtn}
        >
          <Ionicons name="close" size={16} color={theme.colors.textMuted} />
        </Pressable>
      </Animated.View>
    );
  }

  // ── Complete state ──────────────────────────────────────────────────────────
  if (job.status === "complete" && job.draft) {
    return (
      <Animated.View
        entering={FadeIn.duration(250)}
        exiting={FadeOut.duration(200)}
        style={[
          styles.card,
          { backgroundColor: cardBg, borderColor: theme.colors.primary + "44" },
        ]}
      >
        <Pressable
          style={styles.innerRow}
          onPress={() => router.push("/(modals)/scan-result" as never)}
        >
          <View style={styles.thumbnail}>
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
              {job.draft.title}
            </TText>
            <TText
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              {job.draft.calories} kcal · Tap to review
            </TText>
          </View>

          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.colors.textMuted}
          />
        </Pressable>

        {/* Dismiss */}
        <Pressable
          onPress={() => resetScan()}
          hitSlop={12}
          style={styles.dismissBtn}
        >
          <Ionicons name="close" size={16} color={theme.colors.textMuted} />
        </Pressable>
      </Animated.View>
    );
  }

  // ── Analyzing state ─────────────────────────────────────────────────────────
  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: theme.colors.border },
      ]}
    >
      <PulsingThumbnail uri={job.imageUri} />

      <View style={styles.body}>
        <Animated.Text
          key={stageIndex}
          entering={FadeIn.duration(300)}
          style={[
            styles.title,
            { color: theme.colors.text, fontFamily: undefined },
          ]}
          numberOfLines={1}
        >
          {STAGE_LABELS[stageIndex]}
        </Animated.Text>

        {/* Progress dots */}
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

      {/* Dismiss */}
      <Pressable
        onPress={() => resetScan()}
        hitSlop={12}
        style={styles.dismissBtn}
      >
        <Ionicons name="close" size={16} color={theme.colors.textMuted} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 10,
    minHeight: 72,
    maxHeight: 100,
  },
  innerRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  dismissBtn: {
    padding: 4,
    flexShrink: 0,
  },
});
