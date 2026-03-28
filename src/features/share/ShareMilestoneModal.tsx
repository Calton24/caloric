/**
 * ShareMilestoneModal
 *
 * Celebration modal shown at emotional milestone moments.
 * Two CTAs: "Share your progress" (captures card → native share) and "Keep going".
 * Non-intrusive — easy to dismiss, never forced.
 */

import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useRef } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSequence,
    withSpring,
    withTiming,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../../ui/primitives/TText";
import { ShareCard } from "./ShareCard";
import type { MilestoneConfig } from "./share.types";

interface ShareMilestoneModalProps {
  visible: boolean;
  onClose: () => void;
  milestone: MilestoneConfig;
  day: number;
  streak: number;
  mealsLogged: number;
  challengeDays: number;
}

export function ShareMilestoneModal({
  visible,
  onClose,
  milestone,
  day,
  streak,
  mealsLogged,
  challengeDays,
}: ShareMilestoneModalProps) {
  const { theme } = useTheme();
  const isDark = theme.mode === "dark";
  const cardRef = useRef<View>(null);

  // ── Animations ──
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const emojiScale = useSharedValue(0.3);
  const emojiRotate = useSharedValue(-0.15);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      scale.value = withSpring(1, { damping: 16, stiffness: 200 });
      emojiScale.value = withDelay(
        150,
        withSequence(
          withSpring(1.3, { damping: 5, stiffness: 300 }),
          withSpring(1, { damping: 10, stiffness: 200 })
        )
      );
      emojiRotate.value = withDelay(
        150,
        withSequence(
          withTiming(0.1, { duration: 150, easing: Easing.out(Easing.ease) }),
          withTiming(-0.05, { duration: 120 }),
          withTiming(0, { duration: 100 })
        )
      );
    } else {
      scale.value = withTiming(0.85, { duration: 180 });
      opacity.value = withTiming(0, { duration: 180 });
      emojiScale.value = 0.3;
      emojiRotate.value = -0.15;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: emojiScale.value },
      { rotate: `${emojiRotate.value}rad` },
    ],
  }));

  // ── Share handler (dynamically loads captureRef to avoid native crash) ──
  const handleShare = useCallback(async () => {
    try {
      if (!cardRef.current) return;
      // Dynamic require — only loads the native module when user taps Share.
      // If the native binary doesn't include RNViewShot yet, this fails
      // gracefully and the modal just closes.
      const { captureRef } = require("react-native-view-shot");
      const uri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        width: 360,
      });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          UTI: "public.png",
        });
      }
    } catch {
      // Native module not yet in binary, or capture failed — silently close
    }
    onClose();
  }, [onClose]);

  const BG = isDark ? "#1C1C1E" : "#FFFFFF";
  const BACKDROP = isDark ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.6)";

  if (!visible) return null;

  return (
    <>
      {/* Off-screen share card for capture */}
      <ShareCard
        ref={cardRef}
        day={day}
        streak={streak}
        mealsLogged={mealsLogged}
        challengeDays={challengeDays}
        emoji={milestone.emoji}
        quote={milestone.quote}
      />

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <Pressable
          style={[styles.backdrop, { backgroundColor: BACKDROP }]}
          onPress={onClose}
        >
          <Animated.View
            style={[styles.card, { backgroundColor: BG }, containerStyle]}
          >
            <Pressable onPress={() => {}}>
              {/* Emoji */}
              <View style={styles.emojiContainer}>
                <Animated.View style={emojiStyle}>
                  <TText style={styles.emoji}>{milestone.emoji}</TText>
                </Animated.View>
              </View>

              {/* Title */}
              <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                <TText style={[styles.title, { color: theme.colors.primary }]}>
                  {milestone.title}
                </TText>
              </Animated.View>

              {/* Subtitle */}
              <Animated.View entering={FadeInDown.duration(400).delay(350)}>
                <TText
                  style={[
                    styles.subtitle,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {milestone.subtitle}
                </TText>
              </Animated.View>

              {/* Stats pills */}
              <Animated.View
                entering={FadeInDown.duration(400).delay(450)}
                style={styles.statsRow}
              >
                <View
                  style={[
                    styles.statPill,
                    { backgroundColor: theme.colors.surfaceElevated },
                  ]}
                >
                  <TText style={styles.statEmoji}>🔥</TText>
                  <TText
                    style={[styles.statText, { color: theme.colors.text }]}
                  >
                    {streak} day streak
                  </TText>
                </View>
                <View
                  style={[
                    styles.statPill,
                    { backgroundColor: theme.colors.surfaceElevated },
                  ]}
                >
                  <TText style={styles.statEmoji}>🍽️</TText>
                  <TText
                    style={[styles.statText, { color: theme.colors.text }]}
                  >
                    {mealsLogged} meals
                  </TText>
                </View>
              </Animated.View>

              {/* Share CTA */}
              <Animated.View entering={FadeInDown.duration(400).delay(550)}>
                <Pressable
                  onPress={handleShare}
                  style={({ pressed }) => [
                    styles.shareButton,
                    { backgroundColor: theme.colors.primary },
                    pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                  ]}
                >
                  <TText style={styles.shareButtonText}>
                    Share Progress 🔥
                  </TText>
                </Pressable>
              </Animated.View>

              {/* Dismiss CTA */}
              <Animated.View entering={FadeInDown.duration(300).delay(650)}>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.dismissButton,
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <TText
                    style={[
                      styles.dismissText,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Keep going →
                  </TText>
                </Pressable>
              </Animated.View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  card: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    padding: 28,
    alignItems: "center",
  },
  emojiContainer: {
    marginBottom: 16,
    alignItems: "center",
  },
  emoji: {
    fontSize: 56,
  },
  title: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  statEmoji: {
    fontSize: 14,
  },
  statText: {
    fontSize: 14,
    fontWeight: "600",
  },
  shareButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginBottom: 12,
    minWidth: 260,
  },
  shareButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
  },
  dismissButton: {
    paddingVertical: 8,
    alignItems: "center",
  },
  dismissText: {
    fontSize: 15,
    fontWeight: "500",
  },
});
