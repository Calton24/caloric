/**
 * JourneyPaywall — Day-specific conversion paywall
 *
 * Core rule: NEVER sell "premium features". ALWAYS sell continuation of progress.
 *
 * Renders the exact paywall copy from day-journey.ts for each conversion day:
 *   Day 3 (soft)     — dismissible, gentle progress framing
 *   Day 7 (hard)     — prominent, "don't lose your progress"
 *   Day 14 (hard)    — identity-level, "this is who you are now"
 *   Day 21 (strongest) — peak emotional leverage
 *
 * Pricing rules:
 *   - Show monthly equivalent: "£6.58/month billed annually" not "£79/year"
 *   - Default selection: yearly with "Best Value" badge
 *   - Lifetime exists to make yearly look cheap
 *
 * When user tries to skip → ExitPaywall intercept:
 *   "Leave now and lose your streak?" + "Stay on Track →"
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
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
import type { PaywallTrigger } from "../../features/retention/day-journey";
import { useRevenueCat } from "../../features/subscription/useRevenueCat";
import { useTheme } from "../../theme/useTheme";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

// ── Types ──

interface JourneyPaywallProps {
  visible: boolean;
  onDismiss: () => void;
  /** The paywall trigger content from day-journey.ts */
  paywallCopy: PaywallTrigger;
  /** Current streak day number */
  streakDay: number;
}

// ── Pricing helpers ──

type TierKey = "monthly" | "yearly" | "other";

function getTierKey(pkg: any): TierKey {
  const id = pkg.identifier ?? "";
  const type = pkg.packageType ?? "";
  if (type === "MONTHLY" || id === "$rc_monthly") return "monthly";
  if (type === "ANNUAL" || id === "$rc_annual") return "yearly";
  return "other";
}

function getTierLabel(tier: TierKey): string {
  switch (tier) {
    case "monthly":
      return "Monthly";
    case "yearly":
      return "Yearly";
    default:
      return "Plan";
  }
}

function getCurrencySymbol(product: any): string {
  const code = product?.currencyCode ?? "USD";
  const symbols: Record<string, string> = {
    USD: "$",
    GBP: "£",
    EUR: "€",
    CAD: "CA$",
    AUD: "A$",
  };
  return symbols[code] ?? code + " ";
}

function getMonthlyEquivalent(product: any): string | null {
  const price = product?.price;
  if (typeof price !== "number" || price <= 0) return null;
  const symbol = getCurrencySymbol(product);
  return `${symbol}${(price / 12).toFixed(2)}/month — billed annually`;
}

const TIER_ORDER: TierKey[] = ["monthly", "yearly"];

// ── Pricing card ──

