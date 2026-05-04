/**
 * AnalyzingCard — "Recently Uploaded" pending-review queue
 *
 * Renders the full pending-review stack on the Home screen. Each pending
 * scan is its own row, ordered newest-first. The component is exported
 * under the original name (`AnalyzingCard`) so existing import sites on
 * Home / confirm-meal continue to compile, but the responsibility has
 * moved from "single in-flight job" to "list of pending review items".
 *
 * Per-row states (one shell, fading content):
 *
 *   queued / analyzing
 *     • blurred thumbnail with circular progress ring
 *     • "Analyzing food…" + dynamic stage label
 *     • skeleton shimmer lines
 *     • "We'll notify you when done!" helper
 *
 *   complete
 *     • thumbnail (sharp)
 *     • detected food title + "<calories> kcal detected"
 *     • Review CTA → restores draft and opens confirm-meal
 *
 *   error
 *     • thumbnail (dimmed)
 *     • "Couldn't analyze this meal"
 *     • Retry CTA + Dismiss CTA
 *
 * Swipe-to-delete:
 *   Each row is wrapped in `react-native-gesture-handler`'s `Swipeable`
 *   with the same friction/threshold/animation contract as `MealCard`.
 *   The delete action calls `dismissPendingReview(jobId)` which marks the
 *   row as `dismissed` locally and pushes a soft-delete to the server.
 */

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutRight,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

import {
  type BackgroundScanJob,
  type ScanStage,
  selectVisibleJobs,
  useBackgroundScanStore,
} from "../../features/camera/background-scan.store";
import {
  dismissPendingReview,
  retryBackgroundScan,
} from "../../features/food-logging/background-scan.service";
import {
  invalidateSignedUrl,
  useMealImageSource,
} from "../../features/food-logging/useMealImageSource";
import { useNutritionDraftStore } from "../../features/nutrition/nutrition.draft.store";
import { addFoodLoggingBreadcrumb } from "../../infrastructure/errorReporting/foodLoggingErrors";
import { reportError } from "../../infrastructure/errorReporting";
import { useAppTranslation } from "../../infrastructure/i18n";
import { useTheme } from "../../theme/useTheme";
import { formatFoodName } from "../../utils/formatFoodName";
import { TText } from "../primitives/TText";
import { Skeleton } from "./Skeleton";

const CONTENT_FADE_MS = 220;

function stageSubtitleKey(stage: ScanStage): string {
  switch (stage) {
    case "uploading":
      return "scan.stageUploading";
    case "identifying":
      return "scan.stageIdentifying";
    case "estimating":
      return "scan.stageEstimating";
    case "preparing":
    default:
      return "scan.stagePreparing";
  }
}

// ─── Circular progress ring (SVG) ────────────────────────────────────────────

interface CircularProgressProps {
  progress: number;
  size: number;
  strokeWidth: number;
  trackColor: string;
  progressColor: string;
  textColor: string;
}

