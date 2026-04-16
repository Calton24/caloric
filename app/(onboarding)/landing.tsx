/**
 * Landing Screen — CalCut App Entry
 *
 * Production-ready onboarding hero with:
 * - Ken Burns crossfade background carousel
 * - Frosted brand pill for stable readability
 * - Transformation-focused copy
 * - Slide-to-start CTA with shimmer
 *
 * Design decisions:
 * - Brand pill uses a frosted/translucent backing so "CalCut" stays
 *   crisp and stable while the Ken Burns background moves behind it.
 *   This is preferable to text shadows (cheap) or full overlays (heavy)
 *   because it creates a deliberate focal anchor without dimming the hero.
 * - Gradient is a 5-stop veil that darkens only the lower 40% of the screen,
 *   keeping the food imagery vibrant up top while guaranteeing text legibility.
 * - Copy is transformation-focused: "21 days to better habits" signals the
 *   challenge positioning without being cheesy or overpromising.
 * - All colors are hardcoded to white/dark because this screen always renders
 *   over a dark gradient regardless of system theme.
 */

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Dimensions,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    cancelAnimation,
    Easing,
    FadeIn,
    FadeInUp,
    interpolate,
    interpolateColor,
    runOnJS,
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    LANGUAGE_LABELS,
    SUPPORTED_LANGUAGES,
    type SupportedLanguage,
} from "../../src/infrastructure/i18n/init";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { CalCutLogo } from "../../src/ui/brand/CalCutLogo";
import { FilmGrain } from "../../src/ui/effects/FilmGrain";

// ── Dimensions ──
const { width: SW, height: SH } = Dimensions.get("window");
const IS_SMALL = SH < 700;

// ── Hero images ──
const HERO_IMAGES = [
  require("../../assets/images/landing-hero.jpg"),
  require("../../assets/images/paywall-hero.jpg"),
];

// ── Ken Burns timing ──
const KB_HOLD = 6000;
const KB_FADE = 1500;
const KB_CYCLE = KB_HOLD + KB_FADE;
const KB_SCALE_START = 1.0;
const KB_SCALE_END = 1.15;
const KB_PANS = [
  { x: -15, y: -8 },
  { x: 12, y: 8 },
];

// ── Slider geometry ──
const TRACK_W = SW - 48;
const TRACK_H = 60;
const THUMB = 48;
const PAD = 6;
const MAX_SLIDE = TRACK_W - THUMB - PAD * 2;
const COMPLETE_AT = 0.85;

// ── Shimmer text ──
const SWEEP_W = 5;

// ── Nudge animation ──
const NUDGE_DELAY = 900;
const NUDGE_DIST = 9;
const HAPTIC_STEP = MAX_SLIDE / 5.5;

// ═══════════════════════════════════════════════════════════════
// Brand Pill — frosted glass backing behind "CalCut"
// ═══════════════════════════════════════════════════════════════

function BrandPill() {
  const inner = (
    <View style={brandStyles.inner}>
      <View style={brandStyles.logoWrap}>
        <CalCutLogo size={23} color="#fff" />
      </View>
      <Text style={brandStyles.wordmark}>CalCut</Text>
    </View>
  );

  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={30} tint="dark" style={brandStyles.pill}>
        {inner}
      </BlurView>
    );
  }

  // Android fallback: translucent dark surface
  return (
    <View style={[brandStyles.pill, brandStyles.pillAndroid]}>{inner}</View>
  );
}

const brandStyles = StyleSheet.create({
  pill: {
    borderRadius: 16,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.08)",
  },
  pillAndroid: {
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  logoWrap: {
    transform: [{ translateY: 1.5 }],
  },
  wordmark: {
    fontSize: 16,
    fontFamily: "PlusJakartaSans_800ExtraBold",
    color: "#fff",
    letterSpacing: 0.15,
  },
});

// ═══════════════════════════════════════════════════════════════
// Language Flag Mapping
// ═══════════════════════════════════════════════════════════════

const LANG_FLAGS: Record<SupportedLanguage, string> = {
  "en-GB": "🇬🇧",
  "en-US": "🇺🇸",
  de: "🇩🇪",
  es: "🇪🇸",
  fr: "🇫🇷",
  nl: "🇳🇱",
  pl: "🇵🇱",
  pt: "🇵🇹",
  "pt-BR": "🇧🇷",
};

