/**
 * Onboarding Step 11 — Entry Paywall (Day 0)
 *
 * Design: Hero gradient at top, social proof, bold headline,
 * checkmark benefits, 3-column pricing cards, gradient CTA.
 * Keeps green theme throughout.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    View,
} from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withSpring,
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
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 280;

// ── Pricing helpers ────────────────────────────────────────────────────────

type TierKey = "monthly" | "yearly" | "lifetime" | "other";

function getTierKey(pkg: any): TierKey {
  const id = pkg.identifier ?? "";
  const type = pkg.packageType ?? "";
  if (type === "MONTHLY" || id === "$rc_monthly") return "monthly";
  if (type === "ANNUAL" || id === "$rc_annual") return "yearly";
  if (type === "LIFETIME" || id === "$rc_lifetime") return "lifetime";
  return "other";
}

const TIER_ORDER: TierKey[] = ["monthly", "yearly", "lifetime"];

function getTierLabel(tier: TierKey): string {
  switch (tier) {
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    case "lifetime":
      return "Lifetime";
    default:
      return "Plan";
  }
}

// ── Benefits ───────────────────────────────────────────────────────────────

const BENEFITS: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}[] = [
  {
    icon: "camera-outline",
    title: "Snap & Log Instantly",
    subtitle: "AI-powered food recognition in seconds",
  },
  {
    icon: "trending-up-outline",
    title: "Smart Insights & Trends",
    subtitle: "Weekly macros, streaks, and personalized tips",
  },
  {
    icon: "trophy-outline",
    title: "21-Day Challenges",
    subtitle: "Build lasting habits with daily goals",
  },
];

// ── Animated pricing card ──────────────────────────────────────────────────

function PricingCardItem({
  isSelected,
  onSelect,
  label,
  priceStr,
  badgeText,
  primaryColor,
  borderColor,
  bgColor,
  mutedColor,
  secondaryColor,
  textColor,
}: {
  isSelected: boolean;
  onSelect: () => void;
  label: string;
  priceStr: string;
  badgeText?: string;
  primaryColor: string;
  borderColor: string;
  bgColor: string;
  mutedColor: string;
  secondaryColor: string;
  textColor: string;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(
        withSpring(1.05, { damping: 8, stiffness: 400 }),
        withSpring(1, { damping: 12, stiffness: 280 })
      );
    }
  }, [isSelected, scale]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <View style={styles.pricingCardWrapper}>
      {badgeText && (
        <View style={[styles.saveBadge, { backgroundColor: primaryColor }]}>
          <TText style={styles.saveBadgeText}>{badgeText}</TText>
        </View>
      )}
      <Animated.View
        style={[
          styles.pricingCard,
          animStyle,
          {
            borderColor: isSelected ? primaryColor : borderColor + "60",
            borderWidth: isSelected ? 1.5 : 1,
            backgroundColor: isSelected ? primaryColor + "10" : bgColor,
          },
        ]}
      >
        <Pressable onPress={onSelect} style={styles.pricingCardInner}>
          {/* Top row: plan name + checkbox */}
          <View style={styles.cardTopRow}>
            <TText
              style={[
                styles.pricingLabel,
                {
                  color: isSelected ? textColor : secondaryColor,
                },
              ]}
            >
              {label}
            </TText>
            <Ionicons
              name={isSelected ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={isSelected ? primaryColor : mutedColor + "80"}
            />
          </View>
          {/* Price */}
          <TText
            style={[
              styles.pricingPrice,
              { color: isSelected ? textColor : secondaryColor },
            ]}
          >
            {priceStr}
          </TText>
        </Pressable>
      </Animated.View>
    </View>
  );
}

