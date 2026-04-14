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
const CTA_LABEL = "Commit to 21 days";
const CTA_CHARS = CTA_LABEL.split("");
const CHAR_N = CTA_CHARS.length;
const SWEEP_W = 5;
const SWEEP_PAD = SWEEP_W / CHAR_N + 0.1;

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
// Shimmer Character
// ═══════════════════════════════════════════════════════════════

const ShimmerChar = React.memo(function ShimmerChar({
  char,
  index,
  shimmer,
}: {
  char: string;
  index: number;
  shimmer: SharedValue<number>;
}) {
  const center = (index + 0.5) / CHAR_N;

  const animStyle = useAnimatedStyle(() => {
    const pos = interpolate(shimmer.value, [0, 1], [-SWEEP_PAD, 1 + SWEEP_PAD]);
    const dist = Math.abs(pos - center);
    const half = SWEEP_W / CHAR_N / 2;
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
    setTimeout(() => onComplete(), 650);
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
            {CTA_CHARS.map((c, i) => (
              <ShimmerChar key={i} char={c} index={i} shimmer={shimmer} />
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
          <Text style={sliderStyles.confirmText}>Day 1 starts now</Text>
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

  useEffect(() => {
    startKB(l0Sc, l0Tx, l0Ty, 0);
    timer.current = setInterval(crossfade, KB_CYCLE);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [l0Sc, l0Tx, l0Ty, startKB, crossfade]);

  const layer0 = useAnimatedStyle(() => ({
    opacity: l0Op.value,
    transform: [
      { scale: l0Sc.value },
      { translateX: l0Tx.value },
      { translateY: l0Ty.value },
    ],
  }));
  const layer1 = useAnimatedStyle(() => ({
    opacity: l1Op.value,
    transform: [
      { scale: l1Sc.value },
      { translateX: l1Tx.value },
      { translateY: l1Ty.value },
    ],
  }));

  const handleStart = () => router.push("/(onboarding)/goal" as any);
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

      {/* ── Content ── */}
      <SafeAreaView style={s.content} edges={["top", "bottom"]}>
        {/* Brand pill — anchored near top */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(200)}
          style={s.brandArea}
        >
          <BrandPill />
        </Animated.View>

        {/* Spacer pushes copy to bottom */}
        <View style={s.flex} />

        {/* Copy block */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(400)}
          style={s.copyBlock}
        >
          <Text style={s.headline}>21 days to better{"\n"}eating habits</Text>
          <Text style={s.subline}>
            Snap a photo. AI does the rest.{"\n"}No counting. No guesswork.
          </Text>
        </Animated.View>

        {/* CTA area */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(600)}
          style={s.ctaArea}
        >
          <SlideToStart onComplete={handleStart} />

          <Pressable
            testID="landing-sign-in"
            onPress={handleSignIn}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View style={s.signInRow}>
              <Text style={s.signInLabel}>Already have an account? </Text>
              <Text style={s.signInLink}>Sign In</Text>
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

  // Brand
  brandArea: {
    alignItems: "center",
    marginTop: IS_SMALL ? 12 : 20,
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
