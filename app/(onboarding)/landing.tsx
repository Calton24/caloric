/**
 * Landing Screen — App Entry for Unauthenticated Users
 *
 * Cal AI-inspired design: camera preview hero with
 * "Calorie tracking made easy" headline.
 *
 * Funnels:
 *   - "Get Started" → onboarding flow (new users)
 *   - "Sign In"     → auth sign-in screen (existing users)
 */

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import {
    Dimensions,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/useTheme";
import { TText } from "../../src/ui/primitives/TText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function LandingScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/(onboarding)/goal" as any);
  };

  const handleSignIn = () => {
    router.push("/auth/sign-in" as any);
  };

  return (
    <View style={styles.container}>
      {/* ── Background gradient to simulate camera-like hero ── */}
      <LinearGradient
        colors={[
          theme.colors.primary + "15",
          theme.colors.background,
          theme.colors.background,
        ]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Camera preview mockup area ── */}
      <Animated.View
        entering={FadeIn.duration(800)}
        style={styles.heroContainer}
      >
        <View
          style={[
            styles.cameraPreview,
            {
              backgroundColor: theme.mode === "dark" ? "#1a1a2e" : "#f0f0f5",
              borderColor: theme.colors.border + "40",
            },
          ]}
        >
          {/* Scanning frame corners */}
          <View style={styles.scanFrame}>
            <View
              style={[
                styles.cornerTL,
                { borderColor: theme.colors.primary + "90" },
              ]}
            />
            <View
              style={[
                styles.cornerTR,
                { borderColor: theme.colors.primary + "90" },
              ]}
            />
            <View
              style={[
                styles.cornerBL,
                { borderColor: theme.colors.primary + "90" },
              ]}
            />
            <View
              style={[
                styles.cornerBR,
                { borderColor: theme.colors.primary + "90" },
              ]}
            />
          </View>

          {/* Center icon */}
          <Animated.View entering={FadeInDown.duration(600).delay(300)}>
            <View
              style={[
                styles.cameraIconBubble,
                { backgroundColor: theme.colors.primary + "20" },
              ]}
            >
              <Ionicons
                name="camera-outline"
                size={48}
                color={theme.colors.primary}
              />
            </View>
          </Animated.View>

          {/* Bottom pill bar — like Cal AI's "Scan Food" bar */}
          <Animated.View
            entering={FadeInUp.duration(500).delay(500)}
            style={styles.pillBarContainer}
          >
            <BlurView
              intensity={Platform.OS === "ios" ? 40 : 0}
              tint={theme.mode === "dark" ? "dark" : "light"}
              style={[
                styles.pillBar,
                {
                  backgroundColor:
                    Platform.OS === "android"
                      ? theme.mode === "dark"
                        ? "rgba(30,30,40,0.85)"
                        : "rgba(255,255,255,0.85)"
                      : "transparent",
                },
              ]}
            >
              <Ionicons
                name="scan-outline"
                size={18}
                color={theme.colors.primary}
              />
              <TText style={[styles.pillLabel, { color: theme.colors.text }]}>
                Scan Food
              </TText>
            </BlurView>
          </Animated.View>
        </View>
      </Animated.View>

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
            Calorie tracking{"\n"}made easy
          </TText>
        </Animated.View>

        {/* CTAs */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(600)}
          style={styles.ctaArea}
        >
          {/* Get Started — primary CTA */}
          <Pressable
            testID="landing-get-started"
            onPress={handleGetStarted}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View
              style={[styles.ctaButton, { backgroundColor: theme.colors.text }]}
            >
              <TText
                style={[styles.ctaText, { color: theme.colors.background }]}
              >
                Get Started
              </TText>
            </View>
          </Pressable>

          {/* Sign In — secondary link */}
          <Pressable
            testID="landing-sign-in"
            onPress={handleSignIn}
            style={({ pressed }) => ({
              opacity: pressed ? 0.7 : 1,
            })}
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

const CORNER_SIZE = 28;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  cameraPreview: {
    width: SCREEN_WIDTH - 64,
    aspectRatio: 3 / 4,
    maxHeight: "65%",
    borderRadius: 24,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  scanFrame: {
    ...StyleSheet.absoluteFillObject,
    margin: 24,
  },
  cornerTL: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    position: "absolute",
    bottom: 0,
    left: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 8,
  },
  cameraIconBubble: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  pillBarContainer: {
    position: "absolute",
    bottom: 20,
    alignSelf: "center",
  },
  pillBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    overflow: "hidden",
  },
  pillLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  headlineArea: {
    alignItems: "center",
    marginBottom: 24,
  },
  headline: {
    fontSize: 32,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  ctaArea: {
    alignItems: "center",
    gap: 16,
    paddingBottom: 8,
  },
  ctaButton: {
    width: SCREEN_WIDTH - 48,
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "700",
  },
  signInRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  signInLabel: {
    fontSize: 15,
  },
  signInLink: {
    fontSize: 15,
    fontWeight: "700",
  },
});
