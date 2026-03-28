/**
 * Landing Screen — App Entry for Unauthenticated Users
 *
 * Ken Burns crossfade hero carousel with gradient overlay,
 * headline + dual CTAs at the bottom.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    Easing,
    FadeInDown,
    FadeInUp,
    interpolate,
    interpolateColor,
    runOnJS,
    type SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TText } from "../../src/ui/primitives/TText";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ── Hero images for Ken Burns carousel ──
const HERO_IMAGES = [
  require("../../assets/images/landing-hero.jpg"),
  require("../../assets/images/paywall-hero.jpg"),
];

// ── Ken Burns config ──
const IMAGE_HOLD = 6000; // ms each image is visible
const FADE_DURATION = 1500; // ms crossfade
const CYCLE = IMAGE_HOLD + FADE_DURATION;
const KB_SCALE_FROM = 1.0;
const KB_SCALE_TO = 1.18;
const KB_DURATION = IMAGE_HOLD + FADE_DURATION; // full zoom span

// Alternating pan directions for visual variety
const PAN_CONFIGS = [
  { tx: -20, ty: -10 }, // pan left + up
  { tx: 15, ty: 10 }, // pan right + down
];

// ── Slide to Unlock ──────────────────────────────────────────

const TRACK_WIDTH = SCREEN_WIDTH - 48;
const TRACK_HEIGHT = 64;
const THUMB_SIZE = 52;
const TRACK_PAD = 6;
const MAX_SLIDE = TRACK_WIDTH - THUMB_SIZE - TRACK_PAD * 2;
const COMPLETION_THRESHOLD = 0.85;

function SlideToUnlock({ onComplete }: { onComplete: () => void }) {
  const translateX = useSharedValue(0);
  const completed = useRef(false);

  // Shimmer — a value that cycles 0→1 continuously for the text highlight
  const shimmer = useSharedValue(0);
  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
      -1,
      false
    );
  }, [shimmer]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (completed.current) return;
      translateX.value = Math.min(MAX_SLIDE, Math.max(0, e.translationX));
    })
    .onEnd(() => {
      if (completed.current) return;
      const progress = translateX.value / MAX_SLIDE;
      if (progress >= COMPLETION_THRESHOLD) {
        // Snap to end
        completed.current = true;
        translateX.value = withSpring(MAX_SLIDE, {
          damping: 15,
          stiffness: 200,
        });
        runOnJS(onComplete)();
      } else {
        // Spring back
        translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
      }
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  // Text fades out as thumb slides over it
  const textStyle = useAnimatedStyle(() => {
    const progress = translateX.value / MAX_SLIDE;
    return {
      opacity: interpolate(progress, [0, 0.5, 1], [1, 0.3, 0]),
    };
  });

  // Shimmer mask — animates a bright spot across the text
  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      shimmer.value,
      [0, 0.4, 0.5, 0.6, 1],
      [0.45, 0.45, 1, 0.45, 0.45]
    ),
  }));

  // Track glow when near completion
  const trackStyle = useAnimatedStyle(() => {
    const progress = translateX.value / MAX_SLIDE;
    return {
      borderColor: interpolateColor(
        progress,
        [0, 0.7, 1],
        ["rgba(255,255,255,0.08)", "rgba(34,197,94,0.3)", "rgba(34,197,94,0.5)"]
      ),
    };
  });

  return (
    <Animated.View
      testID="landing-get-started"
      style={[sliderStyles.track, trackStyle]}
    >
      {/* Label */}
      <Animated.View style={[sliderStyles.labelContainer, textStyle]}>
        <Animated.Text style={[sliderStyles.labelText, shimmerStyle]}>
          slide to get started
        </Animated.Text>
      </Animated.View>

      {/* Draggable thumb */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[sliderStyles.thumb, thumbStyle]}>
          <Ionicons name="chevron-forward" size={22} color="#000" />
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const sliderStyles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: TRACK_PAD,
  },
  labelContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  labelText: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 17,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default function LandingScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  // ── Ken Burns crossfade state ──
  const layer0Opacity = useSharedValue(1);
  const layer0Scale = useSharedValue(KB_SCALE_FROM);
  const layer0Tx = useSharedValue(0);
  const layer0Ty = useSharedValue(0);

  const layer1Opacity = useSharedValue(0);
  const layer1Scale = useSharedValue(KB_SCALE_FROM);
  const layer1Tx = useSharedValue(0);
  const layer1Ty = useSharedValue(0);

  const activeLayer = useRef(0); // which layer is currently showing
  const imageIndices = useRef([0, 1]); // [layer0 image, layer1 image]
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startKenBurns = useCallback(
    (
      scaleVal: SharedValue<number>,
      txVal: SharedValue<number>,
      tyVal: SharedValue<number>,
      panIndex: number
    ) => {
      const pan = PAN_CONFIGS[panIndex % PAN_CONFIGS.length];
      scaleVal.value = KB_SCALE_FROM;
      txVal.value = 0;
      tyVal.value = 0;
      scaleVal.value = withTiming(KB_SCALE_TO, {
        duration: KB_DURATION,
        easing: Easing.inOut(Easing.ease),
      });
      txVal.value = withTiming(pan.tx, {
        duration: KB_DURATION,
        easing: Easing.inOut(Easing.ease),
      });
      tyVal.value = withTiming(pan.ty, {
        duration: KB_DURATION,
        easing: Easing.inOut(Easing.ease),
      });
    },
    []
  );

  const transition = useCallback(() => {
    const from = activeLayer.current;
    const to = from === 0 ? 1 : 0;

    // Next image index for the "to" layer
    const nextImage = (imageIndices.current[from] + 1) % HERO_IMAGES.length;
    imageIndices.current[to] = nextImage;

    // Crossfade: current layer fades out, next fades in
    const fromOpacity = from === 0 ? layer0Opacity : layer1Opacity;
    const toOpacity = to === 0 ? layer0Opacity : layer1Opacity;
    const toScale = to === 0 ? layer0Scale : layer1Scale;
    const toTx = to === 0 ? layer0Tx : layer1Tx;
    const toTy = to === 0 ? layer0Ty : layer1Ty;

    // Start Ken Burns on incoming layer
    startKenBurns(toScale, toTx, toTy, nextImage);

    // Crossfade
    toOpacity.value = withTiming(1, {
      duration: FADE_DURATION,
      easing: Easing.inOut(Easing.ease),
    });
    fromOpacity.value = withTiming(0, {
      duration: FADE_DURATION,
      easing: Easing.inOut(Easing.ease),
    });

    activeLayer.current = to;
  }, [
    layer0Opacity,
    layer0Scale,
    layer0Tx,
    layer0Ty,
    layer1Opacity,
    layer1Scale,
    layer1Tx,
    layer1Ty,
    startKenBurns,
  ]);

  // Boot: start first Ken Burns + cycle timer
  useEffect(() => {
    startKenBurns(layer0Scale, layer0Tx, layer0Ty, 0);

    timerRef.current = setInterval(transition, CYCLE);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [layer0Scale, layer0Tx, layer0Ty, startKenBurns, transition]);

  // Animated styles for each layer
  const layer0Style = useAnimatedStyle(() => ({
    opacity: layer0Opacity.value,
    transform: [
      { scale: layer0Scale.value },
      { translateX: layer0Tx.value },
      { translateY: layer0Ty.value },
    ],
  }));

  const layer1Style = useAnimatedStyle(() => ({
    opacity: layer1Opacity.value,
    transform: [
      { scale: layer1Scale.value },
      { translateX: layer1Tx.value },
      { translateY: layer1Ty.value },
    ],
  }));

  // ── Badge float animation ──
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(6, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [floatY]);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  const handleGetStarted = () => {
    router.push("/(onboarding)/goal" as any);
  };

  const handleSignIn = () => {
    router.push("/auth/sign-in" as any);
  };

  return (
    <View style={styles.container}>
      {/* ── Ken Burns hero layers ── */}
      <View style={styles.heroContainer}>
        <Animated.Image
          source={HERO_IMAGES[0]}
          style={[styles.heroImage, layer0Style]}
          resizeMode="cover"
        />
        <Animated.Image
          source={HERO_IMAGES[1]}
          style={[styles.heroImage, layer1Style]}
          resizeMode="cover"
        />
      </View>

      {/* ── Gradient overlay — fades image into background ── */}
      <LinearGradient
        colors={[
          "transparent",
          "transparent",
          "rgba(0,0,0,0.25)",
          theme.colors.background,
          theme.colors.background,
        ]}
        locations={[0, 0.35, 0.58, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Floating AI badge ── */}
      <SafeAreaView style={styles.topBadgeArea} edges={["top"]}>
        <Animated.View
          entering={FadeInDown.duration(600).delay(300)}
          style={floatStyle}
        >
          <GlassSurface
            variant="pill"
            intensity="medium"
            style={styles.aiBadge}
          >
            <Ionicons name="sparkles" size={16} color={theme.colors.primary} />
            <TText style={[styles.aiBadgeText, { color: theme.colors.text }]}>
              AI-Powered
            </TText>
          </GlassSurface>
        </Animated.View>
      </SafeAreaView>

      {/* ── Bottom content area ── */}
      <SafeAreaView style={styles.bottomArea} edges={["bottom"]}>
        {/* Headline */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(400)}
          style={styles.headlineArea}
        >
          <TText style={[styles.brandName, { color: theme.colors.primary }]}>
            Caloric
          </TText>
          <TText
            variant="heading"
            style={[styles.headline, { color: theme.colors.text }]}
          >
            Calorie tracking{"\n"}made effortless
          </TText>
          <TText
            style={[styles.subline, { color: theme.colors.textSecondary }]}
          >
            Just snap a photo. Our AI does the rest.
          </TText>
        </Animated.View>

        {/* CTAs */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(600)}
          style={styles.ctaArea}
        >
          <SlideToUnlock onComplete={handleGetStarted} />

          <Pressable
            testID="landing-sign-in"
            onPress={handleSignIn}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
          >
            <View style={styles.signInRow}>
              <TText
                style={[
                  styles.signInLabel,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Already have an account?{" "}
              </TText>
              <TText style={[styles.signInLink, { color: theme.colors.text }]}>
                Sign In
              </TText>
            </View>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  heroContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    overflow: "hidden", // clips Ken Burns zoom/pan
  },
  heroImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT,
    width: "100%",
  },
  topBadgeArea: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingTop: 8,
  },
  aiBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  aiBadgeText: { fontSize: 13, fontWeight: "600" },
  bottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headlineArea: { alignItems: "center", marginBottom: 24 },
  brandName: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  subline: {
    fontSize: 16,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
  },
  ctaArea: { alignItems: "center", gap: 16, paddingBottom: 8 },
  signInRow: { flexDirection: "row", alignItems: "center" },
  signInLabel: { fontSize: 15 },
  signInLink: { fontSize: 15, fontWeight: "700" },
});
