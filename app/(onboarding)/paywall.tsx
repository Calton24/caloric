/**
 * Onboarding Step 11 — Entry Paywall (Day 0)
 *
 * Design: Day 1→21 animated progress track at top,
 * interactive feature showcase, Bevel-style pricing, gradient CTA.
 */

import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../src/features/auth/useAuth";
import { buildNewChallenge } from "../../src/features/challenge/challenge.service";
import { useChallengeStore } from "../../src/features/challenge/challenge.store";
import { createChallenge } from "../../src/features/challenge/challenge.sync";
import type { UserChallenge } from "../../src/features/challenge/challenge.types";
import { useSubscriptionStore } from "../../src/features/subscription/subscription.store";
import { useRevenueCat } from "../../src/features/subscription/useRevenueCat";
import { logger } from "../../src/logging/logger";
import { useTheme } from "../../src/theme/useTheme";
import { GlassSurface } from "../../src/ui/glass/GlassSurface";
import { TSpacer } from "../../src/ui/primitives/TSpacer";
import { TText } from "../../src/ui/primitives/TText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

// ── Feature showcase data ───────────────────────────────────────────────────

const FEATURES = [
  {
    emoji: "📸",
    title: "Snap & Log",
    subtitle: "AI-assisted calorie tracking",
    accent: "#34D399",
  },
  {
    emoji: "",
    icon: "trending-up" as const,
    title: "Smart Trends",
    subtitle: "Weekly macros, streaks & personalized insights",
    accent: "#60A5FA",
  },
  {
    emoji: "🏆",
    title: "21-Day Challenge",
    subtitle: "Daily goals that build real, lasting habits",
    accent: "#FBBF24",
  },
];

// ── Testimonials ───────────────────────────────────────────────────────────

const TESTIMONIALS = [
  {
    name: "Alex R.",
    text: "I didn't realise how much I was eating until this app broke it down. The AI scans are insane.",
    rating: 5,
  },
  {
    name: "Jennifer L.",
    text: "The daily challenges kept me motivated. Best investment I made.",
    rating: 5,
  },
  {
    name: "Mike T.",
    text: "Honestly just started to see what I was eating. Now I'm 3 months in and don't want to stop.",
    rating: 5,
  },
  {
    name: "Priya S.",
    text: "I've tried every tracker. This is the first one that didn't feel like homework. The camera is magic.",
    rating: 5,
  },
  {
    name: "Carlos R.",
    text: "The 21-day structure actually worked. I built a real habit without even thinking about it.",
    rating: 5,
  },
  {
    name: "Emily K.",
    text: "My relationship with food completely changed. I finally understand what I'm eating.",
    rating: 5,
  },
];