function PricingCard({
  isSelected,
  onSelect,
  label,
  priceStr,
  subtitle,
  badgeText,
  primaryColor,
  borderColor,
  bgColor,
  textColor,
  secondaryColor,
  mutedColor,
}: {
  isSelected: boolean;
  onSelect: () => void;
  label: string;
  priceStr: string;
  subtitle?: string | null;
  badgeText?: string;
  primaryColor: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  secondaryColor: string;
  mutedColor: string;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isSelected) {
      scale.value = withSequence(
        withSpring(1.03, { damping: 8, stiffness: 400 }),
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
        <View style={[styles.bestBadge, { backgroundColor: primaryColor }]}>
          <TText style={styles.bestBadgeText}>{badgeText}</TText>
        </View>
      )}
      <Animated.View
        style={[
          styles.pricingCard,
          animStyle,
          {
            borderColor: isSelected ? primaryColor : borderColor + "40",
            borderWidth: isSelected ? 2 : 1,
            backgroundColor: isSelected ? primaryColor + "10" : bgColor,
          },
        ]}
      >
        <Pressable onPress={onSelect} style={styles.pricingCardInner}>
          <View style={styles.cardHeader}>
            <TText
              style={[
                styles.tierLabel,
                { color: isSelected ? textColor : secondaryColor },
                isSelected && { fontWeight: "800" },
              ]}
            >
              {label}
            </TText>
            <Ionicons
              name={isSelected ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={isSelected ? primaryColor : mutedColor + "60"}
            />
          </View>
          <TText
            style={[
              styles.tierPrice,
              { color: isSelected ? textColor : secondaryColor },
            ]}
          >
            {priceStr}
          </TText>
          {subtitle && (
            <TText style={[styles.tierSub, { color: mutedColor }]}>
              {subtitle}
            </TText>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

// ── Main component ──

export function JourneyPaywall({
  visible,
  onDismiss,
  paywallCopy,
  streakDay,
}: JourneyPaywallProps) {
  const { theme } = useTheme();
  const { packages, isLoadingOfferings, purchasePackage, restorePurchases } =
    useRevenueCat();
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showExitPaywall, setShowExitPaywall] = useState(false);

  const isSoft = paywallCopy.strength === "soft";

  // Sort packages by tier order
  const sorted = [...(packages ?? [])].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(getTierKey(a));
    const bi = TIER_ORDER.indexOf(getTierKey(b));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // Default to yearly
  const effectiveSelection =
    selectedPkg ??
    sorted.find((p) => getTierKey(p) === "yearly")?.identifier ??
    sorted[0]?.identifier;

  const selectedProduct = sorted.find(
    (p) => p.identifier === effectiveSelection
  );
  const selectedTier = selectedProduct ? getTierKey(selectedProduct) : "yearly";

  const handlePurchase = async () => {
    const pkg = sorted.find((p) => p.identifier === effectiveSelection);
    if (!pkg || isPurchasing) return;
    setIsPurchasing(true);
    try {
      await purchasePackage(pkg);
      onDismiss();
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSkip = () => {
    // Soft paywalls dismiss directly
    if (isSoft) {
      onDismiss();
      return;
    }
    // Hard/strongest → show exit paywall intercept
    setShowExitPaywall(true);
  };

  const handleExitConfirm = () => {
    setShowExitPaywall(false);
    onDismiss();
  };

  const handleExitCancel = () => {
    setShowExitPaywall(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={isSoft ? "pageSheet" : "fullScreen"}
      onRequestClose={handleSkip}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* ── Exit Paywall Overlay ── */}
        {showExitPaywall && (
          <View style={styles.exitOverlay}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={styles.exitBackdrop}
            />
            <Animated.View
              entering={FadeInDown.duration(300)}
              style={[
                styles.exitCard,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <TText style={styles.exitEmoji}>⚠️</TText>
              <TText
                style={[styles.exitHeadline, { color: theme.colors.text }]}
              >
                Leave now and lose your streak?
              </TText>
              <TText
                style={[styles.exitBody, { color: theme.colors.textSecondary }]}
              >
                {`You've built ${streakDay} days of consistency. Don't throw it away.`}
              </TText>
              <TSpacer size="md" />
              <Pressable
                onPress={handleExitCancel}
                style={({ pressed }) => ({
                  opacity: pressed ? 0.9 : 1,
                })}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.exitCta}
                >
                  <TText style={styles.exitCtaText}>Stay on Track →</TText>
                </LinearGradient>
              </Pressable>
              <Pressable onPress={handleExitConfirm} style={styles.exitSkip}>
                <TText
                  style={[
                    styles.exitSkipText,
                    { color: theme.colors.textMuted },
                  ]}
                >
                  Continue without upgrading
                </TText>
              </Pressable>
            </Animated.View>
          </View>
        )}

        {/* ── Top bar (soft only: dismiss handle) ── */}
        {isSoft && (
          <Animated.View entering={FadeIn.duration(300)} style={styles.topBar}>
            <View style={styles.handle} />
          </Animated.View>
        )}

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* ── Streak badge ── */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(100)}
            style={styles.badgeArea}
          >
            <View
              style={[
                styles.streakBadge,
                { backgroundColor: theme.colors.primary + "18" },
              ]}
            >
              <TText
                style={[
                  styles.streakBadgeText,
                  { color: theme.colors.primary },
                ]}
              >
                🔥 {streakDay}-day streak
              </TText>
            </View>
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Headline + Body ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <TText
              variant="heading"
              style={[styles.headline, { color: theme.colors.text }]}
            >
              {paywallCopy.headline}
            </TText>
            <TSpacer size="sm" />
            <TText style={[styles.body, { color: theme.colors.textSecondary }]}>
              {paywallCopy.body}
            </TText>
          </Animated.View>

          {/* ── Bullets (hard/strongest only) ── */}
          {paywallCopy.bullets && paywallCopy.bullets.length > 0 && (
            <>
              <TSpacer size="lg" />
              <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                {paywallCopy.bullets.map((bullet, i) => (
                  <View key={i} style={styles.bulletRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={theme.colors.primary}
                    />
                    <TText
                      style={[styles.bulletText, { color: theme.colors.text }]}
                    >
                      {bullet}
                    </TText>
                  </View>
                ))}
              </Animated.View>
            </>
          )}

          <TSpacer size="xl" />

          {/* ── Pricing cards ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            {isLoadingOfferings ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : sorted.length > 0 ? (
              <View style={styles.pricingRow}>
                {sorted.map((pkg) => {
                  const tier = getTierKey(pkg);
                  const product = pkg.product ?? pkg.storeProduct;
                  const priceStr =
                    product?.priceString ?? product?.price ?? "—";
                  const subtitle =
                    tier === "yearly" ? getMonthlyEquivalent(product) : null;

                  return (
                    <PricingCard
                      key={pkg.identifier}
                      isSelected={pkg.identifier === effectiveSelection}
                      onSelect={() => setSelectedPkg(pkg.identifier)}
                      label={getTierLabel(tier)}
                      priceStr={priceStr}
                      subtitle={subtitle}
                      badgeText={tier === "yearly" ? "Best Value ✦" : undefined}
                      primaryColor={theme.colors.primary}
                      borderColor={theme.colors.border}
                      bgColor={theme.colors.surface}
                      textColor={theme.colors.text}
                      secondaryColor={theme.colors.textSecondary}
                      mutedColor={theme.colors.textMuted}
                    />
                  );
                })}
              </View>
            ) : null}
          </Animated.View>

          {/* ── Billing context ── */}
          {effectiveSelection && (
            <TText
              style={[styles.billingContext, { color: theme.colors.textMuted }]}
            >
              {selectedTier === "yearly"
                ? (() => {
                    const product =
                      selectedProduct?.product ?? selectedProduct?.storeProduct;
                    const equiv = getMonthlyEquivalent(product);
                    return equiv ?? "Billed annually";
                  })()
                : selectedTier === "monthly"
                  ? "Billed every month · Cancel anytime"
                  : "One-time payment · Yours forever"}
            </TText>
          )}

          <TSpacer size="lg" />

          {/* ── CTA Button ── */}
          <Animated.View entering={FadeInUp.duration(500).delay(500)}>
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
                  <TText style={styles.ctaText}>{paywallCopy.cta}</TText>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <TSpacer size="md" />

          {/* ── Skip / Restore ── */}
          <Animated.View
            entering={FadeIn.duration(400).delay(600)}
            style={styles.footerArea}
          >
            <Pressable onPress={handleSkip} style={styles.skipButton}>
              <TText
                style={[styles.skipText, { color: theme.colors.textMuted }]}
              >
                {paywallCopy.skipText}
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

          <TSpacer size="xl" />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Styles ──

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  // Streak badge
  badgeArea: {
    alignItems: "center",
  },
  streakBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakBadgeText: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Content
  headline: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 36,
  },
  body: {
    fontSize: 16,
    lineHeight: 23,
    textAlign: "center",
    paddingHorizontal: 8,
  },

  // Bullets
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingHorizontal: 16,
  },
  bulletText: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },

  // Pricing
  pricingRow: {
    gap: 10,
  },
  pricingCardWrapper: {
    position: "relative",
  },
  bestBadge: {
    position: "absolute",
    top: -10,
    right: 16,
    zIndex: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bestBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  pricingCard: {
    borderRadius: 14,
    overflow: "hidden",
  },
  pricingCardInner: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  tierLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: "800",
  },
  tierSub: {
    fontSize: 12,
    marginTop: 4,
  },
  billingContext: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 12,
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

  // Footer
  footerArea: {
    alignItems: "center",
    gap: 12,
  },
  skipButton: {
    paddingVertical: 8,
  },
  skipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  restoreText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },

  // Exit paywall overlay
  exitOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  exitBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  exitCard: {
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  exitEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  exitHeadline: {
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 28,
  },
  exitBody: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    marginTop: 8,
  },
  exitCta: {
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    width: "100%",
  },
  exitCtaText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  exitSkip: {
    paddingVertical: 12,
  },
  exitSkipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
