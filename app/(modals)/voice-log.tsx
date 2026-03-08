/**
 * Voice Logging Screen
 *
 * Pulsing mic button, live transcription area, and confirm flow.
 * Uses expo-speech-recognition to capture meal descriptions.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInUp,
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

  // Reset voice state on mount so each session starts fresh
  const hasReset = useRef(false);
  useEffect(() => {
    if (!hasReset.current) {
      hasReset.current = true;
      retry(); // calls store.reset()
    }
  }, [retry]);

  // Derive the three display states from voice status
  const displayState =
    status === "listening" || status === "finalizing"
      ? "recording"
      : status === "done"
        ? "done"
        : "idle";

  // Pulse animation for recording indicator
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  // Drive pulse animation based on listening state
  useEffect(() => {
    if (isListening) {
      pulseScale.value = withRepeat(
        withTiming(1.3, { duration: 1000 }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0.15, { duration: 1000 }),
        -1,
        true
      );
    } else {
      pulseScale.value = withTiming(1, { duration: 300 });
      pulseOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [isListening, pulseScale, pulseOpacity]);

  const handleMicPress = useCallback(() => {
    if (displayState === "recording") {
      stopListening();
    } else {
      startListening();
    }
  }, [displayState, startListening, stopListening]);

  const handleConfirm = useCallback(async () => {
    if (!transcript.trim() || isProcessing) return;
    setIsProcessing(true);
    try {
      await startFromInput(transcript, "voice");
    } finally {
      setIsProcessing(false);
    }
  }, [transcript, startFromInput, isProcessing]);

  const handleRetry = useCallback(() => {
    retry();
  }, [retry]);

  const handleClose = useCallback(() => {
    cancelListening();
    router.back();
  }, [cancelListening, router]);

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
            Voice Log
          </TText>
          <View style={{ width: 24 }} />
        </View>

        {/* Transcript area */}
        <View style={styles.transcriptArea}>
          {displayState === "idle" && (
            <Animated.View entering={FadeIn.duration(400)}>
              {error ? (
                <TText
                  style={[styles.placeholder, { color: theme.colors.error }]}
                >
                  {error}
                  {"\n\n"}Tap the mic to try again
                </TText>
              ) : (
                <TText
                  style={[
                    styles.placeholder,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Tap the mic and describe{"\n"}what you ate
                </TText>
              )}
            </Animated.View>
          )}

          {displayState === "recording" && (
            <Animated.View entering={FadeIn.duration(300)}>
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
                  Listening...
                </TText>
              </View>
              <TSpacer size="md" />
              {transcript ? (
                <TText
                  style={[styles.transcriptText, { color: theme.colors.text }]}
                >
                  {transcript}
                </TText>
              ) : (
                <TText
                  style={[
                    styles.placeholder,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Speak now...
                </TText>
              )}
            </Animated.View>
          )}

          {displayState === "done" && transcript && (
            <Animated.View entering={FadeIn.duration(300)}>
              <TText
                style={[styles.doneLabel, { color: theme.colors.success }]}
              >
                Food detected
              </TText>
              <TSpacer size="md" />
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
              <TSpacer size="md" />
              <TText
                style={[styles.micHintDone, { color: theme.colors.textMuted }]}
              >
                Review your description and tap Confirm
              </TText>
            </Animated.View>
          )}
        </View>

        {/* Bottom controls */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(200)}
          style={styles.controls}
        >
          {displayState === "done" ? (
            <View style={styles.doneActions}>
              <Pressable
                onPress={handleRetry}
                style={[
                  styles.retryBtn,
                  { backgroundColor: theme.colors.surfaceSecondary },
                ]}
              >
                <Ionicons name="refresh" size={20} color={theme.colors.text} />
                <TText style={[styles.retryText, { color: theme.colors.text }]}>
                  Retry
                </TText>
              </Pressable>

              <Pressable
                onPress={handleConfirm}
                disabled={isProcessing}
                style={[styles.confirmBtn, isProcessing && { opacity: 0.6 }]}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmGradient}
                >
                  {isProcessing ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.textInverse}
                    />
                  ) : (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.colors.textInverse}
                    />
                  )}
                  <TText
                    style={[
                      styles.confirmText,
                      { color: theme.colors.textInverse },
                    ]}
                  >
                    {isProcessing ? "Processing..." : "Confirm"}
                  </TText>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View style={styles.micArea}>
              {/* Pulse ring */}
              {displayState === "recording" && (
                <Animated.View
                  style={[
                    styles.pulseRing,
                    { backgroundColor: theme.colors.primary },
                    pulseStyle,
                  ]}
                />
              )}
              <Pressable onPress={handleMicPress} style={styles.micBtn}>
                <LinearGradient
                  colors={
                    displayState === "recording"
                      ? [theme.colors.error, "#FF4444"]
                      : [theme.colors.primary, theme.colors.accent]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.micGradient}
                >
                  <Ionicons
                    name={displayState === "recording" ? "stop" : "mic"}
                    size={36}
                    color={theme.colors.textInverse}
                  />
                </LinearGradient>
              </Pressable>
              <TSpacer size="sm" />
              <TText
                style={[styles.micHint, { color: theme.colors.textMuted }]}
              >
                {displayState === "recording" ? "Tap to stop" : "Tap to speak"}
              </TText>
            </View>
          )}
        </Animated.View>
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
  placeholder: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "500",
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
  transcriptText: {
    fontSize: 18,
    textAlign: "center",
    lineHeight: 28,
    fontWeight: "500",
  },
  doneLabel: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  transcriptCard: {
    borderRadius: 16,
    padding: 20,
    width: "100%",
  },
  micHintDone: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
  },
  controls: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  micArea: {
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  micBtn: {
    borderRadius: 44,
    overflow: "hidden",
  },
  micGradient: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  micHint: {
    fontSize: 13,
    fontWeight: "500",
  },
  doneActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  retryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  retryText: {
    fontSize: 16,
    fontWeight: "600",
  },
  confirmBtn: {
    flex: 2,
    borderRadius: 14,
    overflow: "hidden",
  },
  confirmGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  confirmText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
