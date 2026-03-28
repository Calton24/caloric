/**
 * HardPaywall — Day 21 challenge completion conversion
 *
 * Design inspired by modern subscription paywalls:
 *   - Hero area with large graphic + gradient fade
 *   - Social proof (stars + stats overlay)
 *   - Bold headline + checkmark benefits
 *   - 3-column pricing selector
 *   - Gradient CTA button
 *   - Restore / Terms / Privacy footer
 *
 * Not dismissible without action (subscribe or downgrade to free tier).
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Modal,
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
import type { ChallengeProgress } from "../../features/challenge/challenge.types";
import { useRevenueCat } from "../../features/subscription/useRevenueCat";
import { useTheme } from "../../theme/useTheme";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = 340;

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

const TIER_ORDER: TierKey[] = ["monthly", "yearly", "lifetime"];

// ── Benefits ───────────────────────────────────────────────────────────────

const BENEFITS: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}[] = [
  {
    icon: "scan-outline",
    title: "Unlimited AI Food Scans",
    subtitle: "Snap any meal for instant macro breakdown",
  },
  {
    icon: "bar-chart-outline",
    title: "Weekly Trends & Insights",
    subtitle: "Track macros, streaks, and progress over time",
  },
  {
    icon: "bulb-outline",
    title: "Personalized Recommendations",
    subtitle: "AI-powered tips based on your eating patterns",
  },
  {
    icon: "share-outline",
    title: "Export & Coach Sharing",
    subtitle: "Download data or share with your nutritionist",
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

// ── Component ──────────────────────────────────────────────────────────────

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
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);

  // Sort packages
  const sorted = [...(packages ?? [])].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(getTierKey(a));
    const bi = TIER_ORDER.indexOf(getTierKey(b));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Auto-select yearly (best value)
  const effectiveSelection =
    selectedPkg ??
    sorted.find((p) => getTierKey(p) === "yearly")?.identifier ??
    sorted[0]?.identifier;

  // Selected product info for billing context
  const selectedProduct = sorted.find(
    (p) => p.identifier === effectiveSelection
  );
  const selectedPrice = selectedProduct
    ? ((selectedProduct.product ?? selectedProduct.storeProduct)?.priceString ??
      "")
    : "";
  const selectedTier = selectedProduct ? getTierKey(selectedProduct) : "yearly";

  const handlePurchase = async () => {
    const pkg = sorted.find((p) => p.identifier === effectiveSelection);
    if (!pkg || isPurchasing) return;
    setIsPurchasing(true);
    try {
      await purchasePackage(pkg);
    } finally {
      setIsPurchasing(false);
    }
  };

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
          bounces={false}
        >
          {/* ══════════════════════════════════════════════════════════
              HERO AREA — gradient background with celebration content
             ══════════════════════════════════════════════════════════ */}
          <View style={styles.heroContainer}>
            <LinearGradient
              colors={[
                theme.colors.primary + "30",
                theme.colors.accent + "18",
                theme.colors.background,
              ]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={styles.heroGradient}
            />

            {/* Celebration graphic */}
            <Animated.View
              entering={FadeIn.duration(800)}
              style={styles.heroContent}
            >
              <TText style={styles.heroEmoji}>🏆</TText>

              {/* Stats row overlaid on hero */}
              <View style={styles.heroStatsRow}>
                <View style={styles.heroStat}>
                  <TText style={[styles.heroStatValue, { color: "#fff" }]}>
                    {completedDays}
                  </TText>
                  <TText style={styles.heroStatLabel}>days logged</TText>
                </View>
                <View
                  style={[
                    styles.heroStatDot,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
                <View style={styles.heroStat}>
                  <TText style={[styles.heroStatValue, { color: "#fff" }]}>
                    {Math.round((completedDays / 21) * 100)}%
                  </TText>
                  <TText style={styles.heroStatLabel}>completion</TText>
                </View>
                <View
                  style={[
                    styles.heroStatDot,
                    { backgroundColor: theme.colors.primary },
                  ]}
                />
                <View style={styles.heroStat}>
                  <TText style={[styles.heroStatValue, { color: "#fff" }]}>
                    21
                  </TText>
                  <TText style={styles.heroStatLabel}>day streak</TText>
                </View>
              </View>

              {/* Social proof — stars */}
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((i) => (
                  <Ionicons key={i} name="star" size={16} color="#FBBF24" />
                ))}
              </View>
              <TText style={styles.proofText}>Loved by 1,000+ users</TText>
            </Animated.View>
          </View>

          {/* ══════════════════════════════════════════════════════════
              CONTENT AREA — headline, benefits, pricing
             ══════════════════════════════════════════════════════════ */}
          <View style={styles.contentArea}>
            {/* Headline */}
            <Animated.View entering={FadeInDown.duration(600).delay(200)}>
              <TText
                variant="heading"
                style={[styles.headline, { color: theme.colors.text }]}
              >
                Get full access today
              </TText>
              <TSpacer size="xs" />
              <TText
                style={[
                  styles.subheadline,
                  { color: theme.colors.textSecondary },
                ]}
              >
                Unlock everything from your 21-day journey
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
                      style={[
                        styles.benefitTitle,
                        { color: theme.colors.text },
                      ]}
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

            {/* ── CTA button ── */}
            <Animated.View entering={FadeInUp.duration(500).delay(600)}>
              <Pressable
                onPress={handlePurchase}
                disabled={isPurchasing || sorted.length === 0}
                style={({ pressed }) => ({
                  opacity: pressed || isPurchasing ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaButton}
                >
                  {isPurchasing ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <TText style={styles.ctaText}>Continue</TText>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>

            {/* Billing context */}
            {effectiveSelection && (
              <TText
                style={[
                  styles.billingContext,
                  { color: theme.colors.textMuted },
                ]}
              >
                {selectedTier === "yearly"
                  ? `Single payment of ${selectedPrice} for 12 months`
                  : selectedTier === "monthly"
                    ? `${selectedPrice} billed every month`
                    : `One-time payment of ${selectedPrice}`}
              </TText>
            )}

            <TSpacer size="md" />

            {/* ── Footer links ── */}
            <Animated.View
              entering={FadeIn.duration(400).delay(700)}
              style={styles.footerRow}
            >
              <Pressable onPress={restorePurchases} hitSlop={12}>
                <TText
                  style={[styles.footerLink, { color: theme.colors.textMuted }]}
                >
                  Restore Purchases
                </TText>
              </Pressable>
              <Pressable onPress={onContinueFree} hitSlop={12}>
                <TText
                  style={[styles.footerLink, { color: theme.colors.textMuted }]}
                >
                  Skip
                </TText>
              </Pressable>
            </Animated.View>

            <TSpacer size="xl" />
          </View>
        </ScrollView>
      </View>
    </Modal>
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
    justifyContent: "flex-end",
    alignItems: "center",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    alignItems: "center",
    paddingBottom: 24,
  },
  heroEmoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  heroStat: {
    alignItems: "center",
  },
  heroStatValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "rgba(255,255,255,0.65)",
    marginTop: 2,
  },
  heroStatDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    opacity: 0.5,
  },
  starsRow: {
    flexDirection: "row",
    gap: 2,
    marginBottom: 4,
  },
  proofText: {
    fontSize: 12,
    fontWeight: "500",
    color: "rgba(255,255,255,0.55)",
  },

  // Content
  contentArea: {
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  headline: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 34,
  },
  subheadline: {
    fontSize: 15,
    lineHeight: 21,
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

  // CTA
  ctaButton: {
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
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
    marginTop: 10,
  },

  // Footer
  footerRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: "500",
  },
});