function TestimonialCarousel({
  textColor,
  secondaryColor,
  primaryColor,
}: {
  textColor: string;
  secondaryColor: string;
  primaryColor: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const interval = setInterval(() => {
      opacity.value = withSequence(
        withTiming(0, { duration: 200 }),
        withTiming(1, { duration: 300 })
      );
      setActiveIdx((prev) => (prev + 1) % TESTIMONIALS.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [opacity]);

  const fadeStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const testimonial = TESTIMONIALS[activeIdx];

  return (
    <GlassSurface
      variant="card"
      intensity="light"
      style={{
        borderRadius: 16,
        padding: 16,
        minHeight: 100,
      }}
    >
      <Animated.View style={fadeStyle}>
        <View style={{ flexDirection: "row", marginBottom: 8 }}>
          {[...Array(testimonial.rating)].map((_, i) => (
            <TText key={i} style={{ color: primaryColor, fontSize: 14 }}>
              ★
            </TText>
          ))}
        </View>
        <TText
          style={{
            fontSize: 14,
            lineHeight: 20,
            color: textColor,
            marginBottom: 8,
            fontStyle: "italic",
          }}
        >
          {`"${testimonial.text}"`}
        </TText>
        <TText
          style={{
            fontSize: 12,
            fontWeight: "600",
            color: secondaryColor,
          }}
        >
          — {testimonial.name}
        </TText>
      </Animated.View>
    </GlassSurface>
  );
}

// ── Day 1→21 looping progress track ────────────────────────────────────────

const MILESTONES = [1, 7, 14, 21];
const TOTAL_DAYS = 21;
const TRACK_PADDING = 32;
const MILESTONE_SIZE = 20;

function DayProgressTrack({ primaryColor }: { primaryColor: string }) {
  const trackWidth = SCREEN_WIDTH - TRACK_PADDING * 2;
  const fillProgress = useSharedValue(0);
  const [reachedDay, setReachedDay] = useState(0);

  useEffect(() => {
    const stops = MILESTONES.map((d) => (d - 1) / (TOTAL_DAYS - 1));
    const segDurations = [1200, 1400, 1600, 1800];

    const runLoop = () => {
      fillProgress.value = 0;
      runOnJS(setReachedDay)(0);

      fillProgress.value = withSequence(
        withTiming(stops[0], {
          duration: segDurations[0],
          easing: Easing.out(Easing.cubic),
        }),
        withDelay(
          300,
          withTiming(stops[1], {
            duration: segDurations[1],
            easing: Easing.inOut(Easing.cubic),
          })
        ),
        withDelay(
          300,
          withTiming(stops[2], {
            duration: segDurations[2],
            easing: Easing.inOut(Easing.cubic),
          })
        ),
        withDelay(
          300,
          withTiming(stops[3], {
            duration: segDurations[3],
            easing: Easing.inOut(Easing.cubic),
          })
        ),
        withDelay(
          1500,
          withTiming(0, { duration: 600, easing: Easing.in(Easing.cubic) })
        )
      );
    };

    const startTimer = setTimeout(runLoop, 600);
    const loopTimer = setInterval(runLoop, 10200);

    return () => {
      clearTimeout(startTimer);
      clearInterval(loopTimer);
      cancelAnimation(fillProgress);
    };
  }, [fillProgress]);

  // Track reached milestones for visual feedback
  useEffect(() => {
    const stops = MILESTONES.map((d) => (d - 1) / (TOTAL_DAYS - 1));
    const interval = setInterval(() => {
      const pct = fillProgress.value;
      let reached = 0;
      for (let i = 0; i < stops.length; i++) {
        if (pct >= stops[i] - 0.01) reached = i + 1;
      }
      setReachedDay(reached);
    }, 100);
    return () => clearInterval(interval);
  }, [fillProgress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: fillProgress.value * trackWidth,
  }));

  return (
    <Animated.View entering={FadeIn.duration(600).delay(200)}>
      <View style={trackStyles.container}>
        <View
          style={[
            trackStyles.track,
            { backgroundColor: primaryColor + "20", width: trackWidth },
          ]}
        >
          <Animated.View
            style={[
              trackStyles.fill,
              fillStyle,
              { backgroundColor: primaryColor },
            ]}
          />
          <Animated.View
            style={[
              trackStyles.fill,
              trackStyles.fillGlow,
              fillStyle,
              { backgroundColor: primaryColor + "60" },
            ]}
          />
        </View>

        <View style={[trackStyles.markersRow, { width: trackWidth }]}>
          {MILESTONES.map((day, idx) => {
            const pct = (day - 1) / (TOTAL_DAYS - 1);
            const isReached = idx < reachedDay;
            return (
              <View
                key={day}
                style={[
                  trackStyles.milestoneWrap,
                  { left: pct * (trackWidth - MILESTONE_SIZE) },
                ]}
              >
                <View
                  style={[
                    trackStyles.milestoneDot,
                    {
                      backgroundColor: isReached
                        ? primaryColor
                        : primaryColor + "25",
                      borderColor: isReached
                        ? primaryColor
                        : primaryColor + "40",
                    },
                  ]}
                >
                  {isReached && (
                    <Ionicons name="checkmark" size={10} color="#fff" />
                  )}
                </View>
                <TText
                  style={[
                    trackStyles.milestoneLabel,
                    {
                      color: isReached
                        ? primaryColor
                        : "rgba(255,255,255,0.40)",
                      fontWeight: isReached ? "700" : "500",
                    },
                  ]}
                >
                  Day {day}
                </TText>
              </View>
            );
          })}
        </View>
      </View>
    </Animated.View>
  );
}

const trackStyles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 8 },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    position: "relative",
  },
  fill: { position: "absolute", left: 0, top: 0, height: 6, borderRadius: 3 },
  fillGlow: { top: -2, height: 10, borderRadius: 5, opacity: 0.4 },
  markersRow: { height: 44, position: "relative", marginTop: 6 },
  milestoneWrap: {
    position: "absolute",
    alignItems: "center",
    width: MILESTONE_SIZE,
  },
  milestoneDot: {
    width: MILESTONE_SIZE,
    height: MILESTONE_SIZE,
    borderRadius: MILESTONE_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneLabel: { fontSize: 10, marginTop: 4, letterSpacing: 0.2 },
});

// ── Interactive Feature Showcase ───────────────────────────────────────────