function CircularProgress({
  progress,
  size,
  strokeWidth,
  trackColor,
  progressColor,
  textColor,
}: CircularProgressProps) {
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={progressColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View style={styles.progressLabel}>
        <TText style={{ fontSize: 16, fontWeight: "700", color: textColor }}>
          {Math.round(progress * 100)}%
        </TText>
      </View>
    </View>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

interface PendingReviewRowProps {
  job: BackgroundScanJob;
}

function PendingReviewRow({ job }: PendingReviewRowProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const setDraft = useNutritionDraftStore((s) => s.setDraft);
  const swipeRef = useRef<Swipeable>(null);

  const isAnalyzing = job.status === "queued" || job.status === "analyzing";
  const isComplete = job.status === "complete";
  const isError = job.status === "error";

  // Resolve the best image URI: signed URL when online, durable local URI
  // otherwise. The hook handles caching + lazy refresh; we just point the
  // <Image> at whatever it returns. A null result means BOTH sources are
  // unavailable and we fall through to the placeholder icon — but we keep
  // the card visible regardless.
  const { uri: thumbnailUri } = useMealImageSource({
    imageUri: job.imageUri,
    imagePath: job.imagePath,
  });

  // ── Actions ─────────────────────────────────────────────────────────────
  const handleReview = useCallback(() => {
    if (job.status !== "complete" || !job.resultDraft) return;
    try {
      // Hydrate the draft with everything the confirm-meal screen needs to
      // render the photo and link the save back to this pending review.
      setDraft({
        ...job.resultDraft,
        imageUri: job.resultDraft.imageUri ?? job.imageUri,
        imagePath: job.resultDraft.imagePath ?? job.imagePath,
        pendingReviewId: job.id,
      });
      addFoodLoggingBreadcrumb("food_logging.background_scan_review", {
        job_id: job.id,
        calories: job.resultDraft.calories,
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push("/(modals)/confirm-meal" as never);
    } catch (e) {
      reportError(e, {
        area: "scan",
        action: "background_scan_review_restore",
        extra: { jobId: job.id, step: "review_restore" },
      });
      Alert.alert(t("scan.reviewFailedTitle"), t("scan.reviewFailedMessage"));
    }
  }, [job, router, setDraft, t]);

  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void retryBackgroundScan(job.id);
  }, [job.id]);

  const handleConfirmDismiss = useCallback(() => {
    swipeRef.current?.close();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t("home.dismissPendingScanTitle"),
      t("home.dismissPendingScanMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Success
            );
            dismissPendingReview(job.id);
          },
        },
      ]
    );
  }, [job.id, t]);

  // ── Theme tokens ─────────────────────────────────────────────────────────
  const cardBg = theme.colors.surface ?? theme.colors.surfaceSecondary;
  const borderColor = isError
    ? theme.colors.error + "55"
    : isComplete
      ? theme.colors.primary + "66"
      : theme.colors.border;

  const accessibilityLabel = isAnalyzing
    ? `${t("scan.analyzing")}, ${Math.round(job.progress * 100)}%`
    : isComplete && job.resultDraft
      ? `${formatFoodName(job.resultDraft.title)}, ${job.resultDraft.calories} ${t("tracking.cal")}`
      : t("scan.failedTitle");

  // ── Body / trailing ──────────────────────────────────────────────────────
  const renderBody = () => {
    if (isError) {
      return (
        <Animated.View
          key="error"
          entering={FadeIn.duration(CONTENT_FADE_MS)}
          exiting={FadeOut.duration(CONTENT_FADE_MS)}
          style={styles.body}
        >
          <TText
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {t("scan.failedTitle")}
          </TText>
          <TText
            style={[styles.subtitle, { color: theme.colors.error }]}
            numberOfLines={2}
          >
            {job.errorMessage ?? t("scan.tryAgain")}
          </TText>
        </Animated.View>
      );
    }

    if (isComplete && job.resultDraft) {
      return (
        <Animated.View
          key="complete"
          entering={FadeIn.duration(CONTENT_FADE_MS)}
          exiting={FadeOut.duration(CONTENT_FADE_MS)}
          style={styles.body}
        >
          <TText
            style={[styles.title, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {formatFoodName(job.resultDraft.title)}
          </TText>
          <TText
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            numberOfLines={1}
          >
            {t("scan.kcalDetected", { calories: job.resultDraft.calories })}
          </TText>
        </Animated.View>
      );
    }

    return (
      <Animated.View
        key="analyzing"
        entering={FadeIn.duration(CONTENT_FADE_MS)}
        exiting={FadeOut.duration(CONTENT_FADE_MS)}
        style={styles.bodyAnalyzing}
      >
        <TText
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {t("scan.analyzing")}
        </TText>
        <TText
          style={[styles.subtitleFaded, { color: theme.colors.textMuted }]}
          numberOfLines={1}
        >
          {t(stageSubtitleKey(job.stage))}
        </TText>
        <View style={styles.skeletonLines}>
          <Skeleton height={10} borderRadius={5} />
          <Skeleton height={8} width="80%" borderRadius={4} />
          <Skeleton height={8} width="60%" borderRadius={4} />
        </View>
      </Animated.View>
    );
  };

  const renderTrailing = () => {
    if (isComplete && job.resultDraft) {
      return (
        <Animated.View
          entering={FadeIn.duration(CONTENT_FADE_MS)}
          exiting={FadeOut.duration(CONTENT_FADE_MS)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("scan.review")}
            onPress={handleReview}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            hitSlop={8}
          >
            <TText style={styles.primaryBtnText}>{t("scan.review")}</TText>
          </Pressable>
        </Animated.View>
      );
    }
    if (isError) {
      return (
        <Animated.View
          entering={FadeIn.duration(CONTENT_FADE_MS)}
          exiting={FadeOut.duration(CONTENT_FADE_MS)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("scan.retry")}
            onPress={handleRetry}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: theme.colors.primary,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            hitSlop={8}
          >
            <TText style={styles.primaryBtnText}>{t("scan.retry")}</TText>
          </Pressable>
        </Animated.View>
      );
    }
    return null;
  };

  // ── Right-side delete action (matches MealCard exactly) ──────────────────
  const renderRightActions = () => (
    <Animated.View
      entering={SlideInRight.duration(250).damping(20)}
      exiting={SlideOutRight.duration(200)}
      style={styles.deleteActionContainer}
    >
      <Pressable
        onPress={handleConfirmDismiss}
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

  // ── Card body ────────────────────────────────────────────────────────────
  const cardContent = (
    <Animated.View
      entering={FadeIn.duration(CONTENT_FADE_MS)}
      exiting={FadeOut.duration(CONTENT_FADE_MS)}
      style={[styles.card, { backgroundColor: cardBg, borderColor }]}
      accessible
      accessibilityLabel={accessibilityLabel}
    >
      <View style={styles.row}>
        <View
          style={[
            styles.thumbnail,
            { backgroundColor: theme.colors.surfaceSecondary },
            isError ? styles.thumbnailDimmed : null,
          ]}
        >
          {thumbnailUri ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.thumbnailImg}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => {
                // Cached signed URL is no longer resolvable (rotation,
                // expiry, or the underlying object went away). Drop it
                // from the cache so the next render re-fetches; the
                // local URI fallback keeps us visible in the meantime.
                if (job.imagePath) invalidateSignedUrl(job.imagePath);
              }}
            />
          ) : (
            <View style={styles.thumbnailFallback}>
              <Ionicons
                name="image-outline"
                size={28}
                color={theme.colors.textMuted}
              />
            </View>
          )}
          {isAnalyzing ? (
            <>
              <View
                pointerEvents="none"
                style={[
                  styles.thumbOverlay,
                  {
                    backgroundColor:
                      theme.mode === "dark"
                        ? "rgba(0,0,0,0.5)"
                        : "rgba(255,255,255,0.3)",
                  },
                ]}
              />
              <View
                style={styles.progressRingContainer}
                accessibilityRole="progressbar"
              >
                <CircularProgress
                  progress={Math.max(0.01, Math.min(0.99, job.progress))}
                  size={68}
                  strokeWidth={4}
                  trackColor={
                    theme.mode === "dark"
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.15)"
                  }
                  progressColor={theme.colors.primary}
                  textColor={theme.colors.text}
                />
              </View>
            </>
          ) : null}
        </View>

        {renderBody()}
        {renderTrailing()}
      </View>

      {isAnalyzing ? (
        <View style={styles.helperRow}>
          <TText
            style={[styles.helper, { color: theme.colors.textMuted }]}
            numberOfLines={1}
          >
            {t("scan.notifyWhenDone")}
          </TText>
        </View>
      ) : null}
    </Animated.View>
  );

  // Wrap in Swipeable for parity with the meal cards below.
  return (
    <View style={styles.rowOuter}>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
        rightThreshold={40}
        onSwipeableWillOpen={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
      >
        {isComplete ? (
          <Pressable
            onPress={handleReview}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.99 : 1 }],
              },
            ]}
          >
            {cardContent}
          </Pressable>
        ) : (
          cardContent
        )}
      </Swipeable>
    </View>
  );
}