// ═══════════════════════════════════════════════════════════════
// Language Pill + Dropdown
// ═══════════════════════════════════════════════════════════════

function LanguagePill() {
  const { language, changeLanguage } = useAppTranslation();
  const [open, setOpen] = useState(false);

  const flag = LANG_FLAGS[language] ?? "🇬🇧";

  const code =
    language === "en-GB"
      ? "UK"
      : language === "en-US"
        ? "US"
        : language === "pt-BR"
          ? "PT"
          : language.toUpperCase();

  const pill = (
    <View style={langStyles.inner}>
      <Text style={langStyles.flag}>{flag}</Text>
      <Text style={langStyles.code}>{code}</Text>
      <Ionicons name="chevron-down" size={12} color="rgba(255,255,255,0.7)" />
    </View>
  );

  const pillView =
    Platform.OS === "ios" ? (
      <BlurView intensity={25} tint="dark" style={langStyles.pill}>
        {pill}
      </BlurView>
    ) : (
      <View style={[langStyles.pill, langStyles.pillAndroid]}>{pill}</View>
    );

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        {pillView}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={langStyles.backdrop} onPress={() => setOpen(false)}>
          <View style={langStyles.dropdown}>
            <Text style={langStyles.dropdownTitle}>Language</Text>
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isActive = lang === language;
              return (
                <Pressable
                  key={lang}
                  onPress={() => {
                    changeLanguage(lang);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setOpen(false);
                  }}
                  style={({ pressed }) => [
                    langStyles.option,
                    isActive && langStyles.optionActive,
                    pressed && { opacity: 0.7 },
                  ]}
                >
                  <Text style={langStyles.optionFlag}>{LANG_FLAGS[lang]}</Text>
                  <Text
                    style={[
                      langStyles.optionLabel,
                      isActive && langStyles.optionLabelActive,
                    ]}
                  >
                    {LANGUAGE_LABELS[lang]}
                  </Text>
                  {isActive && (
                    <Ionicons name="checkmark" size={18} color="#34D399" />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const langStyles = StyleSheet.create({
  pill: {
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.12)",
  },
  pillAndroid: {
    backgroundColor: "rgba(0,0,0,0.38)",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  flag: {
    fontSize: 15,
  },
  code: {
    fontSize: 13,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#fff",
    letterSpacing: 0.3,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  dropdown: {
    backgroundColor: "#1C1C1E",
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 6,
    width: "100%",
    maxWidth: 320,
  },
  dropdownTitle: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_700Bold",
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 12,
  },
  optionActive: {
    backgroundColor: "rgba(52,211,153,0.12)",
  },
  optionFlag: {
    fontSize: 20,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: "PlusJakartaSans_500Medium",
    color: "#fff",
  },
  optionLabelActive: {
    fontFamily: "PlusJakartaSans_700Bold",
    color: "#34D399",
  },
});

// ═══════════════════════════════════════════════════════════════
// Shimmer Character
// ═══════════════════════════════════════════════════════════════

const ShimmerChar = React.memo(function ShimmerChar({
  char,
  index,
  total,
  shimmer,
}: {
  char: string;
  index: number;
  total: number;
  shimmer: SharedValue<number>;
}) {
  const center = (index + 0.5) / total;
  const sweepPad = SWEEP_W / total + 0.1;

  const animStyle = useAnimatedStyle(() => {
    const pos = interpolate(shimmer.value, [0, 1], [-sweepPad, 1 + sweepPad]);
    const dist = Math.abs(pos - center);
    const half = SWEEP_W / total / 2;
    const opacity = interpolate(
      dist,
      [0, half, half * 2],
      [1, 0.5, 0.28],
      "clamp"
    );
    return { color: `rgba(255,255,255,${opacity})` };
  });

  return (
    <Animated.Text style={[shimmerStyles.char, animStyle]}>
      {char}
    </Animated.Text>
  );
});

const shimmerStyles = StyleSheet.create({
  char: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_500Medium",
    letterSpacing: 0.3,
  },
});

// ═══════════════════════════════════════════════════════════════
// Slide To Start
// ═══════════════════════════════════════════════════════════════

function SlideToStart({ onComplete }: { onComplete: () => void }) {
  const { t } = useAppTranslation();
  const ctaLabel = t("landing.cta");
  const ctaChars = ctaLabel.split("");
  const ctaConfirm = t("landing.ctaConfirm");

  const tx = useSharedValue(0);
  const done = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const thumbScale = useSharedValue(1);
  const glowAnim = useSharedValue(0);
  const nudge = useSharedValue(0);
  const hasInteracted = useSharedValue(0);
  const lastHapticTx = useSharedValue(-HAPTIC_STEP);

  const [showConfirm, setShowConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      tx.value = 0;
      done.value = 0;
      thumbScale.value = 1;
      glowAnim.value = 0;
      nudge.value = 0;
      hasInteracted.value = 0;
      lastHapticTx.value = -HAPTIC_STEP;
      setShowConfirm(false);
    }, [tx, done, thumbScale, glowAnim, nudge, hasInteracted, lastHapticTx])
  );

  // Shimmer sweep
  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2400, easing: Easing.linear }),
      -1,
      false
    );
  }, [shimmer]);

  // Pre-interaction nudge — draws attention to the thumb
  useEffect(() => {
    const id = setTimeout(() => {
      nudge.value = withRepeat(
        withSequence(
          withTiming(NUDGE_DIST, {
            duration: 320,
            easing: Easing.out(Easing.ease),
          }),
          withSpring(0, { damping: 10, stiffness: 160 }),
          withDelay(1100, withTiming(0, { duration: 0 }))
        ),
        3,
        false
      );
    }, NUDGE_DELAY);
    return () => clearTimeout(id);
  }, [nudge]);

  const lightHaptic = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const successHaptic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  const triggerComplete = useCallback(() => {
    setShowConfirm(true);
    setTimeout(() => onComplete(), 550);
  }, [onComplete]);

  const pan = Gesture.Pan()
    .onBegin(() => {
      // Cancel nudge the moment the user touches the thumb
      hasInteracted.value = 1;
      cancelAnimation(nudge);
      nudge.value = 0;
    })
    .onUpdate((e) => {
      if (done.value === 1) return;
      tx.value = Math.min(MAX_SLIDE, Math.max(0, e.translationX));

      // Periodic light haptic tick while dragging
      if (tx.value - lastHapticTx.value > HAPTIC_STEP && tx.value > 0) {
        lastHapticTx.value = tx.value;
        runOnJS(lightHaptic)();
      }
    })
    .onEnd(() => {
      if (done.value === 1) return;
      if (tx.value / MAX_SLIDE >= COMPLETE_AT) {
        done.value = 1;
        // Snap to end
        tx.value = withSpring(MAX_SLIDE, { damping: 18, stiffness: 220 });
        // Knob scale pulse: inflate then settle
        thumbScale.value = withSequence(
          withSpring(1.2, { damping: 10, stiffness: 320 }),
          withSpring(1.0, { damping: 14, stiffness: 260 })
        );
        // Track glow fill
        glowAnim.value = withTiming(1, { duration: 350 });
        runOnJS(successHaptic)();
        runOnJS(triggerComplete)();
      } else {
        tx.value = withSpring(0, {
          damping: 18,
          stiffness: 280,
          overshootClamping: false,
        });
      }
    });

  const thumbAnim = useAnimatedStyle(() => {
    const baseX = Math.min(MAX_SLIDE, Math.max(0, tx.value));
    const nudgeX = hasInteracted.value === 0 ? nudge.value : 0;
    return {
      transform: [{ translateX: baseX + nudgeX }, { scale: thumbScale.value }],
    };
  });

  const labelAnim = useAnimatedStyle(() => ({
    opacity: interpolate(tx.value / MAX_SLIDE, [0, 0.35, 1], [1, 0.15, 0]),
  }));

  const trackAnim = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      glowAnim.value,
      [0, 1],
      ["rgba(255,255,255,0.08)", "rgba(52,211,153,0.15)"]
    ),
    borderColor: interpolateColor(
      tx.value / MAX_SLIDE,
      [0, 0.6, 1],
      [
        "rgba(255,255,255,0.18)",
        "rgba(52,211,153,0.35)",
        "rgba(52,211,153,0.55)",
      ]
    ),
  }));

  const fillAnim = useAnimatedStyle(() => ({
    width: Math.max(0, tx.value + THUMB / 2 + PAD),
    opacity: interpolate(tx.value / MAX_SLIDE, [0, 0.06, 1], [0, 0.3, 0.5]),
  }));

  return (
    <Animated.View
      testID="landing-get-started"
      style={[sliderStyles.track, trackAnim]}
    >
      {/* Progress fill */}
      <Animated.View style={[sliderStyles.fill, fillAnim]} />

      {/* CTA label — fades out as thumb moves */}
      {!showConfirm && (
        <Animated.View style={[sliderStyles.labelWrap, labelAnim]}>
          <View style={sliderStyles.labelRow}>
            {ctaChars.map((c, i) => (
              <ShimmerChar
                key={`${i}-${c}`}
                char={c}
                index={i}
                total={ctaChars.length}
                shimmer={shimmer}
              />
            ))}
          </View>
        </Animated.View>
      )}

      {/* Micro-confirmation flash */}
      {showConfirm && (
        <Animated.View
          entering={FadeIn.duration(220)}
          style={sliderStyles.labelWrap}
        >
          <Text style={sliderStyles.confirmText}>{ctaConfirm}</Text>
        </Animated.View>
      )}

      <GestureDetector gesture={pan}>
        <Animated.View style={[sliderStyles.thumb, thumbAnim]}>
          <Ionicons name="chevron-forward" size={20} color="#000" />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const sliderStyles = StyleSheet.create({
  track: {
    width: TRACK_W,
    height: TRACK_H,
    borderRadius: TRACK_H / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: PAD,
    overflow: "hidden",
  },
  // Animated progress fill behind the label
  fill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    borderRadius: TRACK_H / 2,
    backgroundColor: "rgba(52,211,153,0.28)",
  },
  labelWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  labelRow: { flexDirection: "row" },
  confirmText: {
    fontSize: 15,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#fff",
    letterSpacing: 0.25,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 6,
  },
});

