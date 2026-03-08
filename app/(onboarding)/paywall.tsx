/**
 * Onboarding Step 9 — Paywall
 *
 * 7-day free trial gate. Shows annual vs monthly pricing,
 * a feature list, testimonial quote, and primary CTA.
 * "Skip" link at bottom for free-tier fallback.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

// ── Pricing tiers ──
interface PricingTier {
  id: string;
  label: string;
  price: string;
  perMonth: string;
  badge?: string;
}

const TIERS: PricingTier[] = [
  {
    id: "annual",
    label: "Annual",
    price: "$39.99/yr",
    perMonth: "$3.33/mo",
    badge: "Best Value",
  },
  {
    id: "monthly",
    label: "Monthly",
    price: "$7.99/mo",
    perMonth: "$7.99/mo",
  },
];

const FEATURES = [
  "Personalized calorie & macro plan",
  "Barcode scanner & food database",
  "Progress photos & measurements",
  "Advanced analytics & insights",
  "Unlimited meal logging",
];

export default function OnboardingPaywallScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [selectedTier, setSelectedTier] = useState("annual");

  const handleStart = () => {
    // In production: trigger StoreKit / Play Billing
    router.push("/(onboarding)/complete" as any);
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
                Unlock Your{"\n"}Full Plan
              </TText>
              <View
                style={[
                  styles.trialBadge,
                  { backgroundColor: theme.colors.success + "22" },
                ]}
              >
                <TText
                  style={[styles.trialText, { color: theme.colors.success }]}
                >
                  7-DAY FREE TRIAL
                </TText>
              </View>
            </View>
          </Animated.View>

          <TSpacer size="sm" />

          <Animated.View entering={FadeIn.duration(500).delay(250)}>
            <TText color="secondary" style={styles.sub}>
              Try everything free for 7 days.{"\n"}Cancel anytime — no charge.
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Pricing tiers ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(350)}>
            <View style={styles.tierRow}>
              {TIERS.map((tier) => {
                const isActive = selectedTier === tier.id;
                return (
                  <Pressable
                    key={tier.id}
                    onPress={() => setSelectedTier(tier.id)}
                    style={styles.tierPressable}
                    testID={`tier-${tier.id}`}
                  >
                    <GlassSurface
                      intensity={isActive ? "medium" : "light"}
                      style={[
                        styles.tierCard,
                        {
                          borderColor: isActive
                            ? theme.colors.primary
                            : "transparent",
                          borderWidth: 2,
                        },
                      ]}
                    >
                      {tier.badge && (
                        <View
                          style={[
                            styles.bestBadge,
                            {
                              backgroundColor: theme.colors.primary,
                            },
                          ]}
                        >
                          <TText style={styles.bestBadgeText}>
                            {tier.badge}
                          </TText>
                        </View>
                      )}
                      <TText
                        style={[
                          styles.tierLabel,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {tier.label}
                      </TText>
                      <TSpacer size="xs" />
                      <TText
                        style={[styles.tierPrice, { color: theme.colors.text }]}
                      >
                        {tier.price}
                      </TText>
                      <TText
                        style={[
                          styles.tierPer,
                          { color: theme.colors.textMuted },
                        ]}
                      >
                        {tier.perMonth}
                      </TText>
                      {isActive && (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={theme.colors.primary}
                          style={styles.tierCheck}
                        />
                      )}
                    </GlassSurface>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Feature list ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <GlassSurface intensity="light" style={styles.featureCard}>
              <TText
                style={[
                  styles.featureHead,
                  { color: theme.colors.textSecondary },
                ]}
              >
                EVERYTHING INCLUDED
              </TText>
              <TSpacer size="md" />
              {FEATURES.map((f, i) => (
                <View key={i} style={styles.featureRow}>
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color={theme.colors.success}
                  />
                  <TText
                    style={[styles.featureText, { color: theme.colors.text }]}
                  >
                    {f}
                  </TText>
                </View>
              ))}
            </GlassSurface>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Testimonial ── */}
          <Animated.View entering={FadeInUp.duration(400).delay(650)}>
            <GlassSurface intensity="light" style={styles.testimonialCard}>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <Ionicons key={s} name="star" size={16} color="#FBBF24" />
                ))}
              </View>
              <TSpacer size="sm" />
              <TText
                style={[styles.testimonialText, { color: theme.colors.text }]}
              >
                &ldquo;I lost 22 lbs in 3 months. The plan was easy to follow
                and I never felt hungry.&rdquo;
              </TText>
              <TSpacer size="xs" />
              <TText
                style={[
                  styles.testimonialAuthor,
                  { color: theme.colors.textMuted },
                ]}
              >
                — Sarah K., verified user
              </TText>
            </GlassSurface>
          </Animated.View>

          <TSpacer size="xl" />
        </ScrollView>

        {/* ── CTA ── */}
        <Animated.View
          entering={FadeInUp.duration(500).delay(800)}
          style={styles.ctaArea}
        >
          <Pressable
            testID="paywall-start"
            onPress={handleStart}
            style={({ pressed }) => ({
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
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
                Start Free Trial
              </TText>
            </LinearGradient>
          </Pressable>

          <TSpacer size="sm" />

          <Pressable onPress={handleSkip} hitSlop={12}>
            <TText style={[styles.skipText, { color: theme.colors.textMuted }]}>
              No thanks, continue with limited features
            </TText>
          </Pressable>

          <TSpacer size="xs" />

          <TText style={[styles.legalText, { color: theme.colors.textMuted }]}>
            Cancel anytime during trial. Subscription auto-renews.
          </TText>
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
  trialBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  trialText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sub: {
    fontSize: 17,
    lineHeight: 24,
  },
  // Tier selector
  tierRow: {
    flexDirection: "row",
    gap: 12,
  },
  tierPressable: {
    flex: 1,
  },
  tierCard: {
    alignItems: "center",
    paddingVertical: 20,
    paddingHorizontal: 12,
    borderRadius: 16,
    position: "relative",
    overflow: "hidden",
  },
  bestBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingVertical: 3,
    alignItems: "center",
  },
  bestBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
  tierLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 8,
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: "800",
  },
  tierPer: {
    fontSize: 12,
    marginTop: 2,
  },
  tierCheck: {
    marginTop: 8,
  },
  // Features
  featureCard: {
    padding: 20,
    borderRadius: 16,
  },
  featureHead: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 15,
    flex: 1,
  },
  // Testimonial
  testimonialCard: {
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  stars: {
    flexDirection: "row",
    gap: 2,
  },
  testimonialText: {
    fontSize: 15,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 22,
  },
  testimonialAuthor: {
    fontSize: 13,
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
  },
});