export default function OnboardingChallengeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const setChallenge = useChallengeStore((s) => s.setChallenge);
  const existingChallenge = useChallengeStore((s) => s.challenge);
  const [isStarting, setIsStarting] = useState(false);
  const {
    restorePurchases,
    isPro,
    packages,
    purchasePackage,
    isLoadingOfferings,
  } = useRevenueCat();

  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);

  // Sort packages by tier order
  const sorted = [...(packages ?? [])].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(getTierKey(a));
    const bi = TIER_ORDER.indexOf(getTierKey(b));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Auto-select yearly
  const effectiveSelection =
    selectedPkg ??
    sorted.find((p) => getTierKey(p) === "yearly")?.identifier ??
    sorted[0]?.identifier;

  // Get selected package price for CTA
  const selectedProduct = sorted.find(
    (p) => p.identifier === effectiveSelection
  );
  const selectedPrice = selectedProduct
    ? ((selectedProduct.product ?? selectedProduct.storeProduct)?.priceString ??
      "")
    : "";
  const selectedTier = selectedProduct ? getTierKey(selectedProduct) : "yearly";
  const ctaPriceLabel =
    selectedTier === "yearly"
      ? `${selectedPrice}/year`
      : selectedTier === "monthly"
        ? `${selectedPrice}/month`
        : selectedPrice;

  const handleStart = async () => {
    if (isStarting) return;
    setIsStarting(true);

    try {
      if (existingChallenge) {
        router.push("/(onboarding)/complete" as any);
        return;
      }

      const userId = user?.id;
      const now = new Date().toISOString();
      const partial = buildNewChallenge(userId ?? "local");
      const id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        (c) => {
          const r = (Math.random() * 16) | 0;
          return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
        }
      );
      const challenge: UserChallenge = {
        ...partial,
        id,
        createdAt: now,
        updatedAt: now,
      };

      setChallenge(challenge);

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
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ══════════════════════════════════════════════════════════
            HERO — gradient with app branding + social proof
           ══════════════════════════════════════════════════════════ */}
        <View style={styles.heroContainer}>
          <LinearGradient
            colors={[
              theme.colors.primary + "35",
              theme.colors.accent + "18",
              theme.colors.background,
            ]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroGradient}
          />

          <SafeAreaView edges={["top"]} style={styles.heroSafe}>
            {/* Close button */}
            <Animated.View
              entering={FadeIn.duration(400)}
              style={styles.closeRow}
            >
              <Pressable onPress={handleSkip} hitSlop={12}>
                <Ionicons
                  name="close"
                  size={24}
                  color="rgba(255,255,255,0.6)"
                />
              </Pressable>
            </Animated.View>

            {/* Hero content */}
            <Animated.View
              entering={FadeIn.duration(800)}
              style={styles.heroContent}
            >
              {/* App icon / emoji */}
              <View
                style={[
                  styles.appIconContainer,
                  { backgroundColor: theme.colors.primary + "25" },
                ]}
              >
                <Ionicons
                  name="nutrition-outline"
                  size={40}
                  color={theme.colors.primary}
                />
              </View>

              <TSpacer size="md" />

              {/* Stars + social proof */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons key={i} name="star" size={18} color="#FBBF24" />
                ))}
              </View>
              <TSpacer size="xs" />
              <TText style={styles.proofText}>Loved by 1,000+ users</TText>
            </Animated.View>
          </SafeAreaView>
        </View>

        {/* ══════════════════════════════════════════════════════════
            CONTENT — headline, benefits, pricing
           ══════════════════════════════════════════════════════════ */}
        <View style={styles.contentArea}>
          {/* Headline */}
          <Animated.View entering={FadeInDown.duration(600).delay(200)}>
            <TText
              variant="heading"
              style={[styles.headline, { color: theme.colors.text }]}
            >
              Start your free{"\n"}21-day challenge
            </TText>
            <TSpacer size="xs" />
            <TText
              style={[
                styles.subheadline,
                { color: theme.colors.textSecondary },
              ]}
            >
              Build healthy habits — upgrade anytime
            </TText>
          </Animated.View>

          <TSpacer size="lg" />

          {/* Benefits — icon + title + subtitle (Bevel-style) */}
          <Animated.View entering={FadeInDown.duration(500).delay(350)}>
            {BENEFITS.map((b, i) => (
              <View key={i} style={styles.benefitRow}>
                <View
                  style={[
                    styles.benefitIconCircle,
                    { backgroundColor: theme.colors.primary + "18" },
                  ]}
                >
                  <Ionicons
                    name={b.icon}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.benefitTextCol}>
                  <TText
                    style={[styles.benefitTitle, { color: theme.colors.text }]}
                  >
                    {b.title}
                  </TText>
                  <TText
                    style={[
                      styles.benefitSub,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {b.subtitle}
                  </TText>
                </View>
              </View>
            ))}
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Pricing cards (Bevel-style) ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(500)}>
            {isLoadingOfferings ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : sorted.length > 0 ? (
              <View style={styles.pricingRow}>
                {sorted.map((pkg) => {
                  const tier = getTierKey(pkg);
                  const product = pkg.product ?? pkg.storeProduct;
                  const priceStr =
                    product?.priceString ?? product?.price ?? "—";
                  return (
                    <PricingCardItem
                      key={pkg.identifier}
                      isSelected={pkg.identifier === effectiveSelection}
                      onSelect={() => setSelectedPkg(pkg.identifier)}
                      label={getTierLabel(tier)}
                      priceStr={priceStr}
                      badgeText={tier === "yearly" ? "Best value" : undefined}
                      primaryColor={theme.colors.primary}
                      borderColor={theme.colors.border}
                      bgColor={theme.colors.surface}
                      mutedColor={theme.colors.textMuted}
                      secondaryColor={theme.colors.textSecondary}
                      textColor={theme.colors.text}
                    />
                  );
                })}
              </View>
            ) : null}
          </Animated.View>

          <TSpacer size="lg" />
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════
          BOTTOM — CTA + footer links
         ══════════════════════════════════════════════════════════ */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(600)}
        style={[
          styles.bottomArea,
          { borderTopColor: theme.colors.border + "30" },
        ]}
      >
        {/* CTA — gradient button */}
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
            style={styles.ctaButton}
          >
            {isStarting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <TText style={styles.ctaText}>Start 21-Day Challenge</TText>
            )}
          </LinearGradient>
        </Pressable>

        {/* Payment context */}
        {effectiveSelection && (
          <TText
            style={[styles.billingContext, { color: theme.colors.textMuted }]}
          >
            {selectedTier === "yearly"
              ? `Single payment of ${selectedPrice} for 12 months`
              : selectedTier === "monthly"
                ? `${selectedPrice} billed every month`
                : `One-time payment of ${selectedPrice}`}
          </TText>
        )}

        <TSpacer size="sm" />

        {/* Footer links */}
        <View style={styles.footerRow}>
          <Pressable onPress={restorePurchases} hitSlop={12}>
            <TText
              style={[styles.footerLink, { color: theme.colors.textMuted }]}
            >
              Restore Purchases
            </TText>
          </Pressable>
          <TText style={[styles.footerDot, { color: theme.colors.textMuted }]}>
            ·
          </TText>
          <Pressable onPress={handleSkip} hitSlop={12}>
            <TText
              style={[styles.footerLink, { color: theme.colors.textMuted }]}
            >
              Skip
            </TText>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
  },

  // Hero
  heroContainer: {
    height: HERO_HEIGHT,
    width: SCREEN_WIDTH,
    position: "relative",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroSafe: {
    flex: 1,
  },
  closeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  heroContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 20,
  },
  appIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  starsRow: {
    flexDirection: "row",
    gap: 3,
  },
  proofText: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255,255,255,0.55)",
  },

  // Content
  contentArea: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 34,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },

  // Benefits (Bevel-style: icon circle + title + subtitle)
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  benefitIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitTextCol: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  benefitSub: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 18,
  },

  // Pricing (Bevel-style horizontal cards)
  pricingRow: {
    flexDirection: "row",
    gap: 10,
  },
  pricingCardWrapper: {
    flex: 1,
    position: "relative",
  },
  saveBadge: {
    position: "absolute",
    top: -10,
    left: 10,
    zIndex: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  saveBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  pricingCard: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  pricingCardInner: {
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 12,
    width: "100%",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  pricingLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  pricingPrice: {
    fontSize: 20,
    fontWeight: "800",
  },

  // Bottom
  bottomArea: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ctaButton: {
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  ctaText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  billingContext: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
  },
  footerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: "500",
  },
  footerDot: {
    fontSize: 13,
  },
});