function FeatureShowcase({
  primaryColor,
  surfaceColor,
  textColor,
  secondaryColor,
  borderColor,
}: {
  primaryColor: string;
  surfaceColor: string;
  textColor: string;
  secondaryColor: string;
  borderColor: string;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const emojiScale = useSharedValue(1);
  const textOpacity = useSharedValue(1);

  const startAutoplay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % FEATURES.length);
    }, 4000);
  }, []);

  useEffect(() => {
    startAutoplay();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startAutoplay]);

  // Animate on index change
  useEffect(() => {
    emojiScale.value = withSequence(
      withTiming(0.7, { duration: 120 }),
      withSpring(1.15, { damping: 6, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    textOpacity.value = withSequence(
      withTiming(0, { duration: 100 }),
      withTiming(1, { duration: 300 })
    );
  }, [activeIdx, emojiScale, textOpacity]);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));
  const fadeStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const feature = FEATURES[activeIdx];

  return (
    <View
      style={[
        showcaseStyles.container,
        { backgroundColor: "transparent", borderWidth: 0 },
      ]}
    >
      <Animated.View style={[showcaseStyles.emojiWrap, emojiStyle]}>
        {feature.icon ? (
          <Ionicons name={feature.icon} size={48} color={feature.accent} />
        ) : (
          <TText style={showcaseStyles.emoji}>{feature.emoji}</TText>
        )}
      </Animated.View>

      <Animated.View style={fadeStyle}>
        <TText style={[showcaseStyles.title, { color: textColor }]}>
          {feature.title}
        </TText>
        <TText style={[showcaseStyles.subtitle, { color: secondaryColor }]}>
          {feature.subtitle}
        </TText>
      </Animated.View>
    </View>
  );
}

