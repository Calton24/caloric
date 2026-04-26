/**
 * VoiceLogSheet
 *
 * Glassmorphic bottom-sheet voice logging with layered pulse rings,
 * animated sound-wave bars, and polished state transitions.
 *
 * States: listening → processing → error (with retry)
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
    Easing,
    FadeIn,
    FadeInDown,
    FadeOut,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { useLoggingFlow } from "../../features/nutrition/use-logging-flow";
import { useVoiceCapture } from "../../features/voice";
import { useAppTranslation } from "../../infrastructure/i18n";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

// ── Sound-wave bar count ────────────────────────────────────────────────
const WAVE_BAR_COUNT = 5;
const WAVE_DURATIONS = [600, 500, 700, 450, 550]; // staggered Hz feel

interface VoiceLogSheetProps {
  onClose: () => void;
}

export function VoiceLogSheet({ onClose }: VoiceLogSheetProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { startFromInput } = useLoggingFlow();
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [showRetryCta, setShowRetryCta] = useState(false);
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

  // ── Cancel listening on unmount (sheet dismissed) ─────────────────────
  useEffect(() => {
    return () => {
      cancelListening();
    };
  }, [cancelListening]);

  // ── Reset store on mount ──────────────────────────────────────────────
  const hasListenedThisSession = useRef(false);
  useEffect(() => {
    retry();
  }, [retry]);

  // ── Auto-start listening on mount ─────────────────────────────────────
  const hasStarted = useRef(false);
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    const t = setTimeout(() => startListening(), 400);
    return () => clearTimeout(t);
  }, [startListening]);

  useEffect(() => {
    if (isListening) hasListenedThisSession.current = true;
  }, [isListening]);

  // ── Auto-process when speech ends ─────────────────────────────────────
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
        if (foundFood) {
          onClose();
        } else {
          setIsProcessing(false);
          setProcessingError(t("voiceLog.noFoodDetected"));
          hasProcessed.current = false;
        }
      } catch {
        setIsProcessing(false);
        setProcessingError(t("voiceLog.lookupFailed"));
        hasProcessed.current = false;
      }
    })();
  }, [status, transcript, startFromInput, onClose]);

  // ── Display state ─────────────────────────────────────────────────────
  const displayState = isProcessing
    ? "processing"
    : processingError
      ? "error"
      : status === "listening" || status === "finalizing"
        ? "listening"
        : status === "done"
          ? "processing"
          : "listening";

  // ── Show retry CTA after 6s in listening state ────────────────────────
  useEffect(() => {
    if (displayState !== "listening") {
      setShowRetryCta(false);
      return;
    }
    const t = setTimeout(() => setShowRetryCta(true), 6000);
    return () => clearTimeout(t);
  }, [displayState, retryCount]);

  // ── Three-ring pulse animations (staggered) ───────────────────────────
  const ring1 = useSharedValue(0);
  const ring2 = useSharedValue(0);
  const ring3 = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      ring1.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
        -1,
        false
      );
      ring2.value = withDelay(
        400,
        withRepeat(
          withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
          -1,
          false
        )
      );
      ring3.value = withDelay(
        800,
        withRepeat(
          withTiming(1, { duration: 1800, easing: Easing.out(Easing.ease) }),
          -1,
          false
        )
      );
    } else {
      ring1.value = withTiming(0, { duration: 300 });
      ring2.value = withTiming(0, { duration: 300 });
      ring3.value = withTiming(0, { duration: 300 });
    }
  }, [isListening, ring1, ring2, ring3]);

  const ringStyle1 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring1.value, [0, 1], [1, 2.2]) }],
    opacity: interpolate(ring1.value, [0, 0.3, 1], [0.5, 0.3, 0]),
  }));
  const ringStyle2 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring2.value, [0, 1], [1, 2.2]) }],
    opacity: interpolate(ring2.value, [0, 0.3, 1], [0.5, 0.3, 0]),
  }));
  const ringStyle3 = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ring3.value, [0, 1], [1, 2.2]) }],
    opacity: interpolate(ring3.value, [0, 0.3, 1], [0.5, 0.3, 0]),
  }));

  // ── Sound-wave bar animations ─────────────────────────────────────────
  const waveBars = Array.from({ length: WAVE_BAR_COUNT }, (_, i) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useSharedValue(0.3)
  );

  useEffect(() => {
    waveBars.forEach((bar, i) => {
      if (isListening) {
        bar.value = withDelay(
          i * 80,
          withRepeat(
            withSequence(
              withTiming(1, {
                duration: WAVE_DURATIONS[i],
                easing: Easing.inOut(Easing.ease),
              }),
              withTiming(0.2, {
                duration: WAVE_DURATIONS[i],
                easing: Easing.inOut(Easing.ease),
              })
            ),
            -1,
            true
          )
        );
      } else {
        bar.value = withTiming(0.15, { duration: 400 });
      }
    });
  }, [isListening, waveBars]);

  // ── Mic button glow ───────────────────────────────────────────────────
  const micGlow = useSharedValue(0);
  useEffect(() => {
    if (isListening) {
      micGlow.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      micGlow.value = withTiming(0, { duration: 300 });
    }
  }, [isListening, micGlow]);

  const micGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: interpolate(micGlow.value, [0, 1], [0.3, 0.8]),
    shadowRadius: interpolate(micGlow.value, [0, 1], [8, 20]),
  }));

  // ── Dot blink ─────────────────────────────────────────────────────────
  const dotOpacity = useSharedValue(1);
  useEffect(() => {
    if (isListening) {
      dotOpacity.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        false
      );
    } else {
      dotOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [isListening, dotOpacity]);
  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  // ── Actions ───────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    setIsProcessing(false);
    setProcessingError(null);
    hasProcessed.current = false;
    setRetryCount((c) => c + 1);
    retry();
    setTimeout(() => startListening(), 250);
  }, [retry, startListening]);

  const handleStopEarly = useCallback(() => {
    stopListening();
  }, [stopListening]);

  return (
    <View style={styles.root}>
      {/* ── LISTENING ─────────────────────────────────────────────── */}
      {displayState === "listening" && (
        <Animated.View
          entering={FadeIn.duration(350)}
          exiting={FadeOut.duration(200)}
          style={styles.center}
        >
          {/* Mic orb with triple pulse rings */}
          <View style={styles.orbContainer}>
            {/* Rings */}
            <Animated.View
              style={[
                styles.ring,
                { borderColor: theme.colors.primary + "40" },
                ringStyle1,
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                { borderColor: theme.colors.primary + "30" },
                ringStyle2,
              ]}
            />
            <Animated.View
              style={[
                styles.ring,
                { borderColor: theme.colors.primary + "20" },
                ringStyle3,
              ]}
            />

            {/* Mic button */}
            <Animated.View
              style={[
                styles.micShadow,
                micGlowStyle,
                { shadowColor: theme.colors.primary },
              ]}
            >
              <Pressable onPress={handleStopEarly}>
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.micGradient}
                >
                  <Ionicons
                    name="mic"
                    size={30}
                    color={theme.colors.textInverse}
                  />
                </LinearGradient>
              </Pressable>
            </Animated.View>
          </View>

          <TSpacer size="md" />

          {/* Sound-wave visualiser */}
          <View style={styles.waveRow}>
            {waveBars.map((bar, i) => (
              <WaveBar key={i} sv={bar} color={theme.colors.primary} />
            ))}
          </View>

          <TSpacer size="md" />

          {/* Recording indicator */}
          <View style={styles.statusRow}>
            <Animated.View
              style={[
                styles.recordDot,
                { backgroundColor: theme.colors.error },
                dotStyle,
              ]}
            />
            <TText style={[styles.statusLabel, { color: theme.colors.error }]}>
              {t("voiceLog.listening")}
            </TText>
          </View>

          <TSpacer size="sm" />

          {/* Transcript glass card */}
          <GlassSurface
            intensity="medium"
            border
            style={[
              styles.transcriptGlass,
              { minHeight: transcript ? undefined : 44 },
            ]}
          >
            {transcript ? (
              <Animated.View entering={FadeInDown.duration(250).springify()}>
                <TText
                  style={[styles.transcriptText, { color: theme.colors.text }]}
                >
                  {transcript}
                </TText>
              </Animated.View>
            ) : (
              <TText
                style={[
                  styles.transcriptText,
                  { color: theme.colors.textMuted },
                ]}
              >
                {t("voiceLog.describeFood")}
              </TText>
            )}
          </GlassSurface>

          <TSpacer size="sm" />

          <TText style={[styles.hint, { color: theme.colors.textMuted }]}>
            {t("voiceLog.tapMicFinish")}
          </TText>

          {/* Retry CTA — appears after 6s */}
          {showRetryCta && (
            <Animated.View entering={FadeIn.duration(400)}>
              <TSpacer size="md" />
              <Pressable onPress={handleRetry}>
                {({ pressed }) => (
                  <GlassSurface
                    intensity="light"
                    border
                    style={[
                      styles.retryBtn,
                      {
                        opacity: pressed ? 0.8 : 1,
                        transform: [{ scale: pressed ? 0.97 : 1 }],
                      },
                    ]}
                  >
                    <Ionicons
                      name="refresh"
                      size={18}
                      color={theme.colors.primary}
                    />
                    <TText
                      style={[
                        styles.retryText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {t("voiceLog.tryAgain")}
                    </TText>
                  </GlassSurface>
                )}
              </Pressable>
            </Animated.View>
          )}
        </Animated.View>
      )}

      {/* ── PROCESSING ────────────────────────────────────────────── */}
      {displayState === "processing" && (
        <Animated.View
          entering={FadeIn.duration(350)}
          exiting={FadeOut.duration(200)}
          style={styles.center}
        >
          <GlassSurface intensity="medium" border style={styles.processingCard}>
            <TText
              style={[styles.transcriptText, { color: theme.colors.text }]}
            >
              {transcript}
            </TText>
          </GlassSurface>

          <TSpacer size="lg" />

          <View style={styles.spinnerRow}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <TText
              style={[
                styles.processingLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("voiceLog.lookingUpNutrition")}
            </TText>
          </View>
        </Animated.View>
      )}

      {/* ── ERROR / RETRY ─────────────────────────────────────────── */}
      {displayState === "error" && (
        <Animated.View
          entering={FadeIn.duration(350)}
          exiting={FadeOut.duration(200)}
          style={styles.center}
        >
          <GlassSurface intensity="medium" border style={styles.errorCard}>
            <View style={styles.errorIconRow}>
              <View
                style={[
                  styles.errorIconCircle,
                  { backgroundColor: theme.colors.error + "18" },
                ]}
              >
                <Ionicons
                  name="alert-circle"
                  size={28}
                  color={theme.colors.error}
                />
              </View>
            </View>

            <TSpacer size="sm" />

            <TText style={[styles.errorTitle, { color: theme.colors.text }]}>
              {error || processingError || t("common.error")}
            </TText>

            {retryCount > 0 && (
              <TText
                style={[styles.errorHint, { color: theme.colors.textMuted }]}
              >
                {t("voiceLog.errorHint")}
              </TText>
            )}

            <TSpacer size="md" />

            {/* Glass retry button */}
            <Pressable onPress={handleRetry}>
              {({ pressed }) => (
                <GlassSurface
                  intensity="light"
                  border
                  style={[
                    styles.retryBtn,
                    {
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <Ionicons
                    name="refresh"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <TText
                    style={[styles.retryText, { color: theme.colors.primary }]}
                  >
                    {t("voiceLog.tryAgain")}
                  </TText>
                </GlassSurface>
              )}
            </Pressable>
          </GlassSurface>
        </Animated.View>
      )}
    </View>
  );
}

// ── Animated Wave Bar ────────────────────────────────────────────────────
function WaveBar({ sv, color }: { sv: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({
    height: interpolate(sv.value, [0, 1], [6, 28]),
    opacity: interpolate(sv.value, [0, 1], [0.4, 1]),
  }));

  return (
    <Animated.View
      style={[styles.waveBar, { backgroundColor: color }, style]}
    />
  );
}

// ── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  center: {
    alignItems: "center",
    width: "100%",
  },

  // ── Mic orb ──
  orbContainer: {
    alignItems: "center",
    justifyContent: "center",
    width: 110,
    height: 110,
  },
  ring: {
    position: "absolute",
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
  },
  micShadow: {
    borderRadius: 34,
    shadowOffset: { width: 0, height: 0 },
  },
  micGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Sound-wave ──
  waveRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 32,
  },
  waveBar: {
    width: 4,
    borderRadius: 2,
  },

  // ── Status ──
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  recordDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // ── Transcript ──
  transcriptGlass: {
    width: "100%",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  transcriptText: {
    fontSize: 17,
    textAlign: "center",
    lineHeight: 26,
    fontWeight: "500",
  },
  hint: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: 0.2,
  },

  // ── Processing ──
  processingCard: {
    width: "100%",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
  },
  spinnerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  processingLabel: {
    fontSize: 15,
    fontWeight: "600",
  },

  // ── Error ──
  errorCard: {
    width: "100%",
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  errorIconRow: {
    alignItems: "center",
  },
  errorIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  errorTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 22,
  },
  errorHint: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 14,
  },
  retryText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
