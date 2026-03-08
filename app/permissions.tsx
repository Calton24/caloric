/**
 * Permissions Required Screen
 *
 * Shown after onboarding completes.
 * Requests microphone and speech recognition permissions
 * needed for voice logging.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { useTheme } from "../src/theme/useTheme";
import type { PermissionStatus } from "../src/types/nutrition";
import { PermissionRow } from "../src/ui/components/PermissionRow";
import { ScreenContainer } from "../src/ui/components/ScreenContainer";
import { TSpacer } from "../src/ui/primitives/TSpacer";
import { TText } from "../src/ui/primitives/TText";

export default function PermissionsScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  // In production these would use expo-modules permission APIs
  const [mic, setMic] = useState<PermissionStatus>("unknown");
  const [speech, setSpeech] = useState<PermissionStatus>("unknown");

  const allGranted = mic === "granted" && speech === "granted";

  const handleMic = () => {
    // TODO: Replace with actual expo-av permission request
    setMic("granted");
  };

  const handleSpeech = () => {
    // TODO: Replace with actual speech recognition permission request
    setSpeech("granted");
  };

  const handleContinue = () => {
    router.replace("/live-activity-intro" as any);
  };

  const handleSkip = () => {
    router.replace("/live-activity-intro" as any);
  };

  return (
    <ScreenContainer scrollable={false} edges={["top", "bottom"]}>
      <View style={styles.content}>
        {/* Hand icon */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(100)}
          style={styles.iconSection}
        >
          <View
            style={[
              styles.iconBubble,
              { backgroundColor: theme.colors.primary + "1A" },
            ]}
          >
            <Ionicons name="hand-left" size={48} color={theme.colors.primary} />
          </View>
        </Animated.View>

        <TSpacer size="lg" />

        <Animated.View entering={FadeIn.duration(500).delay(200)}>
          <TText
            variant="heading"
            style={[styles.title, { color: theme.colors.text }]}
          >
            Permissions Required
          </TText>
          <TSpacer size="sm" />
          <TText
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            Caloric uses your microphone and speech recognition to log meals
            with your voice — fast and hands-free.
          </TText>
        </Animated.View>

        <TSpacer size="xl" />

        {/* Permission rows */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(350)}
          style={styles.rows}
        >
          <PermissionRow
            icon="mic"
            label="Microphone"
            description="Listen to your voice for meal logging"
            status={mic}
            onPress={handleMic}
          />
          <TSpacer size="sm" />
          <PermissionRow
            icon="chatbubble-ellipses"
            label="Speech Recognition"
            description="Convert your speech to food entries"
            status={speech}
            onPress={handleSpeech}
          />
        </Animated.View>
      </View>

      {/* Bottom CTA */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(500)}
        style={styles.bottom}
      >
        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [
            styles.ctaButton,
            { opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <LinearGradient
            colors={[theme.colors.primary, theme.colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <TText
              style={[styles.ctaText, { color: theme.colors.textInverse }]}
            >
              {allGranted ? "Continue" : "Grant Permissions"}
            </TText>
          </LinearGradient>
        </Pressable>

        <TSpacer size="sm" />

        {!allGranted && (
          <Pressable onPress={handleSkip} hitSlop={12}>
            <TText style={[styles.skipText, { color: theme.colors.textMuted }]}>
              Skip for now
            </TText>
          </Pressable>
        )}
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 40,
  },
  iconSection: {
    alignItems: "center",
  },
  iconBubble: {
    width: 100,
    height: 100,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  rows: {
    gap: 0,
  },
  bottom: {
    alignItems: "center",
    paddingBottom: 16,
  },
  ctaButton: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
  },
  ctaGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  ctaText: {
    fontSize: 17,
    fontWeight: "700",
  },
  skipText: {
    fontSize: 15,
    fontWeight: "500",
    paddingVertical: 8,
  },
});
