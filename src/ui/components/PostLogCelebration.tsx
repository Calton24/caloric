/**
 * PostLogCelebration — After-log feedback overlay
 *
 * Shown briefly after the user logs their first meal of the day.
 * Displays the exact journey-scripted message + animation.
 * Auto-dismisses after 2.5s or on tap.
 */

import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInUp,
    FadeOut,
    SlideInDown,
} from "react-native-reanimated";
import { useTheme } from "../../theme/useTheme";
import { TText } from "../primitives/TText";

interface PostLogCelebrationProps {
  message: string;
  sub: string;
  emoji: string;
  visible: boolean;
  onDismiss: () => void;
}

export function PostLogCelebration({
  message,
  sub,
  emoji,
  visible,
  onDismiss,
}: PostLogCelebrationProps) {
  const { theme } = useTheme();

  // Auto-dismiss after 2.5s
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(onDismiss, 2500);
    return () => clearTimeout(timer);
  }, [visible, onDismiss]);

  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(300)}
      style={styles.overlay}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss} />
      <Animated.View
        entering={SlideInDown.duration(400).springify()}
        style={[styles.card, { backgroundColor: theme.colors.surface }]}
      >
        <Animated.View entering={FadeInUp.duration(500).delay(100)}>
          <TText style={styles.emoji}>{emoji}</TText>
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(500).delay(200)}>
          <TText style={[styles.message, { color: theme.colors.text }]}>
            {message}
          </TText>
        </Animated.View>
        <Animated.View entering={FadeInUp.duration(500).delay(350)}>
          <TText style={[styles.sub, { color: theme.colors.textMuted }]}>
            {sub}
          </TText>
        </Animated.View>

        {/* Progress bar micro-reward animation */}
        <Animated.View
          entering={FadeInUp.duration(600).delay(500)}
          style={styles.progressBarContainer}
        >
          <View
            style={[
              styles.progressBarTrack,
              { backgroundColor: theme.colors.border },
            ]}
          >
            <Animated.View
              style={[
                styles.progressBarFill,
                { backgroundColor: theme.colors.primary },
              ]}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 100,
    paddingBottom: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  card: {
    width: "85%",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 4,
  },
  message: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 26,
  },
  sub: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
  },
  progressBarContainer: {
    width: "100%",
    marginTop: 12,
  },
  progressBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    width: "100%",
    borderRadius: 2,
  },
});