const showcaseStyles = StyleSheet.create({
  container: {
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emojiWrap: { marginBottom: 8 },
  emoji: { fontSize: 36 },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  dot: { height: 8, borderRadius: 4 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 2,
  },
  subtitle: { fontSize: 13, fontWeight: "500", textAlign: "center" },
});

// ── Animated pricing card ──────────────────────────────────────────────────

function SimplePricingButton({
  isSelected,
  onSelect,
  label,
  priceStr,
  badgeText,
  primaryColor,
  borderColor,
  bgColor,
  textColor,
  secondaryColor,
}: {
  isSelected: boolean;
  onSelect: () => void;
  label: string;
  priceStr: string;
  badgeText?: string;
  primaryColor: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  secondaryColor: string;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={{
        flex: 1,
        height: 80,
        overflow: "visible",
      }}
    >
      {/* Badge OUTSIDE GlassSurface to avoid overflow:hidden clipping */}
      {badgeText && (
        <View
          style={{
            position: "absolute",
            top: -12,
            left: 0,
            right: 0,
            alignItems: "center",
            zIndex: 20,
            elevation: 20,
          }}
        >
          <View
            style={{
              backgroundColor: primaryColor,
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 6,
            }}
          >
            <TText style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>
              {badgeText}
            </TText>
          </View>
        </View>
      )}
      <GlassSurface
        variant="card"
        intensity={isSelected ? "strong" : "medium"}
        border={isSelected}
        style={{
          flex: 1,
          borderRadius: 14,
          borderWidth: isSelected ? 1.5 : 0.5,
          borderColor: isSelected ? primaryColor : borderColor + "40",
          paddingHorizontal: 10,
          paddingVertical: 8,
          justifyContent: "center",
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 4,
          }}
        >
          <TText
            style={{
              fontSize: 13,
              fontWeight: "600",
              color: isSelected ? textColor : secondaryColor,
            }}
          >
            {label}
          </TText>
          <Ionicons
            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
            size={20}
            color={isSelected ? primaryColor : secondaryColor + "80"}
          />
        </View>
        <TText
          style={{
            fontSize: 17,
            fontWeight: "800",
            color: isSelected ? textColor : secondaryColor,
          }}
        >
          {priceStr}
        </TText>
      </GlassSurface>
    </Pressable>
  );
}

export default function OnboardingChallengeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();
  const setChallenge = useChallengeStore((s) => s.setChallenge);
  const existingChallenge = useChallengeStore((s) => s.challenge);
  const [isStarting, setIsStarting] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const {
    restorePurchases,
    isPro,
    packages,
    purchasePackage,
    isLoadingOfferings,
  } = useRevenueCat();
  const markPaywallSeen = useSubscriptionStore((s) => s.markPaywallSeen);

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

  // ── Subscribe: purchase selected plan via RevenueCat ──
  const handleSubscribe = async () => {
    if (isPurchasing || !selectedProduct) return;
    setIsPurchasing(true);
    try {
      const result = await purchasePackage(selectedProduct);
      if (result) {
        // Purchase succeeded → advance to complete
        markPaywallSeen();
        router.push("/(onboarding)/complete" as any);
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  // ── Free 21-day challenge (no purchase) ──
  const handleStartChallenge = async () => {
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
      markPaywallSeen();

      createChallenge(challenge).catch((e) =>
        logger.warn("[Challenge] Supabase insert failed:", e)
      );

      router.push("/(onboarding)/complete" as any);
    } finally {
      setIsStarting(false);
    }
  };

  const handleSkip = () => {
    markPaywallSeen();
    router.push("/(onboarding)/complete" as any);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* ══ HERO IMAGE ══ */}
      <View style={styles.heroContainer}>
        <Image
          source={require("../../assets/images/paywall-hero.jpg")}
          style={styles.heroImage}
          resizeMode="cover"
        />
        {/* Gradient overlay for smooth fade */}
        <LinearGradient
          colors={[
            "rgba(0,0,0,0.3)",
            "rgba(0,0,0,0.5)",
            "rgba(0,0,0,0.8)",
            theme.colors.background,
          ]}
          style={styles.heroOverlay}
        />
      </View>

      {/* ══ TOP — gradient + headline + progress track ══ */}
      <LinearGradient
        colors={[
          theme.colors.primary + "30",
          theme.colors.accent + "12",
          theme.colors.background,
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGradient}
      >
        <SafeAreaView edges={["top"]}>
          <Animated.View entering={FadeInDown.duration(600).delay(100)}>
            <TText
              variant="heading"
              style={[styles.headline, { color: theme.colors.text }]}
            >
              Your 21-Day Challenge
            </TText>
            <TText
              style={[
                styles.subheadline,
                { color: theme.colors.textSecondary },
              ]}
            >
              Build healthy habits — upgrade anytime
            </TText>
          </Animated.View>

          <TSpacer size="xs" />
          <DayProgressTrack primaryColor={theme.colors.primary} />
          <TSpacer size="xs" />
        </SafeAreaView>
      </LinearGradient>

      {/* ══ MIDDLE — challenge → movement (subtle) → testimonial ══ */}
      <View style={styles.middleArea}>
        <Animated.View entering={FadeInDown.duration(500).delay(400)}>
          <FeatureShowcase
            primaryColor={theme.colors.primary}
            surfaceColor={theme.colors.surface}
            textColor={theme.colors.text}
            secondaryColor={theme.colors.textSecondary}
            borderColor={theme.colors.border}
          />
        </Animated.View>

        <TSpacer size="xs" />

        {/* Testimonial first — social proof before ask */}
        <Animated.View
          entering={FadeInDown.duration(500).delay(460)}
          style={{ width: "100%" }}
        >
          <TestimonialCarousel
            textColor={theme.colors.text}
            secondaryColor={theme.colors.textSecondary}
            primaryColor={theme.colors.primary}
          />
        </Animated.View>

        <TSpacer size="xs" />

        {/* Movement card — subtle, below social proof */}
        <Animated.View entering={FadeInDown.duration(500).delay(520)}>
          <GlassSurface
            variant="card"
            intensity="medium"
            style={styles.movementCard}
          >
            <View style={styles.movementRow}>
              <TText style={styles.movementFire}>🔥</TText>
              <View style={styles.movementTextBlock}>
                <TText
                  style={[
                    styles.movementHeadline,
                    { color: theme.colors.text },
                  ]}
                >
                  Join the 21-Day Movement
                </TText>
                <TText
                  style={[
                    styles.movementSub,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  1,200+ users started this week
                </TText>
              </View>
            </View>
            <TText
              style={[
                styles.movementHashtag,
                { color: theme.colors.textMuted },
              ]}
            >
              Share your progress with{" "}
              <TText
                style={[
                  styles.movementHashtagAccent,
                  { color: theme.colors.primary },
                ]}
              >
                #21DayCaloric
              </TText>{" "}
              — stay accountable, inspire others.
            </TText>
          </GlassSurface>
        </Animated.View>
      </View>

      {/* ══ BOTTOM — pricing + CTAs + footer (natural height) ══ */}
      <Animated.View
        entering={FadeInUp.duration(500).delay(600)}
        style={styles.bottomArea}
      >
        {/* Pricing row */}
        {isLoadingOfferings ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : sorted.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              gap: 10,
              marginTop: 18,
              marginBottom: 8,
              overflow: "visible",
              paddingTop: 2,
            }}
          >
            {sorted.map((pkg) => {
              const tier = getTierKey(pkg);
              const product = pkg.product ?? pkg.storeProduct;
              const priceStr = product?.priceString ?? product?.price ?? "—";
              return (
                <SimplePricingButton
                  key={pkg.identifier}
                  isSelected={pkg.identifier === effectiveSelection}
                  onSelect={() => setSelectedPkg(pkg.identifier)}
                  label={getTierLabel(tier)}
                  priceStr={priceStr}
                  badgeText={
                    tier === "yearly" ? "Best value — save 30%" : undefined
                  }
                  primaryColor={theme.colors.primary}
                  borderColor={theme.colors.border}
                  bgColor={theme.colors.surface}
                  secondaryColor={theme.colors.textSecondary}
                  textColor={theme.colors.text}
                />
              );
            })}
          </View>
        ) : null}

        {/* Subscribe CTA */}
        <Pressable
          testID="subscribe-cta"
          onPress={handleSubscribe}
          disabled={isPurchasing || !selectedProduct}
          style={({ pressed }) => ({
            opacity: pressed || isPurchasing ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            width: "100%",
            marginTop: 6,
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
              <TText style={styles.ctaText}>
                {selectedTier === "lifetime"
                  ? "Unlock Lifetime Access"
                  : "Unlock Full Experience"}
              </TText>
            )}
          </LinearGradient>
        </Pressable>

        {/* Billing context */}
        {effectiveSelection && (
          <TText
            style={[styles.billingContext, { color: theme.colors.textMuted }]}
          >
            {selectedTier === "yearly"
              ? `${selectedPrice} billed annually · Cancel anytime`
              : selectedTier === "monthly"
                ? `${selectedPrice}/month · Cancel anytime`
                : `One-time purchase · Yours forever`}
          </TText>
        )}

        {/* 21-day challenge CTA */}
        <Pressable
          testID="challenge-start"
          onPress={handleStartChallenge}
          disabled={isStarting || !!existingChallenge}
          style={({ pressed }) => ({
            opacity: pressed || isStarting ? 0.85 : existingChallenge ? 0.4 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
            width: "100%",
            marginTop: 6,
          })}
        >
          <View
            style={[
              styles.secondaryCta,
              {
                borderColor:
                  (existingChallenge
                    ? theme.colors.textMuted
                    : theme.colors.primary) + "50",
              },
            ]}
          >
            {isStarting ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <TText
                style={[
                  styles.secondaryCtaText,
                  {
                    color: existingChallenge
                      ? theme.colors.textMuted
                      : theme.colors.primary,
                  },
                ]}
              >
                {existingChallenge
                  ? "21-day challenge claimed"
                  : "Start free 21-day challenge"}
              </TText>
            )}
          </View>
        </Pressable>

        {/* Footer */}
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
    justifyContent: "space-between",
  },

  // Hero image
  heroContainer: {
    position: "absolute",
    top: 180, // Position below headline and progress track
    left: 20,
    right: 20,
    height: SCREEN_WIDTH * 0.65, // Slightly smaller for better centering
    borderRadius: 24,
    overflow: "hidden",
    zIndex: 0,
  },
  heroImage: {
    width: "100%",
    height: "100%",
    borderRadius: 24,
  },
  heroOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  // Top gradient area
  topGradient: {
    paddingBottom: 4,
  },
  closeRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  headline: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 30,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },

  // Content
  middleArea: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },

  // Pricing (Bevel-style horizontal cards)
  movementCard: {
    borderRadius: 16,
    padding: 12,
    gap: 6,
  },
  movementRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  movementFire: {
    fontSize: 32,
    textShadowColor: "rgba(255, 100, 0, 0.6)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  movementTextBlock: {
    flex: 1,
    gap: 2,
  },
  movementHeadline: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  movementSub: {
    fontSize: 12,
    fontWeight: "500",
  },
  movementHashtag: {
    fontSize: 12,
    lineHeight: 18,
  },
  movementHashtagAccent: {
    fontSize: 12,
    fontWeight: "700",
  },
  pricingRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
    overflow: "visible",
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
    borderRadius: 14,
    overflow: "hidden",
  },
  pricingCardInner: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 10,
    width: "100%",
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  pricingLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  pricingPrice: {
    fontSize: 17,
    fontWeight: "800",
  },

  // Bottom
  bottomArea: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
    alignItems: "center",
    overflow: "visible",
  },
  ctaButton: {
    height: 48,
    borderRadius: 24,
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
  secondaryCta: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  secondaryCtaText: {
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.2,
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
    marginTop: 10,
  },
  footerLink: {
    fontSize: 13,
    fontWeight: "500",
  },
  footerDot: {
    fontSize: 13,
  },
});
