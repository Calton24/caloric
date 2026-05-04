/**
 * Paywall — Unified challenge monetisation paywall.
 *
 * Three variants, one component:
 *   - intro:     First paywall after insight. 3 tiers, dismissible, strikethrough.
 *   - milestone: Day 7/14/21 structured push. Celebration-first, annual hero.
 *   - buffer:    Passive. Blurred locked content with subtle CTA. NOT a modal.
 *
 * No countdown timers, no aggressive language, no guilt.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
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
} from "react-native-reanimated";
import type { PaywallContext } from "../../features/challenge/challenge-monetisation.types";
import {
    buildOfferingsFromPackages,
    type OfferingTier,
} from "../../features/challenge/challenge-pricing";
import { resolvePackageByType } from "../../features/subscription/package-utils";
import { useRevenueCat } from "../../features/subscription/useRevenueCat";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

// ── Props ──────────────────────────────────────────────────────────────────

interface PaywallProps {
  visible: boolean;
  context: PaywallContext;
  onDismiss: () => void;
  onPurchaseComplete?: () => void;
}

// ── Benefits (shared across intro & milestone) ─────────────────────────────

const BENEFITS = [
  {
    icon: "infinite-outline" as const,
    textKey: "paywall.benefitUnlimitedScans",
  },
  { icon: "bar-chart-outline" as const, textKey: "paywall.benefitMacroTrends" },
  {
    icon: "sparkles-outline" as const,
    textKey: "paywall.benefitRecommendations",
  },
];

// ── Component ──────────────────────────────────────────────────────────────

export function Paywall({
  visible,
  context,
  onDismiss,
  onPurchaseComplete,
}: PaywallProps) {
  if (context.variant === "buffer") {
    return <BufferPaywall context={context} onPress={onDismiss} />;
  }

  return (
    <ModalPaywall
      visible={visible}
      context={context}
      onDismiss={onDismiss}
      onPurchaseComplete={onPurchaseComplete}
    />
  );
}

// ── Buffer variant (inline, not a modal) ───────────────────────────────────

function BufferPaywall({
  context,
  onPress,
}: {
  context: PaywallContext;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable onPress={onPress}>
      <GlassSurface intensity="light" style={styles.bufferCard}>
        <View style={styles.bufferContent}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color={theme.colors.primary}
          />
          <View style={styles.bufferTextCol}>
            <TText
              style={[styles.bufferHeadline, { color: theme.colors.text }]}
            >
              {context.headline}
            </TText>
            <TText
              style={[styles.bufferBody, { color: theme.colors.textSecondary }]}
            >
              {context.body}
            </TText>
          </View>
        </View>
        <TText style={[styles.bufferCta, { color: theme.colors.primary }]}>
          {context.cta} →
        </TText>
      </GlassSurface>
    </Pressable>
  );
}

// ── Intro & Milestone variants (modal) ─────────────────────────────────────

function ModalPaywall({
  visible,
  context,
  onDismiss,
  onPurchaseComplete,
}: PaywallProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { purchasePackage, restorePurchases, packages, isLoadingOfferings } =
    useRevenueCat();
  const [isPurchasing, setIsPurchasing] = useState(false);

  const offerings = buildOfferingsFromPackages(packages, {
    isChallengeActive: true,
    isIntroEligible: context.showIntroPricing,
  });

  const isUnavailable = isLoadingOfferings || !offerings;

  const handlePurchase = async (tier: OfferingTier) => {
    if (isPurchasing || isUnavailable) return;
    const realPkg = resolvePackageByType(packages, tier.purchaseTarget);
    if (!realPkg) return; // package not in offering — do nothing
    setIsPurchasing(true);
    try {
      await purchasePackage(realPkg);
      onPurchaseComplete?.();
    } finally {
      setIsPurchasing(false);
    }
  };

  const isMilestone = context.variant === "milestone";

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onDismiss}
    >
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        {/* ── Dismiss bar ── */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.topBar}>
          <View style={styles.handle} />
          <Pressable
            onPress={onDismiss}
            hitSlop={12}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={22} color={theme.colors.textMuted} />
          </Pressable>
        </Animated.View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Celebration / Icon ── */}
          {isMilestone && context.milestoneDay && (
            <Animated.View
              entering={FadeIn.duration(600)}
              style={styles.celebrationArea}
            >
              <LinearGradient
                colors={[
                  theme.colors.primary + "25",
                  theme.colors.accent + "12",
                  "transparent",
                ]}
                style={styles.celebrationGradient}
              />
              <TText style={styles.celebrationEmoji}>
                {context.milestoneDay === 21
                  ? "🏆"
                  : context.milestoneDay === 14
                    ? "⭐"
                    : "🔥"}
              </TText>
              <View
                style={[
                  styles.dayBadge,
                  { backgroundColor: theme.colors.success + "22" },
                ]}
              >
                <TText
                  style={[styles.dayBadgeText, { color: theme.colors.success }]}
                >
                  {t("dayJourney.dayBadge", { day: context.milestoneDay })}
                </TText>
              </View>
            </Animated.View>
          )}

          {!isMilestone && (
            <Animated.View
              entering={FadeInDown.duration(500).delay(100)}
              style={styles.iconArea}
            >
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: theme.colors.primary + "20" },
                ]}
              >
                <Ionicons
                  name="bulb-outline"
                  size={36}
                  color={theme.colors.primary}
                />
              </View>
            </Animated.View>
          )}

          <TSpacer size="lg" />

          {/* ── Insight callout (intro only — references the specific data) ── */}
          {context.insightMessage && (
            <Animated.View entering={FadeInDown.duration(500).delay(150)}>
              <GlassSurface
                intensity="light"
                style={[
                  styles.insightCallout,
                  { borderLeftColor: theme.colors.primary },
                ]}
              >
                <TText
                  style={[styles.insightText, { color: theme.colors.text }]}
                >
                  {context.insightMessage}
                </TText>
              </GlassSurface>
              <TSpacer size="md" />
            </Animated.View>
          )}

          {/* ── Headline + Body ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <TText
              variant="heading"
              style={[styles.headline, { color: theme.colors.text }]}
            >
              {context.headline}
            </TText>
            <TSpacer size="sm" />
            <TText style={[styles.body, { color: theme.colors.textSecondary }]}>
              {context.body}
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Pricing Tiers ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <TText
              style={[styles.pricingHeading, { color: theme.colors.text }]}
            >
              {t("paywall.choosePlan")}
            </TText>
            <TSpacer size="md" />
            {isUnavailable ? (
              <View style={styles.loadingPlans}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
                <TSpacer size="sm" />
                <TText
                  style={[
                    styles.loadingPlansText,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {t("paywall.loadingPlans")}
                </TText>
              </View>
            ) : (
              offerings.tiers.map((tier) => (
                <Pressable
                  key={tier.displayId}
                  onPress={() => handlePurchase(tier)}
                  disabled={isPurchasing}
                >
                  <GlassSurface
                    intensity="light"
                    style={[
                      styles.tierCard,
                      tier.highlighted && {
                        borderColor: theme.colors.primary,
                        borderWidth: 1.5,
                      },
                    ]}
                  >
                    <View style={styles.tierRow}>
                      <View>
                        <TText
                          style={[
                            styles.tierLabel,
                            { color: theme.colors.text },
                          ]}
                        >
                          {tier.label}
                        </TText>
                        {tier.subtext && (
                          <TText
                            style={[
                              styles.tierSubtext,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {tier.subtext}
                          </TText>
                        )}
                        {tier.savingsText && (
                          <TText
                            style={[
                              styles.tierSavings,
                              { color: theme.colors.success },
                            ]}
                          >
                            {tier.savingsText}
                          </TText>
                        )}
                      </View>
                      <View style={styles.tierPriceCol}>
                        {tier.strikethrough && (
                          <TText
                            style={[
                              styles.tierStrikethrough,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            {tier.strikethrough}
                          </TText>
                        )}
                        <TText
                          style={[
                            styles.tierPrice,
                            { color: theme.colors.text },
                          ]}
                        >
                          {tier.price}
                          <TText
                            style={[
                              styles.tierPeriod,
                              { color: theme.colors.textSecondary },
                            ]}
                          >
                            {tier.period}
                          </TText>
                        </TText>
                        {tier.renewalText && (
                          <TText
                            style={[
                              styles.tierRenewal,
                              { color: theme.colors.textMuted },
                            ]}
                          >
                            {tier.renewalText}
                          </TText>
                        )}
                      </View>
                    </View>
                    {tier.highlighted && (
                      <View
                        style={[
                          styles.highlightBadge,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <TText style={styles.highlightBadgeText}>
                          {context.showIntroPricing &&
                          tier.displayId === "intro"
                            ? t("paywall.challengeOnly")
                            : tier.displayId === "annual" &&
                                context.showAnnualDiscount
                              ? t("paywall.challengePrice")
                              : t("paywall.bestValue")}
                        </TText>
                      </View>
                    )}
                  </GlassSurface>
                  <TSpacer size="sm" />
                </Pressable>
              ))
            )}
          </Animated.View>

          {isPurchasing && (
            <ActivityIndicator
              size="small"
              color={theme.colors.primary}
              style={styles.loader}
            />
          )}

          <TSpacer size="lg" />

          {/* ── Benefits (supporting detail, below pricing) ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <GlassSurface intensity="light" style={styles.benefitsCard}>
              {BENEFITS.map((b, i) => (
                <View key={i} style={styles.benefitRow}>
                  <Ionicons
                    name={b.icon}
                    size={18}
                    color={theme.colors.primary}
                  />
                  <TText
                    style={[styles.benefitText, { color: theme.colors.text }]}
                  >
                    {t(b.textKey)}
                  </TText>
                </View>
              ))}
            </GlassSurface>
          </Animated.View>
        </ScrollView>

        {/* ── Footer ── */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(500)}
          style={styles.footer}
        >
          <Pressable onPress={onDismiss} style={styles.maybeLater}>
            <TText
              style={[
                styles.maybeLaterText,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("paywall.maybeLater")}
            </TText>
          </Pressable>
          <Pressable onPress={restorePurchases}>
            <TText
              style={[styles.restoreText, { color: theme.colors.textMuted }]}
            >
              {t("settings.restorePurchases")}
            </TText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#aaa",
    opacity: 0.4,
  },
  closeButton: {
    position: "absolute",
    right: 16,
    top: 12,
    padding: 4,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingBottom: 120,
  },
  // ── Celebration (milestone) ──
  celebrationArea: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 8,
  },
  celebrationGradient: {
    position: "absolute",
    top: 0,
    left: -24,
    right: -24,
    height: 160,
  },
  celebrationEmoji: {
    fontSize: 56,
  },
  dayBadge: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  dayBadgeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  // ── Icon (intro) ──
  iconArea: {
    alignItems: "center",
    paddingTop: 28,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Text ──
  headline: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  // ── Insight callout ──
  insightCallout: {
    borderRadius: 12,
    borderLeftWidth: 3,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 4,
  },
  insightText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
  },
  // ── Benefits ──
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
  // ── Pricing ──
  pricingHeading: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  loadingPlans: {
    alignItems: "center",
    paddingVertical: 24,
  },
  loadingPlansText: {
    fontSize: 14,
  },
  tierCard: {
    borderRadius: 14,
    padding: 16,
    overflow: "hidden",
  },
  tierRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tierLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  tierSubtext: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  tierSavings: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  tierPriceCol: {
    alignItems: "flex-end",
  },
  tierStrikethrough: {
    fontSize: 13,
    textDecorationLine: "line-through",
  },
  tierPrice: {
    fontSize: 20,
    fontWeight: "800",
  },
  tierPeriod: {
    fontSize: 13,
    fontWeight: "500",
  },
  tierRenewal: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  highlightBadge: {
    position: "absolute",
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 10,
  },
  highlightBadgeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  loader: {
    marginTop: 16,
  },
  // ── Footer ──
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingBottom: 36,
    paddingTop: 12,
    gap: 10,
  },
  maybeLater: {
    paddingVertical: 8,
  },
  maybeLaterText: {
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  restoreText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
  // ── Buffer ──
  bufferCard: {
    borderRadius: 14,
    padding: 16,
    gap: 12,
  },
  bufferContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  bufferTextCol: {
    flex: 1,
  },
  bufferHeadline: {
    fontSize: 15,
    fontWeight: "700",
  },
  bufferBody: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  bufferCta: {
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
});
