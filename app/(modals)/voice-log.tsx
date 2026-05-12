/**
 * Voice Logging Screen
 *
 * Seamless voice capture: auto-starts listening on mount,
 * auto-processes the transcript when speech ends, and navigates
 * straight to confirm-meal with results. Zero taps needed.
 *
 * Flow: Open → Listening → Processing → Confirm Meal
 */

import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { FoodIdentificationFallback } from "../../src/features/food-logging/components/FoodIdentificationFallback";
import { useLoggingFlow } from "../../src/features/nutrition/use-logging-flow";
import { useVoiceCapture } from "../../src/features/voice";
import { addFoodLoggingBreadcrumb } from "../../src/infrastructure/errorReporting/foodLoggingErrors";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";
import { FoodLoggingErrorBoundary } from "../../src/ui/errors/FoodLoggingErrorBoundary";

function VoiceLoggingScreenInner() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { startFromInput } = useLoggingFlow();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  // When the transcript is intelligible but our food matcher returns nothing,
  // surface the unified fallback so the user can refine the description and
  // hit "Find food" again — this replaces the dead-end "Try Again" loop.
  const [showFallback, setShowFallback] = useState(false);
  const [failedTranscript, setFailedTranscript] = useState("");
  const {
    status,
    transcript,
    isListening,
    error,
    startListening,
    stopListening,
    cancelListening,
    retry,
  } = useVoiceCapture();

  // ── Reset store on mount so stale transcript doesn't leak ──────────
  const hasListenedThisSession = useRef(false);
  useEffect(() => {
    retry(); // calls store.reset() — clears transcript, status, error
  }, [retry]);

  useEffect(() => {
    addFoodLoggingBreadcrumb("food_logging.voice_opened", {
      route: pathname,
    });
  }, [pathname]);

  // ── Auto-start listening on mount ─────────────────────────────────────
  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    // Small delay so the screen animates in and reset completes
    const t = setTimeout(() => {
      addFoodLoggingBreadcrumb("food_logging.voice_recording_started");
      startListening();
    }, 400);
    return () => clearTimeout(t);
  }, [startListening]);

  // Track when listening actually starts in THIS session
  useEffect(() => {
    if (isListening) {
      hasListenedThisSession.current = true;
    }
  }, [isListening]);

  // ── Auto-process when speech recognition completes ────────────────────
  // Only fires after we've listened at least once this session,
  // preventing stale "done" state from previous sessions from triggering.
  const hasProcessed = useRef(false);
  useEffect(() => {
    if (!hasListenedThisSession.current) return;
    if (status !== "done" || !transcript.trim() || hasProcessed.current) return;
    hasProcessed.current = true;

    (async () => {
      setIsProcessing(true);
      setProcessingError(null);
      addFoodLoggingBreadcrumb("food_logging.voice_transcription_started", {
        transcript_length: transcript.trim().length,
      });
      try {
        const foundFood = await startFromInput(transcript, "voice");
        if (!foundFood) {
          addFoodLoggingBreadcrumb("food_logging.voice_transcription_failed", {
            reason: "no_food",
          });
          setIsProcessing(false);
          setFailedTranscript(transcript);
          setShowFallback(true);
          hasProcessed.current = false;
        } else {
          addFoodLoggingBreadcrumb("food_logging.voice_transcription_success");
        }
      } catch {
        addFoodLoggingBreadcrumb("food_logging.voice_transcription_failed", {
          reason: "exception",
        });
        setIsProcessing(false);
        setProcessingError(t("voiceLog.lookupFailed"));
        hasProcessed.current = false;
      }
    })();
  }, [status, transcript, startFromInput, t]);

  // Derive display state
  const displayState = isProcessing
    ? "processing"
    : processingError
      ? "error"
      : status === "listening" || status === "finalizing"
        ? "listening"
        : status === "done"
          ? "processing" // brief moment before auto-process kicks in
          : "listening"; // idle → we're about to auto-start

  // ── Pulse animation ───────────────────────────────────────────────────
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withTiming(1.5, { duration: 1000 }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0.1, { duration: 1000 }),
        -1,
        true
      );
    } else {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0, { duration: 300 });
    }
    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
    };
  }, [isListening, pulseScale, pulseOpacity]);

  // ── Actions ───────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setIsProcessing(false);
    setProcessingError(null);
    hasProcessed.current = false;
    retry();
    // Re-start listening after a brief reset
    setTimeout(() => startListening(), 200);
  }, [retry, startListening]);

  const handleClose = useCallback(() => {
    cancelListening();
    router.back();
  }, [cancelListening, router]);

  const handleStopEarly = useCallback(() => {
    stopListening();
  }, [stopListening]);

  if (showFallback) {
    return (
      <FoodIdentificationFallback
        source="manual"
        initialQuery={failedTranscript}
        errorReason="manual_not_found"
        onBack={() => {
          setShowFallback(false);
          handleClose();
        }}
        onRetry={() => {
          setShowFallback(false);
          setFailedTranscript("");
          hasProcessed.current = false;
          retry();
          setTimeout(() => startListening(), 200);
        }}
        onAddManually={() => {
          setShowFallback(false);
          requestAnimationFrame(() => {
            router.replace("/(modals)/manual-log" as never);
          });
        }}
        onResolveQuery={async (typed) => {
          try {
            addFoodLoggingBreadcrumb("food_logging.fallback_lookup_started", {
              length: typed.trim().length,
              source: "voice",
            });
            const ok = await startFromInput(typed, "voice", {
              foodIdentificationRecoverySource: "manual",
            });
            if (ok) {
              addFoodLoggingBreadcrumb("food_logging.fallback_lookup_success");
              return { ok: true };
            }
            addFoodLoggingBreadcrumb("food_logging.fallback_lookup_no_match");
            return { ok: false };
          } catch {
            return { ok: false };
          }
        }}
      />
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose} hitSlop={12}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            {displayState === "processing"
              ? t("voiceLog.lookingItUp")
              : t("voiceLog.listening")}
          </TText>
          <View style={{ width: 24 }} />
        </View>

        {/* Main content area */}
        <View style={styles.transcriptArea}>
          {/* Listening state — pulsing mic + live transcript */}
          {displayState === "listening" && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={styles.listeningContent}
            >
              {/* Animated pulse ring + mic icon */}
              <View style={styles.micArea}>
                <Animated.View
                  style={[
                    styles.pulseRing,
                    { backgroundColor: theme.colors.primary },
                    pulseStyle,
                  ]}
                />
                <Pressable onPress={handleStopEarly} style={styles.micCircle}>
                  <View
                    style={[
                      styles.micCircleInner,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Ionicons
                      name="mic"
                      size={32}
                      color={theme.colors.textInverse}
                    />
                  </View>
                </Pressable>
              </View>

              <TSpacer size="lg" />

              {/* Recording dot + label */}
              <View style={styles.recordingIndicator}>
                <View
                  style={[
                    styles.recordDot,
                    { backgroundColor: theme.colors.error },
                  ]}
                />
                <TText
                  style={[styles.recordingLabel, { color: theme.colors.error }]}
                >
                  {t("voiceLog.listening")}
                </TText>
              </View>

              <TSpacer size="md" />

              {/* Live transcript or "speak now" */}
              {transcript ? (
                <Animated.View entering={FadeIn.duration(200)}>
                  <TText
                    style={[
                      styles.transcriptText,
                      { color: theme.colors.text },
                    ]}
                  >
                    {transcript}
                  </TText>
                </Animated.View>
              ) : (
                <TText
                  style={[
                    styles.placeholder,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  {t("voiceLog.describeFood")}
                </TText>
              )}

              <TSpacer size="xl" />

              <TText
                style={[styles.micHint, { color: theme.colors.textMuted }]}
              >
                {t("voiceLog.tapMicFinish")}
              </TText>
            </Animated.View>
          )}

          {/* Processing state — looking up nutrition */}
          {displayState === "processing" && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={styles.processingContent}
            >
              <View
                style={[
                  styles.transcriptCard,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <TText
                  style={[styles.transcriptText, { color: theme.colors.text }]}
                >
                  {transcript}
                </TText>
              </View>

              <TSpacer size="lg" />

              <ActivityIndicator size="large" color={theme.colors.primary} />
              <TSpacer size="md" />
              <TText
                style={[
                  styles.processingLabel,
                  { color: theme.colors.textMuted },
                ]}
              >
                {t("voiceLog.lookingUpNutrition")}
              </TText>
            </Animated.View>
          )}

          {/* Error state — retry or close */}
          {displayState === "error" && (
            <Animated.View
              entering={FadeIn.duration(300)}
              style={styles.errorContent}
            >
              <Ionicons
                name="alert-circle-outline"
                size={48}
                color={theme.colors.error}
              />
              <TSpacer size="md" />
              <TText style={[styles.errorTitle, { color: theme.colors.text }]}>
                {error || processingError || t("common.error")}
              </TText>
              <TSpacer size="lg" />
              <Pressable
                onPress={handleRetry}
                style={[
                  styles.retryBtn,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="refresh" size={20} color={theme.colors.text} />
                <TText style={[styles.retryText, { color: theme.colors.text }]}>
                  {t("voiceLog.tryAgain")}
                </TText>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

export default function VoiceLoggingScreen() {
  return (
    <FoodLoggingErrorBoundary routeLabel="/(modals)/voice-log">
      <VoiceLoggingScreenInner />
    </FoodLoggingErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  transcriptArea: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  // ── Listening ──
  listeningContent: {
    alignItems: "center",
    width: "100%",
  },
  micArea: {
    alignItems: "center",
    justifyContent: "center",
    width: 100,
    height: 100,
  },
  pulseRing: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  micCircle: {
    borderRadius: 40,
    overflow: "hidden",
  },
  micCircleInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  recordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  placeholder: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "500",
  },
  transcriptText: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "500",
  },
  micHint: {
    fontSize: 13,
    fontWeight: "500",
  },
  // ── Processing ──
  processingContent: {
    alignItems: "center",
    width: "100%",
  },
  transcriptCard: {
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },
  processingLabel: {
    fontSize: 15,
    fontWeight: "500",
  },
  // ── Error ──
  errorContent: {
    alignItems: "center",
    width: "100%",
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
