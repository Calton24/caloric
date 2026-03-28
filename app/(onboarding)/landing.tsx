/**
 * Landing Screen — App Entry for Unauthenticated Users
 *
 * Full-bleed hero image with gradient overlay,
 * headline + dual CTAs at the bottom.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { Dimensions, Image, Pressable, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TText } from "../../src/ui/primitives/TText";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function LandingScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  // Subtle floating animation for the badge
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
      {/* ── Full-bleed hero image ── */}
      <Image
        source={require("../../assets/images/landing-hero.jpg")}
        style={styles.heroImage}
        resizeMode="cover"
      />

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
          <Pressable
            testID="landing-get-started"
            onPress={handleGetStarted}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <LinearGradient
              colors={[
                theme.colors.primary,
                theme.colors.accent || theme.colors.primary,
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.ctaButton}
            >
              <TText style={styles.ctaText}>Get Started</TText>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </LinearGradient>
          </Pressable>

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
  ctaButton: {
    width: SCREEN_WIDTH - 48,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  ctaText: { color: "#fff", fontSize: 18, fontWeight: "700" },
  signInRow: { flexDirection: "row", alignItems: "center" },
  signInLabel: { fontSize: 15 },
  signInLink: { fontSize: 15, fontWeight: "700" },
});