// ═══════════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════════

export default function LandingScreen() {
  const router = useRouter();
  const { t } = useAppTranslation();

  // ── Ken Burns state ──
  const l0Op = useSharedValue(1);
  const l0Sc = useSharedValue(KB_SCALE_START);
  const l0Tx = useSharedValue(0);
  const l0Ty = useSharedValue(0);
  const l1Op = useSharedValue(0);
  const l1Sc = useSharedValue(KB_SCALE_START);
  const l1Tx = useSharedValue(0);
  const l1Ty = useSharedValue(0);

  const active = useRef(0);
  const imgs = useRef([0, 1]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const startKB = useCallback(
    (
      sc: SharedValue<number>,
      txV: SharedValue<number>,
      tyV: SharedValue<number>,
      idx: number
    ) => {
      const p = KB_PANS[idx % KB_PANS.length];
      sc.value = KB_SCALE_START;
      txV.value = 0;
      tyV.value = 0;
      const dur = KB_HOLD + KB_FADE;
      const ease = Easing.inOut(Easing.ease);
      sc.value = withTiming(KB_SCALE_END, { duration: dur, easing: ease });
      txV.value = withTiming(p.x, { duration: dur, easing: ease });
      tyV.value = withTiming(p.y, { duration: dur, easing: ease });
    },
    []
  );

  const crossfade = useCallback(() => {
    const from = active.current;
    const to = from === 0 ? 1 : 0;
    const next = (imgs.current[from] + 1) % HERO_IMAGES.length;
    imgs.current[to] = next;

    const toOp = to === 0 ? l0Op : l1Op;
    const fromOp = from === 0 ? l0Op : l1Op;
    const toSc = to === 0 ? l0Sc : l1Sc;
    const toTx = to === 0 ? l0Tx : l1Tx;
    const toTy = to === 0 ? l0Ty : l1Ty;

    startKB(toSc, toTx, toTy, next);
    const fade = { duration: KB_FADE, easing: Easing.inOut(Easing.ease) };
    toOp.value = withTiming(1, fade);
    fromOp.value = withTiming(0, fade);
    active.current = to;
  }, [l0Op, l0Sc, l0Tx, l0Ty, l1Op, l1Sc, l1Tx, l1Ty, startKB]);

  // Ken Burns is started + cleaned up via useFocusEffect below

  // ── Exit animation shared values ──
  const exitProgress = useSharedValue(0);
  const heroZoom = useSharedValue(1);
  const whiteFlash = useSharedValue(0);
  const brandExitY = useSharedValue(0);
  const brandExitOp = useSharedValue(1);
  const copyExitY = useSharedValue(0);
  const copyExitOp = useSharedValue(1);
  const ctaExitY = useSharedValue(0);
  const ctaExitOp = useSharedValue(1);

  // ── Reset all exit state when screen regains focus (back navigation) ──
  useFocusEffect(
    useCallback(() => {
      const ease = Easing.out(Easing.ease);
      const dur = 300;

      // Smoothly reverse the white overlay + hero zoom
      whiteFlash.value = withTiming(0, { duration: dur, easing: ease });
      heroZoom.value = withTiming(1, { duration: dur, easing: ease });
      exitProgress.value = 0;

      // Content fades back in with a quick spring
      brandExitY.value = withTiming(0, { duration: dur, easing: ease });
      brandExitOp.value = withTiming(1, { duration: dur, easing: ease });
      copyExitY.value = withTiming(0, { duration: dur, easing: ease });
      copyExitOp.value = withTiming(1, { duration: dur, easing: ease });
      ctaExitY.value = withTiming(0, { duration: dur, easing: ease });
      ctaExitOp.value = withTiming(1, { duration: dur, easing: ease });

      // Restart Ken Burns
      active.current = 0;
      imgs.current = [0, 1];
      l0Op.value = 1;
      l1Op.value = 0;
      startKB(l0Sc, l0Tx, l0Ty, 0);
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(crossfade, KB_CYCLE);

      return () => {
        if (timer.current) clearInterval(timer.current);
      };
    }, [
      exitProgress,
      heroZoom,
      whiteFlash,
      brandExitY,
      brandExitOp,
      copyExitY,
      copyExitOp,
      ctaExitY,
      ctaExitOp,
      l0Op,
      l1Op,
      l0Sc,
      l0Tx,
      l0Ty,
      startKB,
      crossfade,
    ])
  );

  const layer0 = useAnimatedStyle(() => ({
    opacity: l0Op.value,
    transform: [
      { scale: l0Sc.value * heroZoom.value },
      { translateX: l0Tx.value },
      { translateY: l0Ty.value },
    ],
  }));
  const layer1 = useAnimatedStyle(() => ({
    opacity: l1Op.value,
    transform: [
      { scale: l1Sc.value * heroZoom.value },
      { translateX: l1Tx.value },
      { translateY: l1Ty.value },
    ],
  }));

  const brandExitStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: brandExitY.value }],
    opacity: brandExitOp.value,
  }));
  const copyExitStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: copyExitY.value }],
    opacity: copyExitOp.value,
  }));
  const ctaExitStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: ctaExitY.value }],
    opacity: ctaExitOp.value,
  }));
  const whiteOverlayStyle = useAnimatedStyle(() => ({
    opacity: whiteFlash.value,
  }));

  const navigateAway = useCallback(() => {
    router.push("/(onboarding)/goal" as any);
  }, [router]);

  const handleStart = useCallback(() => {
    // Stop Ken Burns cycling
    if (timer.current) clearInterval(timer.current);

    const ease = Easing.bezier(0.4, 0, 0.2, 1);

    // Stage 1: CTA area slides down + fades (0-250ms)
    ctaExitY.value = withTiming(40, { duration: 250, easing: ease });
    ctaExitOp.value = withTiming(0, { duration: 200, easing: ease });

    // Stage 2: Copy slides down + fades (80-350ms)
    copyExitY.value = withDelay(
      80,
      withTiming(50, { duration: 280, easing: ease })
    );
    copyExitOp.value = withDelay(
      80,
      withTiming(0, { duration: 220, easing: ease })
    );

    // Stage 3: Brand pill floats up + fades (140-400ms)
    brandExitY.value = withDelay(
      140,
      withTiming(-30, { duration: 260, easing: ease })
    );
    brandExitOp.value = withDelay(
      140,
      withTiming(0, { duration: 220, easing: ease })
    );

    // Stage 4: Hero zooms in cinematically (100-650ms)
    heroZoom.value = withDelay(
      100,
      withTiming(1.35, {
        duration: 550,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      })
    );

    // Stage 5: White wash fades in (250-650ms)
    whiteFlash.value = withDelay(
      250,
      withTiming(1, { duration: 400, easing: Easing.bezier(0.4, 0, 1, 1) })
    );

    // Stage 6: Navigate after the exit completes
    exitProgress.value = withDelay(
      620,
      withTiming(1, { duration: 10 }, () => {
        runOnJS(navigateAway)();
      })
    );
  }, [
    exitProgress,
    heroZoom,
    whiteFlash,
    brandExitY,
    brandExitOp,
    copyExitY,
    copyExitOp,
    ctaExitY,
    ctaExitOp,
    navigateAway,
  ]);

  const handleSignIn = () => router.push("/auth/sign-in" as any);

  return (
    <View style={s.root}>
      {/* ── Ken Burns hero ── */}
      <View style={s.heroWrap}>
        <Animated.Image
          source={HERO_IMAGES[0]}
          style={[s.heroImg, layer0]}
          resizeMode="cover"
        />
        <Animated.Image
          source={HERO_IMAGES[1]}
          style={[s.heroImg, layer1]}
          resizeMode="cover"
        />
      </View>

      {/* ── Film grain overlay ── */}
      <FilmGrain opacity={0.07} />

      {/* ── Gradient veil ── */}
      <LinearGradient
        colors={[
          "transparent",
          "rgba(0,0,0,0.03)",
          "rgba(0,0,0,0.35)",
          "rgba(0,0,0,0.88)",
          "#000",
        ]}
        locations={[0, 0.38, 0.56, 0.78, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── White wash overlay for exit ── */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#fff" },
          whiteOverlayStyle,
        ]}
        pointerEvents="none"
      />

      {/* ── Content ── */}
      <SafeAreaView style={s.content} edges={["top", "bottom"]}>
        {/* Top bar — brand pill centered, language pill right */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(200)}
          style={[s.topBar, brandExitStyle]}
        >
          <View style={s.topBarSpacer} />
          <BrandPill />
          <View style={s.topBarSpacer}>
            <LanguagePill />
          </View>
        </Animated.View>

        {/* Spacer pushes copy to bottom */}
        <View style={s.flex} />

        {/* Copy block */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(400)}
          style={[s.copyBlock, copyExitStyle]}
        >
          <Text style={s.headline}>{t("landing.headline")}</Text>
          <Text style={s.subline}>{t("landing.subline")}</Text>
        </Animated.View>

        {/* CTA area */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(600)}
          style={[s.ctaArea, ctaExitStyle]}
        >
          <SlideToStart onComplete={handleStart} />

          <Pressable
            testID="landing-sign-in"
            onPress={handleSignIn}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View style={s.signInRow}>
              <Text style={s.signInLabel}>{t("landing.signInPrompt")}</Text>
              <Text style={s.signInLink}>{t("landing.signIn")}</Text>
            </View>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },

  // Hero
  heroWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SH,
    overflow: "hidden",
  },
  heroImg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SH,
    width: "100%",
  },

  // Layout
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  flex: { flex: 1 },

  // Brand + Language bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: IS_SMALL ? 12 : 20,
  },
  topBarSpacer: {
    flex: 1,
    alignItems: "flex-end",
  },

  // Copy
  copyBlock: {
    alignItems: "center",
    marginBottom: IS_SMALL ? 20 : 28,
  },
  headline: {
    fontSize: IS_SMALL ? 28 : 32,
    fontFamily: "PlusJakartaSans_800ExtraBold_Italic",
    color: "#fff",
    textAlign: "center",
    lineHeight: IS_SMALL ? 36 : 40,
    letterSpacing: -0.3,
  },
  subline: {
    fontSize: IS_SMALL ? 15 : 16,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "rgba(255,255,255,0.55)",
    textAlign: "center",
    marginTop: 14,
    lineHeight: 23,
    letterSpacing: 0.1,
  },

  // CTA
  ctaArea: {
    alignItems: "center",
    gap: 16,
    paddingBottom: IS_SMALL ? 4 : 12,
  },
  signInRow: { flexDirection: "row", alignItems: "center" },
  signInLabel: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_400Regular",
    color: "rgba(255,255,255,0.45)",
  },
  signInLink: {
    fontSize: 14,
    fontFamily: "PlusJakartaSans_600SemiBold",
    color: "#fff",
  },
});
