/**
 * Live Activity Intro Screen
 *
 * Shows a preview of the Live Activity widget and lets users
 * activate or skip. Shown after permissions screen.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React from "react";
import { Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { areLiveActivitiesAvailable } from "../../src/features/live-activity";
import { usePermissionsStore } from "../../src/features/permissions";
import { useTheme } from "../../src/theme/useTheme";
import { ScreenContainer } from "../../src/ui/components/ScreenContainer";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

export default function LiveActivityIntroScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const handleActivate = () => {
    // On iOS, Live Activities don't require a permission prompt — they're
    // enabled by default. We just need to verify the device supports them.
    if (Platform.OS !== "ios") {
      Alert.alert(
        "iOS Only",
        "Live Activities are only available on iOS devices.",
        [{ text: "OK" }]
      );
      router.replace("/(main)/home" as any);
      return;
    }

    const available = areLiveActivitiesAvailable();

    if (!available) {
      // The native module isn't loaded (Expo Go) or user disabled LA in iOS Settings
      Alert.alert(
        "Live Activities Unavailable",
        "Please enable Live Activities in iOS Settings > Caloric > Live Activities, " +
          "and make sure you're running iOS 16.2 or later.",
        [
          {
            text: "Continue Without",
            onPress: () => router.replace("/(main)/home" as any),
          },
        ]
      );
      return;
    }

    // Native module confirmed Live Activities are supported — enable the flag.
    // The useLiveActivitySync hook (mounted in main layout) will
    // automatically start the native Live Activity when it sees this flag.
    usePermissionsStore.getState().setLiveActivitiesEnabled(true);
    router.replace("/(main)/home" as any);
  };

  const handleSkip = () => {
    router.replace("/(main)/home" as any);
  };

  return (
    <ScreenContainer scrollable={false} edges={["top", "bottom"]}>
      <View style={styles.content}>
        {/* Title */}
        <Animated.View entering={FadeIn.duration(500).delay(100)}>
          <TText
            variant="heading"
            style={[styles.title, { color: theme.colors.text }]}
          >
            Live Activities
          </TText>
          <TSpacer size="sm" />
          <TText
            style={[styles.subtitle, { color: theme.colors.textSecondary }]}
          >
            Track your calories in real-time right from your Lock Screen and
            Dynamic Island.
          </TText>
        </Animated.View>

        <TSpacer size="xl" />

        {/* Phone mockup / widget preview */}
        <Animated.View
          entering={FadeInDown.duration(600).delay(250)}
          style={styles.previewArea}
        >
          <View
            style={[
              styles.widgetPreview,
              {
                backgroundColor: theme.colors.surfaceSecondary,
                borderColor: theme.colors.border,
              },
            ]}
          >
            {/* Widget header */}
            <View style={styles.widgetHeader}>
              <Ionicons name="flame" size={20} color={theme.colors.primary} />
              <TText style={[styles.widgetTitle, { color: theme.colors.text }]}>
                Caloric
              </TText>
            </View>

            {/* Widget content */}
            <View style={styles.widgetContent}>
              <View style={styles.widgetStat}>
                <TText
                  style={[styles.widgetValue, { color: theme.colors.text }]}
                >
                  1,230
                </TText>
                <TText
                  style={[
                    styles.widgetLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  remaining
                </TText>
              </View>

              <View style={styles.widgetDivider}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
              </View>

              <View style={styles.widgetMacros}>
                {[
                  { label: "Protein", val: "87g", color: "#60A5FA" },
                  { label: "Carbs", val: "128g", color: "#FBBF24" },
                  { label: "Fat", val: "24g", color: "#F87171" },
                ].map((m) => (
                  <View key={m.label} style={styles.macroItem}>
                    <View
                      style={[styles.macroDot, { backgroundColor: m.color }]}
                    />
                    <TText
                      style={[styles.macroVal, { color: theme.colors.text }]}
                    >
                      {m.val}
                    </TText>
                  </View>
                ))}
              </View>
            </View>

            {/* Progress bar */}
            <View
              style={[
                styles.progressTrack,
                { backgroundColor: theme.colors.surfaceElevated },
              ]}
            >
              <LinearGradient
                colors={[theme.colors.primary, theme.colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.progressFill, { width: "60%" }]}
              />
            </View>
          </View>

          {/* Dynamic Island preview label */}
          <View style={styles.islandContainer}>
            <View
              style={[
                styles.islandPill,
                { backgroundColor: theme.colors.surfaceElevated },
              ]}
            >
              <Ionicons name="flame" size={14} color={theme.colors.primary} />
              <TText
                style={[
                  styles.islandText,
                  { color: theme.colors.textSecondary },
                ]}
              >
                1,230 cal left
              </TText>
            </View>
            <TText
              style={[styles.islandLabel, { color: theme.colors.textMuted }]}
            >
              Dynamic Island
            </TText>
          </View>
        </Animated.View>
      </View>

      {/* Bottom CTAs */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(500)}
        style={styles.bottom}
      >
        <Pressable
          onPress={handleActivate}
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
            <Ionicons
              name="pulse"
              size={20}
              color={theme.colors.textInverse}
              style={{ marginRight: 8 }}
            />
            <TText
              style={[styles.ctaText, { color: theme.colors.textInverse }]}
            >
              Activate Live Activities
            </TText>
          </LinearGradient>
        </Pressable>

        <TSpacer size="sm" />

        <Pressable onPress={handleSkip} hitSlop={12}>
          <TText style={[styles.skipText, { color: theme.colors.textMuted }]}>
            Not now
          </TText>
        </Pressable>
      </Animated.View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingTop: 40,
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
  previewArea: {
    alignItems: "center",
    gap: 24,
  },
  widgetPreview: {
    width: "90%",
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    gap: 14,
  },
  widgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  widgetTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  widgetContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  widgetStat: {
    alignItems: "center",
  },
  widgetValue: {
    fontSize: 28,
    fontWeight: "700",
  },
  widgetLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  widgetDivider: {
    height: 40,
    justifyContent: "center",
  },
  dividerLine: {
    width: 1,
    height: 30,
  },
  widgetMacros: {
    flex: 1,
    gap: 6,
  },
  macroItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroVal: {
    fontSize: 13,
    fontWeight: "500",
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  islandContainer: {
    alignItems: "center",
    gap: 6,
  },
  islandPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  islandText: {
    fontSize: 13,
    fontWeight: "600",
  },
  islandLabel: {
    fontSize: 12,
    fontWeight: "400",
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
    flexDirection: "row",
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
