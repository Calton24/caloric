/**
 * FeatureGatePaywall — Action-triggered premium gate
 *
 * Shown when the user taps a specific premium feature they can't access.
 * Contextual messaging tells them exactly what they'll unlock.
 * Compact sheet format — focused on the single feature + upgrade path.
 */

import { Ionicons } from "@expo/vector-icons";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
} from "react-native-reanimated";
import { useRevenueCat } from "../../features/subscription/useRevenueCat";
import { useAppTranslation } from "../../infrastructure/i18n/useAppTranslation";
import { useTheme } from "../../theme/useTheme";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";
import { PricingSelector } from "./PricingSelector";

export type GatedFeature =
  | "unlimited_scans"
  | "macro_trends"
  | "ai_insights"
  | "export_data"
  | "custom_goals";

interface FeatureGatePaywallProps {
  visible: boolean;
  onDismiss: () => void;
  feature: GatedFeature;
}

const FEATURE_CONTENT: Record<
  GatedFeature,
  {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    description: string;
  }
> = {
  unlimited_scans: {
    icon: "scan-outline",
    title: "Unlimited AI Scans",
    description:
      "Scan any meal instantly with AI. No daily limits, no waiting.",
  },
  macro_trends: {
    icon: "bar-chart-outline",
    title: "Macro Trends",
    description:
      "See how your protein, carbs, and fat intake change week over week.",
  },
  ai_insights: {
    icon: "sparkles-outline",
    title: "AI Insights",
    description:
      "Get personalized recommendations based on your eating patterns.",
  },
  export_data: {
    icon: "download-outline",
    title: "Export Your Data",
    description:
      "Download your nutrition history as CSV or share with your coach.",
  },
  custom_goals: {
    icon: "options-outline",
    title: "Custom Goals",
    description:
      "Set specific calorie and macro targets tailored to your needs.",
  },
};

export function FeatureGatePaywall({
  visible,
  onDismiss,
  feature,
}: FeatureGatePaywallProps) {
  const { theme } = useTheme();
  const { t } = useAppTranslation();
  const { packages, isLoadingOfferings, purchasePackage, restorePurchases } =
    useRevenueCat();

  const content = FEATURE_CONTENT[feature];

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
        {/* ── Top bar ── */}
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
          {/* ── Feature spotlight ── */}
          <Animated.View
            entering={FadeInDown.duration(500).delay(100)}
            style={styles.spotlightArea}
          >
            <View
              style={[
                styles.lockCircle,
                { backgroundColor: theme.colors.warning + "20" },
              ]}
            >
              <Ionicons
                name="lock-closed"
                size={28}
                color={theme.colors.warning}
              />
            </View>

            <TSpacer size="md" />

            <TText
              variant="heading"
              style={[styles.title, { color: theme.colors.text }]}
            >
              {content.title}
            </TText>

            <TSpacer size="xs" />

            <TText
              style={[
                styles.description,
                { color: theme.colors.textSecondary },
              ]}
            >
              {content.description}
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Feature icon (unlocked state preview) ── */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(200)}
            style={styles.previewRow}
          >
            <View
              style={[
                styles.previewIcon,
                { backgroundColor: theme.colors.primary + "15" },
              ]}
            >
              <Ionicons
                name={content.icon}
                size={32}
                color={theme.colors.primary}
              />
            </View>
            <TText
              style={[
                styles.previewLabel,
                { color: theme.colors.textSecondary },
              ]}
            >
              {t("paywall.includedWithPlan")}
            </TText>
          </Animated.View>

          <TSpacer size="xl" />

          {/* ── Pricing ── */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <PricingSelector
              packages={packages}
              isLoading={isLoadingOfferings}
              onPurchase={async (pkg) => {
                await purchasePackage(pkg);
                onDismiss();
              }}
              heading="Unlock with Pro"
            />
          </Animated.View>

          <TSpacer size="lg" />
        </ScrollView>

        {/* ── Bottom ── */}
        <Animated.View
          entering={FadeInUp.duration(400).delay(400)}
          style={styles.bottomArea}
        >
          <Pressable onPress={onDismiss} style={styles.notNow}>
            <TText
              style={[styles.notNowText, { color: theme.colors.textMuted }]}
            >
              {t("common.notNow")}
            </TText>
          </Pressable>

          <Pressable onPress={restorePurchases} hitSlop={12}>
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
    paddingTop: 16,
  },
  spotlightArea: {
    alignItems: "center",
  },
  lockCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: 16,
  },
  previewRow: {
    alignItems: "center",
    gap: 8,
  },
  previewIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  previewLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  bottomArea: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  notNow: {
    paddingVertical: 8,
  },
  notNowText: {
    fontSize: 15,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  restoreText: {
    fontSize: 12,
    textDecorationLine: "underline",
  },
});
