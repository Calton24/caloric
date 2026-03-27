/**
 * HardPaywall — Day 21 challenge completion conversion
 *
 * Shown when the user completes their 21-day challenge.
 * Celebrates their achievement, shows their streak data,
 * and presents the final conversion push.
 * Not dismissible without action (subscribe or downgrade to free tier).
 */

import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import type { ChallengeProgress } from "../../features/challenge/challenge.types";
import { useRevenueCat } from "../../features/subscription/useRevenueCat";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";
import { PricingSelector } from "./PricingSelector";

interface HardPaywallProps {
  visible: boolean;
  onContinueFree: () => void;
  progress?: ChallengeProgress | null;
}

export function HardPaywall({
  visible,
  onContinueFree,
  progress,
}: HardPaywallProps) {
  const { theme } = useTheme();
  const { packages, isLoadingOfferings, purchasePackage, restorePurchases } =
    useRevenueCat();

  const completedDays = progress?.completedDays ?? 21;
  const completionRate = Math.round((completedDays / 21) * 100);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onContinueFree}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <TSpacer size="xxl" />

          {/* ── Celebration ── */}
          <Animated.View
            entering={FadeInDown.duration(600).delay(100)}
            style={styles.celebrationArea}
          >
            <TText style={styles.emoji}>🎉</TText>
            <TSpacer size="md" />
            <TText
              variant="heading"
              style={[styles.headline, { color: theme.colors.text }]}
            >
              Your 21-day challenge{"\n"}is complete!
            </TText>
            <TSpacer size="sm" />
            <TText
              style={[
                styles.subheadline,
                { color: theme.colors.textSecondary },
              ]}
            >
              You built a real habit. Here&apos;s what you accomplished:
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Stats card ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(300)}>
            <GlassSurface intensity="light" style={styles.statsCard}>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <TText
                    style={[styles.statValue, { color: theme.colors.primary }]}
                  >
                    {completedDays}
                  </TText>
                  <TText
                    style={[
                      styles.statLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Days logged
                  </TText>
                </View>
                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={styles.statItem}>
                  <TText
                    style={[styles.statValue, { color: theme.colors.success }]}
                  >
                    {completionRate}%
                  </TText>
                  <TText
                    style={[
                      styles.statLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Completion
                  </TText>
                </View>
                <View
                  style={[
                    styles.statDivider,
                    { backgroundColor: theme.colors.border },
                  ]}
                />
                <View style={styles.statItem}>
                  <TText
                    style={[styles.statValue, { color: theme.colors.accent }]}
                  >
                    21
                  </TText>
                  <TText
                    style={[
                      styles.statLabel,
                      { color: theme.colors.textMuted },
                    ]}
                  >
                    Day streak
                  </TText>
                </View>
              </View>
            </GlassSurface>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── What's next ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(450)}>
            <TText style={[styles.sectionTitle, { color: theme.colors.text }]}>
              Keep your momentum going
            </TText>
            <TSpacer size="sm" />
            <GlassSurface intensity="light" style={styles.benefitsCard}>
              {[
                {
                  icon: "infinite-outline" as const,
                  text: "Unlimited AI food scans",
                },
                {
                  icon: "trending-up-outline" as const,
                  text: "Weekly macro & calorie trends",
                },
                {
                  icon: "sparkles-outline" as const,
                  text: "Personalized meal recommendations",
                },
                {
                  icon: "download-outline" as const,
                  text: "Export data & coach sharing",
                },
              ].map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Ionicons
                    name={b.icon}
                    size={18}
                    color={theme.colors.primary}
                  />
                  <TText
                    style={[styles.benefitText, { color: theme.colors.text }]}
                  >
                    {b.text}
                  </TText>
                </View>
              ))}
            </GlassSurface>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Pricing ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(600)}>
            <PricingSelector
              packages={packages}
              isLoading={isLoadingOfferings}
              onPurchase={purchasePackage}
              heading="Choose your plan"
            />
          </Animated.View>

          <TSpacer size="xl" />
        </ScrollView>

        {/* ── Bottom ── */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(700)}
          style={styles.bottomArea}
        >
          <Pressable onPress={onContinueFree} hitSlop={12}>
            <TText
              style={[styles.continueText, { color: theme.colors.textMuted }]}
            >
              Continue with limited features
            </TText>
          </Pressable>

          <Pressable onPress={restorePurchases} hitSlop={12}>
            <TText
              style={[styles.restoreText, { color: theme.colors.textMuted }]}
            >
              Restore Purchases
            </TText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  celebrationArea: {
    alignItems: "center",
  },
  emoji: {
    fontSize: 56,
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 36,
  },
  subheadline: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  // Stats
  statsCard: {
    borderRadius: 16,
    padding: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
  },
  // Benefits
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
  },
  benefitsCard: {
    borderRadius: 14,
    padding: 18,
    gap: 14,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitText: {
    fontSize: 15,
    fontWeight: "500",
  },
  // Bottom
  bottomArea: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 12,
  },
  continueText: {
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  restoreText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
