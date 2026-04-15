/**
 * SoftPaywall — Dismissible, value-driven upgrade prompt
 *
 * Triggered after behavioral milestones (scan count, streak days).
 * Shows what the user just did + what they'd get with Pro.
 * Always dismissible — builds desire, never blocks.
 */

import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { useRevenueCat } from "../../features/subscription/useRevenueCat";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";
import { PricingSelector } from "./PricingSelector";

export type SoftPaywallTrigger =
  | "streak_milestone"
  | "scan_milestone"
  | "insight_preview";

interface SoftPaywallProps {
  visible: boolean;
  onDismiss: () => void;
  trigger: SoftPaywallTrigger;
  /** e.g. streak day count or scan count */
  milestoneValue?: number;
}

const TRIGGER_CONTENT: Record<
  SoftPaywallTrigger,
  { icon: keyof typeof Ionicons.glyphMap; headline: string; body: string }
> = {
  streak_milestone: {
    icon: "flame-outline",
    headline: "You're building a habit!",
    body: "Upgrade to unlock detailed trends, unlimited AI scans, and personalized insights.",
  },
  scan_milestone: {
    icon: "scan-outline",
    headline: "See your full nutrition breakdown",
    body: "You've been scanning consistently. Go Pro for unlimited scans and macro tracking.",
  },
  insight_preview: {
    icon: "bulb-outline",
    headline: "Your insights are ready",
    body: "We've spotted patterns in your meals. Upgrade to see detailed analysis and recommendations.",
  },
};

export function SoftPaywall({
  visible,
  onDismiss,
  trigger,
  milestoneValue,
}: SoftPaywallProps) {
  const { theme } = useTheme();
  const { packages, isLoadingOfferings, purchasePackage, restorePurchases } =
    useRevenueCat();

  const content = TRIGGER_CONTENT[trigger];

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
          {/* ── Icon + Milestone ── */}
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
                name={content.icon}
                size={36}
                color={theme.colors.primary}
              />
            </View>
            {milestoneValue != null && (
              <View
                style={[
                  styles.milestoneBadge,
                  { backgroundColor: theme.colors.success + "22" },
                ]}
              >
                <TText
                  style={[
                    styles.milestoneText,
                    { color: theme.colors.success },
                  ]}
                >
                  {trigger === "streak_milestone"
                    ? `${milestoneValue}-day streak 🔥`
                    : `${milestoneValue} scans`}
                </TText>
              </View>
            )}
          </Animated.View>

          <TSpacer size="lg" />

          {/* ── Headline + Body ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(200)}>
            <TText
              variant="heading"
              style={[styles.headline, { color: theme.colors.text }]}
            >
              {content.headline}
            </TText>
            <TSpacer size="sm" />
            <TText style={[styles.body, { color: theme.colors.textSecondary }]}>
              {content.body}
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Pro benefits ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <GlassSurface intensity="light" style={styles.benefitsCard}>
              {[
                {
                  icon: "infinite-outline" as const,
                  text: "Unlimited AI scans",
                },
                {
                  icon: "bar-chart-outline" as const,
                  text: "Detailed macro trends",
                },
                {
                  icon: "sparkles-outline" as const,
                  text: "Personalized recommendations",
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
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <PricingSelector
              packages={packages}
              isLoading={isLoadingOfferings}
              onPurchase={async (pkg) => {
                await purchasePackage(pkg);
                onDismiss();
              }}
              heading="Choose your plan"
            />
          </Animated.View>

          <TSpacer size="lg" />
        </ScrollView>

        {/* ── Bottom actions ── */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(500)}
          style={styles.bottomArea}
        >
          <Pressable onPress={onDismiss} style={styles.maybeLater}>
            <TText
              style={[styles.maybeLaterText, { color: theme.colors.textMuted }]}
            >
              Maybe later
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
  topBar: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.3)",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 10,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  iconArea: {
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  milestoneBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  milestoneText: {
    fontSize: 14,
    fontWeight: "700",
  },
  headline: {
    fontSize: 26,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 34,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 12,
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
  bottomArea: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
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
});
