/**
 * Paywall Screen — three modes share one production-grade layout.
 *
 *   mode=gate        Hard gate (expired trial / no entitlement). No skip, no X.
 *   mode=upgrade     Settings → Upgrade. Back arrow + close X. Skippable (user already has app access).
 *   mode=onboarding  Post-auth onboarding step. No X, no skip. Must pay or restore.
 *
 * Layout (all modes):
 *   - Sticky top bar (back ← upgrade only, close × upgrade/onboarding)
 *   - Hero glow + mode icon (lock / star / flag)
 *   - Title + subtitle
 *   - Four-row value list with checkmarks
 *   - 3 pricing tiles (Monthly / Yearly[best value] / Weekly)
 *   - Gradient CTA + cancellation fine print
 *   - Footer icon row (Restore + Manage Account + Privacy + Terms)
 *   - Below-fold scroll content: "Why go Premium" tiles, single testimonial,
 *     Secure & Private trust note, payment methods, Manage Account card
 *
 * Behaviour kept from prior version:
 *   - RC purchase + analytics, intro eligibility, fallback dev mode,
 *     CTA copy experiment (`paywall_cta_default_v1`), markPaywallSeen on success.
 *   - mode=gate and mode=onboarding hide all dismiss paths; users must subscribe or restore.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  useLocalSearchParams,
  usePathname,
  useRouter,
  useSegments,
} from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  getPaywallCtaCopy,
  trackExperimentClick,
  trackExperimentConversion,
  trackExperimentExposure,
  useExperiment,
} from "../../src/experiments";
import { useAuth } from "../../src/features/auth/useAuth";
import { useSubscriptionStore } from "../../src/features/subscription/subscription.store";
import {
  parsePaywallRouteMode,
  type PaywallRouteMode,
} from "../../src/features/subscription/paywall-mode";
import { useRevenueCat } from "../../src/features/subscription/useRevenueCat";
import {
  formatStorefrontPriceLabel,
  getSubscriptionDisplay,
} from "../../src/lib/billing/subscription-display";
import { tracedPushHref } from "../../src/infrastructure/navigation/navTrace";
import { useAppTranslation } from "../../src/infrastructure/i18n/useAppTranslation";
import { logger } from "../../src/logging/logger";
import { safeRouterBack } from "../../src/navigation/safeBack";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TText } from "../../src/ui/primitives/TText";
import { OnboardingBackground } from "../../src/features/onboarding/components/OnboardingBackground";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PRIVACY_URL = "https://caloric-sage.vercel.app/privacy";
const TERMS_URL = "https://caloric-sage.vercel.app/terms";

// ── Pricing helpers ────────────────────────────────────────────────────────

type TierKey = "weekly" | "monthly" | "yearly" | "other";
const TIER_ORDER: TierKey[] = ["monthly", "yearly", "weekly"];

function getTierKey(pkg: any): TierKey {
  const id = pkg.identifier ?? "";
  const type = pkg.packageType ?? "";
  if (type === "WEEKLY" || id === "$rc_weekly") return "weekly";
  if (type === "MONTHLY" || id === "$rc_monthly") return "monthly";
  if (type === "ANNUAL" || id === "$rc_annual") return "yearly";
  return "other";
}

function getTierLabel(tier: TierKey, t: (key: string) => string): string {
  switch (tier) {
    case "monthly":
      return t("settings.monthly");
    case "yearly":
      return t("settings.yearly");
    case "weekly":
      return t("settings.weekly");
    default:
      return t("settings.plan");
  }
}

function getTierSuffix(tier: TierKey, t: (key: string) => string): string {
  switch (tier) {
    case "monthly":
      return t("paywall.monthSuffix");
    case "yearly":
      return t("paywall.yearSuffix");
    case "weekly":
      return t("paywall.weekSuffix");
    default:
      return "";
  }
}

// ── Mode → header config ──────────────────────────────────────────────────

type ModeConfig = {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconHaloColor: string;
  titleKey: string;
  subtitleKey: string;
  showBack: boolean;
  showClose: boolean;
  showManageAccountFooter: boolean;
};

function getModeConfig(
  mode: PaywallRouteMode,
  primaryColor: string,
): ModeConfig {
  if (mode === "gate") {
    return {
      icon: "lock-closed",
      iconColor: primaryColor,
      iconHaloColor: primaryColor,
      titleKey: "paywall.headerGate",
      subtitleKey: "paywall.headerGateSub",
      showBack: false,
      showClose: false,
      showManageAccountFooter: true,
    };
  }
  if (mode === "upgrade") {
    return {
      icon: "star",
      iconColor: "#FBBF24",
      iconHaloColor: "#FBBF24",
      titleKey: "paywall.headerUpgrade",
      subtitleKey: "paywall.headerUpgradeSub",
      showBack: true,
      showClose: true,
      showManageAccountFooter: true,
    };
  }
  return {
    icon: "flag",
    iconColor: primaryColor,
    iconHaloColor: primaryColor,
    titleKey: "paywall.headerOnboarding",
    subtitleKey: "paywall.headerOnboardingSub",
    showBack: false,
    showClose: false,
    showManageAccountFooter: true,
  };
}

// ── Subcomponents ─────────────────────────────────────────────────────────

function ValueRow({
  textColor,
  primaryColor,
  label,
}: {
  textColor: string;
  primaryColor: string;
  label: string;
}) {
  return (
    <View style={styles.valueRow}>
      <View
        style={[
          styles.valueCheckBubble,
          { backgroundColor: primaryColor + "1F" },
        ]}
      >
        <Ionicons name="checkmark" size={14} color={primaryColor} />
      </View>
      <TText style={[styles.valueLabel, { color: textColor }]}>{label}</TText>
    </View>
  );
}

function HeroIcon({
  icon,
  color,
  haloColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  haloColor: string;
}) {
  const glow = useSharedValue(0.55);
  useEffect(() => {
    glow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1600 }),
        withTiming(0.5, { duration: 1600 }),
      ),
      -1,
      true,
    );
  }, [glow]);
  const haloStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
    transform: [{ scale: 0.95 + glow.value * 0.1 }],
  }));
  return (
    <View style={styles.heroIconWrap} pointerEvents="none">
      <Animated.View
        style={[
          styles.heroHalo,
          haloStyle,
          { backgroundColor: haloColor + "33" },
        ]}
      />
      <Animated.View
        style={[
          styles.heroHaloInner,
          haloStyle,
          { backgroundColor: haloColor + "1A" },
        ]}
      />
      <View style={[styles.heroIconBubble, { borderColor: color + "55" }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
    </View>
  );
}

function PricingTile({
  isSelected,
  onSelect,
  label,
  priceStr,
  suffix,
  badgeText,
  caption,
  primaryColor,
  textColor,
  secondaryColor,
  borderColor,
}: {
  isSelected: boolean;
  onSelect: () => void;
  label: string;
  priceStr: string;
  suffix?: string;
  badgeText?: string;
  caption?: string;
  primaryColor: string;
  textColor: string;
  secondaryColor: string;
  borderColor: string;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={({ pressed }) => [
        styles.tile,
        {
          borderColor: isSelected ? primaryColor : borderColor + "55",
          backgroundColor: isSelected
            ? primaryColor + "12"
            : "rgba(255,255,255,0.04)",
          opacity: pressed ? 0.92 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
    >
      {badgeText ? (
        <View
          style={[styles.tileBadge, { backgroundColor: primaryColor }]}
          pointerEvents="none"
        >
          <TText style={styles.tileBadgeText}>{badgeText}</TText>
        </View>
      ) : null}
      <View style={styles.tileTopRow}>
        <TText
          style={[
            styles.tileLabel,
            { color: isSelected ? textColor : secondaryColor },
          ]}
        >
          {label}
        </TText>
        <Ionicons
          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
          size={18}
          color={isSelected ? primaryColor : secondaryColor + "AA"}
        />
      </View>
      <View style={styles.tilePriceRow}>
        <TText
          style={[
            styles.tilePrice,
            { color: isSelected ? textColor : secondaryColor },
          ]}
        >
          {priceStr}
        </TText>
        {suffix ? (
          <TText
            style={[
              styles.tileSuffix,
              { color: isSelected ? secondaryColor : secondaryColor + "AA" },
            ]}
          >
            {suffix}
          </TText>
        ) : null}
      </View>
      {caption ? (
        <TText
          style={[styles.tileCaption, { color: secondaryColor + "CC" }]}
          numberOfLines={1}
        >
          {caption}
        </TText>
      ) : null}
    </Pressable>
  );
}

function FooterIconButton({
  icon,
  label,
  onPress,
  color,
  testID,
  disabled,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  color: string;
  testID?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="link"
      accessibilityLabel={label}
      style={[styles.footerIconButton, disabled && { opacity: 0.45 }]}
      testID={testID}
    >
      <Ionicons name={icon} size={18} color={color} />
      <TText style={[styles.footerIconLabel, { color }]} numberOfLines={2}>
        {label}
      </TText>
    </Pressable>
  );
}

function WhyTile({
  icon,
  iconColor,
  title,
  subtitle,
  textColor,
  secondaryColor,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  subtitle: string;
  textColor: string;
  secondaryColor: string;
}) {
  return (
    <View style={styles.whyRow}>
      <View
        style={[styles.whyIconBubble, { backgroundColor: iconColor + "22" }]}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.whyTextWrap}>
        <TText style={[styles.whyTitle, { color: textColor }]}>{title}</TText>
        <TText style={[styles.whySub, { color: secondaryColor }]}>
          {subtitle}
        </TText>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────

export default function PaywallScreen() {
  const { theme } = useTheme();
  const { t, language } = useAppTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const rawModeParam = useLocalSearchParams<{ mode?: string | string[] }>()
    .mode;

  const paywallMode = parsePaywallRouteMode(rawModeParam);
  const isGateMode = paywallMode === "gate";
  const isUpgradeMode = paywallMode === "upgrade";
  const isOnboardingMode = paywallMode === "onboarding";

  const modeCfg = useMemo(
    () => getModeConfig(paywallMode, theme.colors.primary),
    [paywallMode, theme.colors.primary],
  );

  const { user: _user } = useAuth();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [openingModal, setOpeningModal] = useState<
    null | "manage-account" | "privacy" | "terms"
  >(null);
  const {
    restorePurchases,
    packages,
    purchasePackage,
    isLoadingOfferings,
    fetchOfferings,
    offerings,
    activeOffering,
  } = useRevenueCat();
  const markPaywallSeen = useSubscriptionStore((s) => s.markPaywallSeen);

  // Diagnostics
  useEffect(() => {
    if (!__DEV__) return;
    logger.log("[Paywall] boot", {
      pathname,
      paywallMode,
      pkgs: offerings?.current?.availablePackages?.length ?? null,
      validation:
        useSubscriptionStore.getState().rcValidationStatus ?? null,
    });
  }, [pathname, paywallMode, offerings?.current?.availablePackages?.length]);

  // CTA experiment exposure
  const ctaVariant = useExperiment("paywall_cta_default_v1");
  const exposureTracked = useRef(false);
  useEffect(() => {
    if (ctaVariant && !exposureTracked.current) {
      exposureTracked.current = true;
      trackExperimentExposure({
        experiment: "paywall_cta_default_v1",
        variant: ctaVariant,
        locale: language,
        screen: "paywall",
      });
    }
  }, [ctaVariant, language]);

  const [selectedPkgId, setSelectedPkgId] = useState<string | null>(null);

  const sorted = useMemo(
    () =>
      [...(packages ?? [])].sort((a: any, b: any) => {
        const ai = TIER_ORDER.indexOf(getTierKey(a));
        const bi = TIER_ORDER.indexOf(getTierKey(b));
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
      }),
    [packages],
  );

  const effectiveSelection =
    selectedPkgId ??
    sorted.find((p: any) => getTierKey(p) === "yearly")?.identifier ??
    sorted[0]?.identifier;
  const selectedProduct = sorted.find(
    (p: any) => p.identifier === effectiveSelection,
  );
  const selectedTier: TierKey = selectedProduct
    ? getTierKey(selectedProduct)
    : "yearly";
  const hasProducts = (offerings?.current?.availablePackages?.length ?? 0) > 0;

  // Dev fallback: only allowed in non-prod / non-staging dev builds.
  const allowProdFallback =
    !isGateMode &&
    !isUpgradeMode &&
    __DEV__ &&
    process.env.EXPO_PUBLIC_APP_ENV !== "production" &&
    process.env.EXPO_PUBLIC_APP_ENV !== "staging" &&
    process.env.EXPO_PUBLIC_ALLOW_PAYWALL_FALLBACK === "true";
  const isFallbackMode = allowProdFallback && !hasProducts;

  /** No packages from RC (after load or on error) — CTA must not stay disabled with misleading copy. */
  const noPackagesLoaded =
    !isFallbackMode && sorted.length === 0;

  // Compute fine-print under CTA based on selected tier.
  const ctaFinePrint = useMemo(() => {
    if (!selectedProduct) return null;
    const product = selectedProduct.product ?? selectedProduct.storeProduct;
    if (selectedTier === "yearly") {
      const display = getSubscriptionDisplay("yearly", product, {
        t,
        locale: language,
      });
      const monthly = display.yearlyPlanCardCaption?.replace("/mo", "");
      if (monthly) {
        return t("paywall.billedAnnually", { price: monthly });
      }
      return display.footerText;
    }
    if (selectedTier === "weekly") {
      return t("paywall.billedWeekly", {
        price: formatStorefrontPriceLabel(product),
      });
    }
    if (selectedTier === "monthly") {
      return t("paywall.billedMonthly", {
        price: formatStorefrontPriceLabel(product),
      });
    }
    return getSubscriptionDisplay(
      selectedTier === "other" ? "yearly" : selectedTier,
      product,
      { t, locale: language },
    ).footerText;
  }, [language, selectedProduct, selectedTier, t]);

  const ctaCopy = useMemo(() => {
    if (selectedTier === "yearly") return t("paywall.ctaYearly");
    return ctaVariant
      ? getPaywallCtaCopy(language, ctaVariant)
      : t("paywall.ctaDefault");
  }, [ctaVariant, language, selectedTier, t]);

  // ── Actions ────────────────────────────────────────────────────────────

  const closePaywall = useCallback(() => {
    if (isOnboardingMode) {
      router.push("/(onboarding)/complete" as any);
      return;
    }
    safeRouterBack(router, "/(tabs)", "paywall_close");
  }, [isOnboardingMode, router]);

  const goBack = useCallback(() => {
    safeRouterBack(router, "/(tabs)", "paywall_back");
  }, [router]);

  const handleSubscribe = useCallback(async () => {
    if (isPurchasing || !selectedProduct) return;
    if (ctaVariant && selectedTier !== "yearly") {
      trackExperimentClick({
        experiment: "paywall_cta_default_v1",
        variant: ctaVariant,
        locale: language,
        screen: "paywall",
      });
      trackExperimentConversion({
        experiment: "paywall_cta_default_v1",
        variant: ctaVariant,
        locale: language,
        screen: "paywall",
        conversion: "checkout_started",
      });
    }
    setIsPurchasing(true);
    try {
      const result = await purchasePackage(selectedProduct);
      if (result) {
        if (ctaVariant && selectedTier !== "yearly") {
          const product =
            selectedProduct.product ?? selectedProduct.storeProduct;
          trackExperimentConversion({
            experiment: "paywall_cta_default_v1",
            variant: ctaVariant,
            locale: language,
            screen: "paywall",
            conversion: "purchase_completed",
            revenue: product?.price,
            currency: product?.currencyCode,
          });
        }
        markPaywallSeen();
        if (isUpgradeMode) {
          router.replace("/(tabs)" as any);
        } else {
          router.push("/(onboarding)/complete" as any);
        }
      }
    } finally {
      setIsPurchasing(false);
    }
  }, [
    ctaVariant,
    isPurchasing,
    isUpgradeMode,
    language,
    markPaywallSeen,
    purchasePackage,
    router,
    selectedProduct,
    selectedTier,
  ]);

  const openLegal = useCallback(
    (url: string, title: string, traceKind: "privacy" | "terms") => {
      if (openingModal) return;
      setOpeningModal(traceKind);
      requestAnimationFrame(() => {
        tracedPushHref(
          {
            pathname: "/(modals)/web-viewer",
            params: {
              url: encodeURIComponent(url),
              title: encodeURIComponent(title),
            },
          },
          {
            source: `paywall.${traceKind}_cta`,
            pathname,
            segments,
          },
        );
        setTimeout(() => setOpeningModal(null), 800);
      });
    },
    [openingModal, pathname, segments],
  );

  const openManageAccount = useCallback(() => {
    if (openingModal) return;
    setOpeningModal("manage-account");
    requestAnimationFrame(() => {
      tracedPushHref(
        { pathname: "/(modals)/manage-account" },
        {
          source: "paywall.manage_account_cta",
          pathname,
          segments,
        },
      );
      setTimeout(() => setOpeningModal(null), 800);
    });
  }, [openingModal, pathname, segments]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <OnboardingBackground>
      <View style={styles.container}>
        {/* Sticky top bar */}
        <SafeAreaView edges={["top"]} style={styles.topBarSafe}>
          <View style={styles.topBar}>
            {modeCfg.showBack ? (
              <Pressable
                onPress={goBack}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("common.back")}
                testID="paywall-back"
              >
                <Ionicons
                  name="chevron-back"
                  size={26}
                  color={theme.colors.text}
                />
              </Pressable>
            ) : (
              <View style={styles.topBarSpacer} />
            )}
            {modeCfg.showClose ? (
              <Pressable
                onPress={closePaywall}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel={t("paywall.skip")}
                testID="paywall-close"
              >
                <Ionicons name="close" size={26} color={theme.colors.text} />
              </Pressable>
            ) : (
              <View style={styles.topBarSpacer} />
            )}
          </View>
        </SafeAreaView>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* Hero icon */}
          <Animated.View entering={FadeIn.duration(500)}>
            <HeroIcon
              icon={modeCfg.icon}
              color={modeCfg.iconColor}
              haloColor={modeCfg.iconHaloColor}
            />
          </Animated.View>

          {/* Title + subtitle */}
          <Animated.View entering={FadeInDown.duration(500).delay(80)}>
            <TText
              variant="heading"
              style={[styles.title, { color: theme.colors.text }]}
            >
              {t(modeCfg.titleKey)}
            </TText>
            <TText
              style={[styles.subtitle, { color: theme.colors.textSecondary }]}
            >
              {t(modeCfg.subtitleKey)}
            </TText>
          </Animated.View>

          {/* Value list */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(160)}
            style={[
              styles.valueCard,
              { backgroundColor: theme.colors.surfaceSecondary + "AA" },
            ]}
          >
            <ValueRow
              label={t("paywall.valueAi")}
              textColor={theme.colors.text}
              primaryColor={theme.colors.primary}
            />
            <ValueRow
              label={t("paywall.valueGoals")}
              textColor={theme.colors.text}
              primaryColor={theme.colors.primary}
            />
            <ValueRow
              label={t("paywall.valueTrends")}
              textColor={theme.colors.text}
              primaryColor={theme.colors.primary}
            />
            <ValueRow
              label={t("paywall.valueStreaks")}
              textColor={theme.colors.text}
              primaryColor={theme.colors.primary}
            />
          </Animated.View>

          {/* Pricing tiles */}
          <Animated.View entering={FadeInDown.duration(500).delay(220)}>
            {isFallbackMode ? (
              <View style={styles.fallbackBlock}>
                <TText
                  style={[styles.fallbackTitle, { color: theme.colors.text }]}
                >
                  Finalising subscriptions
                </TText>
                <TText
                  style={[
                    styles.fallbackSub,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  You&apos;re early — full access unlocked.
                </TText>
              </View>
            ) : isLoadingOfferings ? (
              <View style={styles.tilesLoading}>
                <ActivityIndicator
                  size="small"
                  color={theme.colors.primary}
                />
              </View>
            ) : sorted.length === 0 ? (
              <TText
                style={[
                  styles.tilesUnavailable,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {t("paywall.packagesUnavailable")}
              </TText>
            ) : (
              <View style={styles.tilesRow}>
                {sorted.map((pkg: any, i: number) => {
                  const tier = getTierKey(pkg);
                  const product = pkg.product ?? pkg.storeProduct;
                  const priceStr = formatStorefrontPriceLabel(product);
                  const yearlyCaption =
                    tier === "yearly"
                      ? getSubscriptionDisplay("yearly", product, {
                          t,
                          locale: language,
                        }).yearlyPlanCardCaption
                      : undefined;
                  return (
                    <PricingTile
                      key={pkg.identifier ?? `pkg-${i}`}
                      isSelected={pkg.identifier === effectiveSelection}
                      onSelect={() => setSelectedPkgId(pkg.identifier)}
                      label={getTierLabel(tier, t)}
                      priceStr={priceStr}
                      suffix={getTierSuffix(tier, t)}
                      caption={yearlyCaption}
                      badgeText={
                        tier === "yearly"
                          ? t("paywall.bestValueSave", { percent: 30 })
                          : undefined
                      }
                      primaryColor={theme.colors.primary}
                      textColor={theme.colors.text}
                      secondaryColor={theme.colors.textSecondary}
                      borderColor={theme.colors.border}
                    />
                  );
                })}
              </View>
            )}
          </Animated.View>

          {/* CTA */}
          <Animated.View entering={FadeInDown.duration(500).delay(280)}>
            {isFallbackMode ? (
              <Pressable
                testID="fallback-continue-cta"
                onPress={() => router.replace("/(tabs)")}
                style={({ pressed }) => [
                  styles.ctaPress,
                  { opacity: pressed ? 0.92 : 1 },
                ]}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaButton}
                >
                  <TText style={styles.ctaText}>Continue</TText>
                </LinearGradient>
              </Pressable>
            ) : noPackagesLoaded ? (
              <Pressable
                testID="paywall-retry-offerings"
                onPress={() => {
                  void fetchOfferings();
                }}
                disabled={isLoadingOfferings}
                style={({ pressed }) => [
                  styles.ctaPress,
                  {
                    opacity:
                      pressed || isLoadingOfferings ? 0.92 : 1,
                  },
                ]}
              >
                <LinearGradient
                  colors={[theme.colors.primary, theme.colors.accent]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.ctaButton}
                >
                  {isLoadingOfferings ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <TText style={styles.ctaText}>{t("common.retry")}</TText>
                  )}
                </LinearGradient>
              </Pressable>
            ) : (
              <Pressable
                testID="subscribe-cta"
                onPress={handleSubscribe}
                disabled={isPurchasing || !selectedProduct}
                style={({ pressed }) => [
                  styles.ctaPress,
                  {
                    opacity:
                      pressed || isPurchasing || !selectedProduct ? 0.92 : 1,
                  },
                ]}
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
                    <TText style={styles.ctaText}>{ctaCopy}</TText>
                  )}
                </LinearGradient>
              </Pressable>
            )}
          </Animated.View>

          {/* Fine print */}
          {ctaFinePrint ? (
            <TText
              style={[
                styles.finePrint,
                { color: theme.colors.textSecondary },
              ]}
              maxFontSizeMultiplier={1.35}
            >
              {ctaFinePrint}
            </TText>
          ) : null}

          {/* Footer icon row */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(320)}
            style={styles.footerIconRow}
          >
            <FooterIconButton
              icon="refresh"
              label={t("settings.restorePurchases")}
              color={theme.colors.textSecondary}
              onPress={restorePurchases}
              testID="paywall-restore"
              disabled={openingModal !== null}
            />
            {modeCfg.showManageAccountFooter ? (
              <FooterIconButton
                icon="person-circle-outline"
                label={t("settings.manageAccount")}
                color={theme.colors.textSecondary}
                onPress={openManageAccount}
                testID="paywall-manage-account"
                disabled={openingModal !== null}
              />
            ) : null}
            <FooterIconButton
              icon="shield-checkmark-outline"
              label={t("settings.privacyPolicy")}
              color={theme.colors.textSecondary}
              onPress={() =>
                openLegal(PRIVACY_URL, t("settings.privacyPolicy"), "privacy")
              }
              testID="paywall-privacy"
              disabled={openingModal !== null}
            />
            <FooterIconButton
              icon="document-text-outline"
              label={t("settings.termsOfService")}
              color={theme.colors.textSecondary}
              onPress={() =>
                openLegal(TERMS_URL, t("settings.termsOfService"), "terms")
              }
              testID="paywall-terms"
              disabled={openingModal !== null}
            />
          </Animated.View>

          {/* ── Below-fold supplementary content ───────────────────────── */}

          <View style={styles.sectionGap} />

          {/* Why go Premium */}
          <Animated.View entering={FadeIn.duration(400)}>
            <View
              style={[
                styles.whyCard,
                { backgroundColor: theme.colors.surfaceSecondary + "AA" },
              ]}
            >
              <TText
                style={[styles.whyHeadline, { color: theme.colors.text }]}
              >
                {t("paywall.whyHeadline")}
              </TText>
              <WhyTile
                icon="camera-outline"
                iconColor={theme.colors.primary}
                title={t("paywall.whySmarter")}
                subtitle={t("paywall.whySmarterSub")}
                textColor={theme.colors.text}
                secondaryColor={theme.colors.textSecondary}
              />
              <WhyTile
                icon="person-outline"
                iconColor="#60A5FA"
                title={t("paywall.whyPersonalized")}
                subtitle={t("paywall.whyPersonalizedSub")}
                textColor={theme.colors.text}
                secondaryColor={theme.colors.textSecondary}
              />
              <WhyTile
                icon="trending-up"
                iconColor="#A78BFA"
                title={t("paywall.whySeeProgress")}
                subtitle={t("paywall.whySeeProgressSub")}
                textColor={theme.colors.text}
                secondaryColor={theme.colors.textSecondary}
              />
              <WhyTile
                icon="flame-outline"
                iconColor="#F97316"
                title={t("paywall.whyStayMotivated")}
                subtitle={t("paywall.whyStayMotivatedSub")}
                textColor={theme.colors.text}
                secondaryColor={theme.colors.textSecondary}
              />
            </View>
          </Animated.View>

          <View style={styles.sectionGap} />

          {/* Single testimonial */}
          <Animated.View entering={FadeIn.duration(400)}>
            <GlassSurface
              variant="card"
              intensity="medium"
              style={styles.testimonialCard}
            >
              <View style={styles.testimonialStars}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <Ionicons
                    key={i}
                    name="star"
                    size={14}
                    color={theme.colors.primary}
                  />
                ))}
              </View>
              <TText
                style={[styles.testimonialQuote, { color: theme.colors.text }]}
              >
                {`"${t("paywall.testimonial5")}"`}
              </TText>
              <TText
                style={[
                  styles.testimonialAuthor,
                  { color: theme.colors.textSecondary },
                ]}
              >
                {`— ${t("paywall.testimonial5Author")}`}
              </TText>
            </GlassSurface>
          </Animated.View>

          <View style={styles.sectionGap} />

          {/* Trust — secure & private */}
          <Animated.View entering={FadeIn.duration(400)}>
            <View
              style={[
                styles.trustCard,
                { backgroundColor: theme.colors.surfaceSecondary + "AA" },
              ]}
            >
              <View style={styles.trustRow}>
                <View
                  style={[
                    styles.trustIconBubble,
                    { backgroundColor: theme.colors.primary + "22" },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark"
                    size={18}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <TText
                    style={[styles.trustTitle, { color: theme.colors.text }]}
                  >
                    {t("paywall.secureTitle")}
                  </TText>
                  <TText
                    style={[
                      styles.trustSub,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t("paywall.secureSub")}
                  </TText>
                </View>
              </View>
              <TText
                style={[
                  styles.billedThroughStore,
                  { color: theme.colors.textMuted },
                ]}
              >
                {t("paywall.billedThroughStore")}
              </TText>
            </View>
          </Animated.View>

          <View style={styles.sectionGap} />

          {/* You're in control — Manage Account CTA */}
          {modeCfg.showManageAccountFooter ? (
            <Animated.View entering={FadeIn.duration(400)}>
              <View
                style={[
                  styles.controlCard,
                  { backgroundColor: theme.colors.surfaceSecondary + "AA" },
                ]}
              >
                <View style={styles.controlTextWrap}>
                  <TText
                    style={[
                      styles.controlTitle,
                      { color: theme.colors.text },
                    ]}
                  >
                    {t("paywall.controlTitle")}
                  </TText>
                  <TText
                    style={[
                      styles.controlSub,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    {t("paywall.controlSub")}
                  </TText>
                </View>
                <Pressable
                  disabled={openingModal !== null}
                  onPress={openManageAccount}
                  style={({ pressed }) => [
                    styles.controlCta,
                    {
                      backgroundColor: theme.colors.primary,
                      opacity:
                        openingModal !== null
                          ? 0.45
                          : pressed
                            ? 0.92
                            : 1,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t("settings.manageAccount")}
                >
                  <TText style={styles.controlCtaText}>
                    {t("settings.manageAccount")}
                  </TText>
                </Pressable>
              </View>
            </Animated.View>
          ) : null}

          <View style={{ height: 36 }} />
        </ScrollView>
      </View>
    </OnboardingBackground>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const HERO_DIAMETER = 96;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBarSafe: {
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  topBarSpacer: {
    width: 26,
    height: 26,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },

  // Hero icon
  heroIconWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: HERO_DIAMETER + 56,
    marginTop: 4,
    marginBottom: 8,
  },
  heroHalo: {
    position: "absolute",
    width: HERO_DIAMETER + 56,
    height: HERO_DIAMETER + 56,
    borderRadius: (HERO_DIAMETER + 56) / 2,
  },
  heroHaloInner: {
    position: "absolute",
    width: HERO_DIAMETER + 24,
    height: HERO_DIAMETER + 24,
    borderRadius: (HERO_DIAMETER + 24) / 2,
  },
  heroIconBubble: {
    width: HERO_DIAMETER,
    height: HERO_DIAMETER,
    borderRadius: HERO_DIAMETER / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderWidth: 1,
  },

  // Title
  title: {
    fontSize: 30,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 36,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 8,
  },

  // Value list
  valueCard: {
    marginTop: 18,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  valueCheckBubble: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  valueLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
  },

  // Pricing tiles
  tilesRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    marginBottom: 4,
    overflow: "visible",
  },
  tilesLoading: {
    paddingVertical: 18,
    alignItems: "center",
  },
  tilesUnavailable: {
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
    paddingHorizontal: 12,
    paddingVertical: 18,
  },
  tile: {
    flex: 1,
    minHeight: 96,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 12,
    justifyContent: "space-between",
    overflow: "visible",
    position: "relative",
  },
  tileBadge: {
    position: "absolute",
    top: -10,
    left: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: "center",
    zIndex: 2,
  },
  tileBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  tileTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  tilePriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginTop: 6,
  },
  tilePrice: {
    fontSize: 18,
    fontWeight: "800",
  },
  tileSuffix: {
    fontSize: 11,
    fontWeight: "600",
  },
  tileCaption: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
  },

  // CTA
  ctaPress: {
    width: "100%",
    marginTop: 20,
  },
  ctaButton: {
    height: 52,
    borderRadius: 26,
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
  finePrint: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 12,
    paddingHorizontal: 8,
    lineHeight: 18,
  },

  // Footer icons
  footerIconRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    marginTop: 18,
    paddingHorizontal: 4,
  },
  footerIconButton: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
  },
  footerIconLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 14,
    maxWidth: 80,
  },

  // Section spacing for below-fold content
  sectionGap: {
    height: 28,
  },

  // Why card
  whyCard: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  whyHeadline: {
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 4,
  },
  whyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  whyIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  whyTextWrap: {
    flex: 1,
    gap: 2,
  },
  whyTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  whySub: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },

  // Testimonial
  testimonialCard: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  testimonialStars: {
    flexDirection: "row",
    gap: 2,
  },
  testimonialQuote: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
    fontStyle: "italic",
  },
  testimonialAuthor: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },

  // Trust card
  trustCard: {
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  trustIconBubble: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  trustTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  trustSub: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
    marginTop: 2,
  },
  billedThroughStore: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 8,
  },

  // Control card
  controlCard: {
    borderRadius: 16,
    padding: 16,
    flexDirection: SCREEN_WIDTH < 360 ? "column" : "row",
    alignItems: SCREEN_WIDTH < 360 ? "stretch" : "center",
    gap: 12,
  },
  controlTextWrap: {
    flex: 1,
    gap: 4,
  },
  controlTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  controlSub: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 17,
  },
  controlCta: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  controlCtaText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },

  // Fallback (dev only)
  fallbackBlock: {
    paddingVertical: 18,
    alignItems: "center",
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  fallbackSub: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 4,
  },
});
