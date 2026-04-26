/**
 * Voice Logging Screen
 *
 * Pulsing mic button, live transcription area, and confirm flow.
 * Uses speech recognition to capture meal descriptions.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    cancelAnimation,
    FadeIn,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../src/theme/useTheme";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

type RecordingState = "idle" | "recording" | "done";

export default function VoiceLoggingScreen() {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const router = useRouter();
  const [state, setState] = useState<RecordingState>("idle");
  const [transcript, setTranscript] = useState("");

  // Pulse animation for recording indicator
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.4);

  // Cancel any running repeats on unmount
  React.useEffect(() => {
    return () => {
      cancelAnimation(pulseScale);
      cancelAnimation(pulseOpacity);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const startRecording = useCallback(() => {
    setState("recording");
    // Start pulse animation
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

    // Simulate transcription for demo
    setTimeout(() => {
      setTranscript("I had two eggs and toast with butter for breakfast");
    }, 1500);
  }, [pulseScale, pulseOpacity]);

  const stopRecording = useCallback(() => {
    setState("done");
    pulseScale.value = withTiming(1, { duration: 300 });
    pulseOpacity.value = withTiming(0, { duration: 300 });
  }, [pulseScale, pulseOpacity]);

  const handleConfirm = () => {
    // Route to meal confirmation screen with detected data
    router.push({
      pathname: "/confirm-meal" as any,
      params: {
        id: `meal_${Date.now()}`,
        title: transcript,
        icon: "🎙️",
        calories: "380",
        protein: "12",
        carbs: "42",
        fat: "14",
        source: "voice",
      },
    });
  };

  const handleRetry = () => {
    setState("idle");
    setTranscript("");
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </Pressable>
          <TText
            variant="heading"
            style={[styles.headerTitle, { color: theme.colors.text }]}
          >
            {t("tracking.voiceLog")}
          </TText>
          <View style={{ width: 24 }} />
        </View>

        {/* Transcript area */}
        <View style={styles.transcriptArea}>
          {state === "idle" && (
            <Animated.View entering={FadeIn.duration(400)}>
              <TText
                style={[styles.placeholder, { color: theme.colors.textMuted }]}
              >
                {t("tracking.tapMic")}
              </TText>
            </Animated.View>
          )}

          {state === "recording" && (
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
                  {t("tracking.listening")}
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
                  {t("voiceLog.speakNow")}
                </TText>
              )}
            </Animated.View>
          )}

          {state === "done" && transcript && (
            <Animated.View entering={FadeIn.duration(300)}>
              <TText
                style={[styles.doneLabel, { color: theme.colors.success }]}
              >
                {t("voiceLog.foodDetected")}
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
              <View style={styles.detectedItems}>
                {["Two eggs", "Toast", "Butter"].map((item) => (
                  <View
                    key={item}
                    style={[
                      styles.foodPill,
                      { backgroundColor: theme.colors.primary + "22" },
                    ]}
                  >
                    <TText
                      style={[
                        styles.foodPillText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {item}
                    </TText>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}
        </View>

        {/* Bottom controls */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(200)}
          style={styles.controls}
        >
          {state === "done" ? (
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
                  {t("tracking.retry")}
                </TText>
              </Pressable>

              <Pressable onPress={handleConfirm} style={styles.confirmBtn}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.confirmGradient}
                >
                  <Ionicons
                    name="checkmark"
                    size={20}
                    color={theme.colors.textInverse}
                  />
                  <TText
                    style={[
                      styles.confirmText,
                      { color: theme.colors.textInverse },
                    ]}
                  >
                    {t("tracking.confirm")}
                  </TText>
                </LinearGradient>
              </Pressable>
            </View>
          ) : (
            <View style={styles.micArea}>
              {/* Pulse ring */}
              {state === "recording" && (
                <Animated.View
                  style={[
                    styles.pulseRing,
                    { backgroundColor: theme.colors.primary },
                    pulseStyle,
                  ]}
                />
              )}
              <Pressable
                onPress={state === "idle" ? startRecording : stopRecording}
                style={styles.micBtn}
              >
                <LinearGradient
                  colors={
                    state === "recording"
                      ? [theme.colors.error, "#FF4444"]
                      : [theme.colors.primary, theme.colors.accent]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.micGradient}
                >
                  <Ionicons
                    name={state === "recording" ? "stop" : "mic"}
                    size={36}
                    color={theme.colors.textInverse}
                  />
                </LinearGradient>
              </Pressable>
              <TSpacer size="sm" />
              <TText
                style={[styles.micHint, { color: theme.colors.textMuted }]}
              >
                {state === "recording" ? "Tap to stop" : "Tap to speak"}
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
  detectedItems: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  foodPill: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  foodPillText: {
    fontSize: 14,
    fontWeight: "600",
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
