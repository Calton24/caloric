/**
 * PricingSelector — Reusable pricing tier selector
 *
 * Renders RevenueCat packages as selectable cards with pricing psychology:
 * - Yearly tier highlighted as "Best value"
 * - Monthly as anchor (shows higher relative price)
 * - Lifetime as premium cap
 *
 * Used across all paywall surfaces (Entry, Soft, Feature Gate, Hard).
 */

import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/useTheme";
import { GlassSurface } from "../glass/GlassSurface";
import { TSpacer } from "../primitives/TSpacer";
import { TText } from "../primitives/TText";

interface PricingSelectorProps {
  packages: any[];
  isLoading: boolean;
  onPurchase: (pkg: any) => Promise<any>;
  /** Shown above the pricing cards */
  heading?: string;
}

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

function getTierSubtitle(
  pkg: any,
  tier: TierKey,
  allPackages: any[]
): string | null {
  const product = pkg.product ?? pkg.storeProduct;
  if (tier === "yearly") {
    const price = product?.price;
    if (typeof price === "number" && price > 0) {
      const symbol = getCurrencySymbol(product);
      const monthly = (price / 12).toFixed(2);
      // Calculate savings vs monthly
      const monthlyPkg = allPackages.find((p) => getTierKey(p) === "monthly");
      const monthlyProduct = monthlyPkg?.product ?? monthlyPkg?.storeProduct;
      const monthlyPrice = monthlyProduct?.price;
      let savingsText = "";
      if (typeof monthlyPrice === "number" && monthlyPrice > 0) {
        const pct = Math.round((1 - price / (monthlyPrice * 12)) * 100);
        if (pct > 0) savingsText = ` · Save ${pct}%`;
      }
      return `${symbol}${monthly}/mo — billed annually${savingsText}`;
    }
  }
  return null;
}

// Order: yearly (highlighted) → monthly
const TIER_ORDER: TierKey[] = ["yearly", "monthly"];

export function PricingSelector({
  packages,
  isLoading,
  onPurchase,
  heading = "Choose your plan",
}: PricingSelectorProps) {
  const { theme } = useTheme();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }

  if (packages.length === 0) return null;

  // Sort packages by desired tier order
  const sorted = [...packages].sort((a, b) => {
    const ai = TIER_ORDER.indexOf(getTierKey(a));
    const bi = TIER_ORDER.indexOf(getTierKey(b));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const handlePurchase = async (pkg: any) => {
    if (purchasingId) return;
    setPurchasingId(pkg.identifier);
    try {
      await onPurchase(pkg);
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <View>
      <TText style={[styles.heading, { color: theme.colors.text }]}>
        {heading}
      </TText>
      <TSpacer size="sm" />
      <View style={styles.tiersContainer}>
        {sorted.map((pkg) => {
          const tier = getTierKey(pkg);
          const product = pkg.product ?? pkg.storeProduct;
          const priceStr = product?.priceString ?? product?.price ?? "—";
          const label = getTierLabel(tier);
          const subtitle = getTierSubtitle(pkg, tier, sorted);
          const isYearly = tier === "yearly";
          const isBuying = purchasingId === pkg.identifier;

          return (
            <Pressable
              key={pkg.identifier}
              onPress={() => handlePurchase(pkg)}
              disabled={!!purchasingId}
              style={({ pressed }) => ({
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <GlassSurface
                intensity="light"
                style={[
                  styles.tierCard,
                  isYearly && {
                    borderWidth: 2,
                    borderColor: theme.colors.primary,
                  },
                  !isYearly && {
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                {isYearly && (
                  <View
                    style={[
                      styles.bestValueBadge,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <TText
                      style={[
                        styles.bestValueText,
                        { color: theme.colors.textInverse },
                      ]}
                    >
                      Best Value ✦
                    </TText>
                  </View>
                )}

                <View style={styles.tierContent}>
                  <View style={styles.tierInfo}>
                    <TText
                      style={[
                        styles.tierLabel,
                        { color: theme.colors.text },
                        isYearly && { fontWeight: "800" },
                      ]}
                    >
                      {label}
                    </TText>
                    {subtitle && (
                      <TText
                        style={[
                          styles.tierSubtitle,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        {subtitle}
                      </TText>
                    )}
                  </View>

                  {isBuying ? (
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                  ) : (
                    <View
                      style={[
                        styles.priceBadge,
                        {
                          backgroundColor: isYearly
                            ? theme.colors.primary
                            : theme.colors.surface,
                        },
                      ]}
                    >
                      <TText
                        style={[
                          styles.priceText,
                          {
                            color: isYearly
                              ? theme.colors.textInverse
                              : theme.colors.text,
                          },
                        ]}
                      >
                        {priceStr}
                      </TText>
                    </View>
                  )}
                </View>
              </GlassSurface>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    paddingVertical: 24,
    alignItems: "center",
  },
  heading: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  tiersContainer: {
    gap: 10,
  },
  tierCard: {
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
  },
  bestValueBadge: {
    position: "absolute",
    top: 0,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 1,
  },
  bestValueText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  tierContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  tierInfo: {
    flex: 1,
  },
  tierLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  tierSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  priceBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  priceText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
