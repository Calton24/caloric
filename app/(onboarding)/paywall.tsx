/**
 * Onboarding Step 9 — 21-Day Challenge Activation
 *
 * Replaces the hard paywall with a free commitment screen.
 * Users start their challenge here; conversion offer appears
 * after they've proven the habit (day 14+).
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/features/auth/useAuth";
import { buildNewChallenge } from "../../src/features/challenge/challenge.service";
import { useChallengeStore } from "../../src/features/challenge/challenge.store";
import { createChallenge } from "../../src/features/challenge/challenge.sync";
import type { UserChallenge } from "../../src/features/challenge/challenge.types";
import { useRevenueCat } from "../../src/features/subscription/useRevenueCat";
import { logger } from "../../src/logging/logger";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

const PILLARS = [
  {
    icon: "calendar-outline" as const,
    title: "Log daily",
    sub: "A few taps per meal is all it takes",
  },
  {
    icon: "trending-up-outline" as const,
    title: "See patterns",
    sub: "Insights emerge after just a few days",
  },
  {
    icon: "trophy-outline" as const,
    title: "Finish strong",
    sub: "Completers earn early access to the full app",
  },
];

export default function OnboardingChallengeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const setChallenge = useChallengeStore((s) => s.setChallenge);
  const existingChallenge = useChallengeStore((s) => s.challenge);
  const [isStarting, setIsStarting] = useState(false);
  const { presentPaywall, restorePurchases, isPro } = useRevenueCat();

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);

    try {
      // If a challenge already exists (e.g. user revisiting onboarding), skip.
      if (existingChallenge) {
        router.push("/(onboarding)/complete" as any);
        return;
      }

      const userId = user?.id;
      const now = new Date().toISOString();
      const partial = buildNewChallenge(userId ?? "local");
      const challenge: UserChallenge = {
        ...partial,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      };

      // Persist locally immediately (offline-first)
      setChallenge(challenge);

      // Push to Supabase in background (no-op if not authed yet)
      createChallenge(challenge).catch((e) =>
        logger.warn("[Challenge] Supabase insert failed:", e)
      );

      router.push("/(onboarding)/complete" as any);
    } finally {
      setIsStarting(false);
    }
  };

  const handleSkip = () => {
    router.push("/(onboarding)/complete" as any);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        {/* ── Close / Skip ── */}
        <Animated.View entering={FadeIn.duration(400)} style={styles.closeRow}>
          <Pressable onPress={handleSkip} hitSlop={12}>
            <Ionicons name="close" size={24} color={theme.colors.textMuted} />
          </Pressable>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Heading ── */}
          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <View style={styles.headingRow}>
              <TText
                variant="heading"
                style={[styles.heading, { color: theme.colors.text }]}
              >
                Your 21-Day Plan{"\n"}is Ready
              </TText>
              <View
                style={[
                  styles.freeBadge,
                  { backgroundColor: theme.colors.success + "22" },
                ]}
              >
                <TText
                  style={[
                    styles.freeBadgeText,
                    { color: theme.colors.success },
                  ]}
                >
                  100% FREE
                </TText>
              </View>
            </View>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeIn.duration(500).delay(250)}>
            <TText color="secondary" style={styles.sub}>
              Most people see real results in 21 days.{"\n"}Log your meals.
              Build the habit. Free.
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Day progress preview ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(350)}>
            <GlassSurface intensity="light" style={styles.progressCard}>
              <View style={styles.progressRow}>
                <TText
                  style={[
                    styles.progressLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Day 1
                </TText>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { backgroundColor: theme.colors.primary, width: "5%" },
                    ]}
                  />
                </View>
                <TText
                  style={[
                    styles.progressLabel,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Day 21
                </TText>
              </View>
              <TSpacer size="xs" />
              <TText
                style={[
                  styles.progressSub,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Each logged day fills the bar
              </TText>
            </GlassSurface>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── 3 Pillars ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <GlassSurface intensity="light" style={styles.pillarsCard}>
              {PILLARS.map((p, i) => (
                <View
                  key={i}
                  style={[
                    styles.pillarRow,
                    i < PILLARS.length - 1 && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: theme.colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.pillarIcon,
                      { backgroundColor: theme.colors.primary + "18" },
                    ]}
                  >
                    <Ionicons
                      name={p.icon}
                      size={22}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.pillarText}>
                    <TText
                      style={[styles.pillarTitle, { color: theme.colors.text }]}
                    >
                      {p.title}
                    </TText>
                    <TText
                      style={[
                        styles.pillarSub,
                        { color: theme.colors.textMuted },
                      ]}
                    >
                      {p.sub}
                    </TText>
                  </View>
                </View>
              ))}
            </GlassSurface>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Unlock Pro offer ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(600)}>
            <GlassSurface intensity="light" style={styles.proCard}>
              <View style={styles.proHeader}>
                <Ionicons name="star" size={20} color="#FBBF24" />
                <TText style={[styles.proTitle, { color: theme.colors.text }]}>
                  {isPro ? "You're Pro!" : "Want to unlock everything?"}
                </TText>
              </View>
              <TSpacer size="xs" />
              <TText
                style={[styles.proSub, { color: theme.colors.textSecondary }]}
              >
                {isPro
                  ? "You have full access to all features."
                  : "Get unlimited AI scans, detailed insights, and more with a Pro subscription."}
              </TText>
              {!isPro && (
                <>
                  <TSpacer size="md" />
                  <Pressable
                    onPress={presentPaywall}
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.85 : 1,
                    })}
                  >
                    <View
                      style={[
                        styles.proButton,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      <TText
                        style={[
                          styles.proButtonText,
                          { color: theme.colors.textInverse },
                        ]}
                      >
                        View Plans
                      </TText>
                    </View>
                  </Pressable>
                </>
              )}
            </GlassSurface>
          </Animated.View>

          <TSpacer size="xl" />
        </ScrollView>

        {/* ── CTA ── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(700)}
          style={styles.ctaArea}
        >
          <Pressable
            testID="challenge-start"
            onPress={handleStart}
            disabled={isStarting}
            style={({ pressed }) => ({
              opacity: pressed || isStarting ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              width: "100%",
            })}
          >
            <LinearGradient
              colors={[theme.colors.primary, theme.colors.accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaGradient}
            >
              {isStarting ? (
                <ActivityIndicator color={theme.colors.textInverse} />
              ) : (
                <TText
                  style={[styles.ctaText, { color: theme.colors.textInverse }]}
                >
                  Start My Challenge →
                </TText>
              )}
            </LinearGradient>
          </Pressable>

          <TSpacer size="sm" />

          <Pressable onPress={handleSkip} hitSlop={12}>
            <TText style={[styles.skipText, { color: theme.colors.textMuted }]}>
              Skip for now
            </TText>
          </Pressable>

          <TSpacer size="xs" />

          <TText style={[styles.legalText, { color: theme.colors.textMuted }]}>
            Users who complete 21 days are invited to unlock the full app at a
            special rate.
          </TText>

          <TSpacer size="xs" />

          <Pressable onPress={restorePurchases} hitSlop={12}>
            <TText
              style={[styles.restoreText, { color: theme.colors.textMuted }]}
            >
              Restore Purchases
            </TText>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  closeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headingRow: {
    gap: 8,
  },
  heading: {
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 40,
  },
  freeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  freeBadgeText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 17,
    lineHeight: 24,
  },
  // Progress preview
  progressCard: {
    padding: 20,
    borderRadius: 16,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: "600",
    width: 38,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(128,128,128,0.15)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressSub: {
    fontSize: 13,
    textAlign: "center",
  },
  // Pillars
  pillarsCard: {
    borderRadius: 16,
    overflow: "hidden",
  },
  pillarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  pillarIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  pillarText: {
    flex: 1,
  },
  pillarTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  pillarSub: {
    fontSize: 13,
    marginTop: 2,
  },
  // CTA
  ctaArea: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  ctaGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 16,
    width: "100%",
  },
  ctaText: {
    fontSize: 18,
    fontWeight: "700",
  },
  skipText: {
    fontSize: 14,
    textDecorationLine: "underline",
  },
  legalText: {
    fontSize: 11,
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 20,
  },
  restoreText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
  // Pro upsell card
  proCard: {
    padding: 20,
    borderRadius: 16,
  },
  proHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  proTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  proSub: {
    fontSize: 14,
    lineHeight: 20,
  },
  proButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  proButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
