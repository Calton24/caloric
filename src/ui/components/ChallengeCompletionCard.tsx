/**
 * ChallengeCompletionCard — Day 21 achievement badge + stat card.
 *
 * Shown in the IDENTITY phase. Shareable via view-shot + expo-sharing.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Sharing from "expo-sharing";
import { useCallback, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import ViewShot from "react-native-view-shot";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

interface ChallengeCompletionCardProps {
  totalCalories: number;
  weeklyAvgCalories: number;
  streakDays: number;
  completedDays: number;
}

export function ChallengeCompletionCard({
  totalCalories,
  weeklyAvgCalories,
  streakDays,
  completedDays,
}: ChallengeCompletionCardProps) {
  const { theme } = useTheme();
  const viewShotRef = useRef<ViewShot>(null);

  const handleShare = useCallback(async () => {
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (uri && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share your challenge results",
        });
      }
    } catch {
      // Silent — sharing may not be available
    }
  }, []);

  return (
    <Animated.View entering={FadeIn.duration(600)}>
      <ViewShot ref={viewShotRef} options={{ format: "png", quality: 0.9 }}>
        <GlassSurface intensity="light" style={styles.card}>
          {/* ── Badge header ── */}
          <LinearGradient
            colors={[
              theme.colors.primary + "20",
              theme.colors.accent + "10",
              "transparent",
            ]}
            style={styles.badgeGradient}
          />
          <Animated.View
            entering={FadeInDown.duration(500).delay(100)}
            style={styles.badgeArea}
          >
            <TText style={styles.trophy}>🏆</TText>
            <TSpacer size="sm" />
            <TText
              variant="heading"
              style={[styles.badgeTitle, { color: theme.colors.text }]}
            >
              Challenge Complete
            </TText>
            <TText
              style={[styles.badgeSub, { color: theme.colors.textSecondary }]}
            >
              Completed Caloric 21-Day Challenge
            </TText>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Stats grid ── */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(250)}
            style={styles.statsGrid}
          >
            <StatCell
              label="Total Calories"
              value={totalCalories.toLocaleString()}
              icon="flame-outline"
              color={theme.colors.primary}
              textColor={theme.colors.text}
              mutedColor={theme.colors.textSecondary}
            />
            <StatCell
              label="Weekly Avg"
              value={weeklyAvgCalories.toLocaleString()}
              icon="bar-chart-outline"
              color={theme.colors.accent}
              textColor={theme.colors.text}
              mutedColor={theme.colors.textSecondary}
            />
            <StatCell
              label="Days Logged"
              value={`${completedDays}/21`}
              icon="calendar-outline"
              color={theme.colors.success}
              textColor={theme.colors.text}
              mutedColor={theme.colors.textSecondary}
            />
            <StatCell
              label="Best Streak"
              value={`${streakDays} days`}
              icon="trending-up-outline"
              color="#FBBF24"
              textColor={theme.colors.text}
              mutedColor={theme.colors.textSecondary}
            />
          </Animated.View>
        </GlassSurface>
      </ViewShot>

      <TSpacer size="md" />

      {/* ── Share button (outside ViewShot) ── */}
      <Pressable onPress={handleShare} style={styles.shareButton}>
        <Ionicons name="share-outline" size={18} color={theme.colors.primary} />
        <TText style={[styles.shareText, { color: theme.colors.primary }]}>
          Share your results
        </TText>
      </Pressable>
    </Animated.View>
  );
}

// ── Stat cell ──────────────────────────────────────────────────────────────

function StatCell({
  label,
  value,
  icon,
  color,
  textColor,
  mutedColor,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  textColor: string;
  mutedColor: string;
}) {
  return (
    <View style={styles.statCell}>
      <View style={[styles.statIcon, { backgroundColor: color + "18" }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <TText style={[styles.statValue, { color: textColor }]}>{value}</TText>
      <TText style={[styles.statLabel, { color: mutedColor }]}>{label}</TText>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 24,
    overflow: "hidden",
  },
  badgeGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  badgeArea: {
    alignItems: "center",
  },
  trophy: {
    fontSize: 48,
  },
  badgeTitle: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  badgeSub: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCell: {
    width: "47%",
    alignItems: "center",
    paddingVertical: 12,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  shareText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
