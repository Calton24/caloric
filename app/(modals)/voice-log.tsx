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
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLoggingFlow } from "../../src/features/nutrition/use-logging-flow";
import { useVoiceCapture } from "../../src/features/voice";
import { useTheme } from "../../src/theme/useTheme";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function VoiceLoggingScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { startFromInput } = useLoggingFlow();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
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

  // ── Auto-start listening on mount ─────────────────────────────────────
  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    // Small delay so the screen animates in and reset completes
    const t = setTimeout(() => startListening(), 400);
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
      try {
        const foundFood = await startFromInput(transcript, "voice");
        if (!foundFood) {
          setIsProcessing(false);
          setProcessingError(
            'No food detected. Try saying just the food name, e.g. "chicken and rice".'
          );
          hasProcessed.current = false;
        }
      } catch {
        setIsProcessing(false);
        setProcessingError("Couldn't look up nutrition. Tap retry.");
        hasProcessed.current = false;
      }
    })();
  }, [status, transcript, startFromInput]);

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
      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0, { duration: 300 });
    }
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
            {displayState === "processing" ? "Looking it up…" : "Listening"}
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
                  Listening
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
                  Describe what you ate…
                </TText>
              )}

              <TSpacer size="xl" />

              <TText
                style={[styles.micHint, { color: theme.colors.textMuted }]}
              >
                Tap mic to finish early
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
                Looking up nutrition…
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
                {error || processingError || "Something went wrong"}
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
                  Try again
                </TText>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </View>
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