// ─── List entry (default export — keeps existing imports working) ───────────

export function AnalyzingCard() {
  const { t } = useAppTranslation();
  const { theme } = useTheme();
  const purgeIfExpired = useBackgroundScanStore((s) => s.purgeIfExpired);
  const jobsMap = useBackgroundScanStore((s) => s.jobs);

  // Drop expired jobs whenever the list re-mounts or jobs change.
  useEffect(() => {
    purgeIfExpired();
  }, [purgeIfExpired]);

  const jobs = useMemo(
    () => selectVisibleJobs({ jobs: jobsMap } as never),
    [jobsMap]
  );

  if (jobs.length === 0) return null;

  return (
    <View style={styles.cardShell}>
      <TText
        style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}
        numberOfLines={1}
      >
        {t("scan.recentlyUploaded")}
      </TText>
      {jobs.map((job) => (
        <PendingReviewRow key={job.id} job={job} />
      ))}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  cardShell: {
    marginHorizontal: 16,
    marginBottom: 12,
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 0,
    marginLeft: 2,
  },
  rowOuter: {
    // Lets the swipe action shadow render outside the card.
    overflow: "visible",
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
    minHeight: 130,
  },
  thumbnail: {
    width: 102,
    height: 102,
    borderRadius: 18,
    overflow: "hidden",
    flexShrink: 0,
    position: "relative",
  },
  thumbnailDimmed: {
    opacity: 0.5,
  },
  thumbnailImg: {
    width: 102,
    height: 102,
  },
  thumbnailFallback: {
    width: 102,
    height: 102,
    alignItems: "center",
    justifyContent: "center",
  },
  thumbOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  progressRingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  progressLabel: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  body: {
    flex: 1,
    gap: 4,
    justifyContent: "center",
  },
  bodyAnalyzing: {
    flex: 1,
    gap: 8,
    justifyContent: "center",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 16,
  },
  subtitleFaded: {
    fontSize: 13,
    lineHeight: 16,
    opacity: 0.6,
  },
  skeletonLines: {
    gap: 6,
    marginTop: 2,
  },
  primaryBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    flexShrink: 0,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  helperRow: {
    paddingHorizontal: 14,
    paddingBottom: 12,
    paddingTop: 4,
  },
  helper: {
    fontSize: 12,
    lineHeight: 15,
    textAlign: "center",
  },
  // Match MealCard's swipe action exactly.
  deleteActionContainer: {
    justifyContent: "center",
    marginLeft: 8,
  },
  deleteAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 75,
    height: "100%",
    borderRadius: 24,
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
