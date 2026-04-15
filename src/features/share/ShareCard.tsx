/**
 * ShareCard — the viral share image component.
 *
 * Rendered off-screen, captured as a PNG via captureRef for sharing.
 * Dark theme, bold typography, progress bar, subtle branding.
 *
 * NOTE: Uses a plain View (not ViewShot) so the module loads without
 * the native binary. captureRef is called dynamically at share time.
 */

import React, { forwardRef } from "react";
import { StyleSheet, View } from "react-native";
import { TText } from "../../ui/primitives/TText";

interface ShareCardProps {
  day: number;
  streak: number;
  mealsLogged: number;
  challengeDays: number;
  emoji: string;
  quote: string;
}

// Card is rendered at a fixed size for consistent image output
const CARD_WIDTH = 360;

export const ShareCard = forwardRef<View, ShareCardProps>(function ShareCard(
  { day, streak, mealsLogged, challengeDays, emoji, quote },
  ref
) {
  const progress = Math.min(day / challengeDays, 1);

  return (
    <View ref={ref} collapsable={false} style={styles.shotWrapper}>
      <View style={styles.card}>
        {/* Brand */}
        <TText style={styles.brand}>Caloric</TText>

        {/* Title */}
        <TText style={styles.title}>21-Day Challenge</TText>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>

        {/* Day badge */}
        <TText style={styles.dayText}>
          Day {day} {day >= challengeDays ? "✅" : emoji}
        </TText>

        {/* Stats */}
        <View style={styles.statsRow}>
          <TText style={styles.stat}>🔥 {streak} day streak</TText>
          <TText style={styles.stat}>🍽️ {mealsLogged} meals logged</TText>
        </View>

        {/* Quote */}
        <TText style={styles.quote}>&quot;{quote}&quot;</TText>

        {/* Hashtag */}
        <TText style={styles.hashtag}>#21DayCaloric</TText>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  shotWrapper: {
    position: "absolute",
    top: -9999,
    left: -9999,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#0B0B0B",
    paddingHorizontal: 32,
    paddingTop: 40,
    paddingBottom: 32,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  brand: {
    color: "#22c55e",
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 16,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 20,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#22c55e",
    borderRadius: 4,
  },
  dayText: {
    color: "#22c55e",
    fontSize: 44,
    fontWeight: "900",
    marginBottom: 16,
    letterSpacing: -1,
  },
  statsRow: {
    gap: 6,
    marginBottom: 20,
  },
  stat: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 16,
    fontWeight: "500",
  },
  quote: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 20,
    lineHeight: 20,
  },
  hashtag: {
    color: "#22c55e",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
