import {
  formatMonthlyBillFromAnnual,
  formatStorefrontPriceLabel,
  getSubscriptionDisplay,
  normalizeUsdMarketingSymbol,
} from "../src/lib/billing/subscription-display";

function mockT(
  templates: Record<string, string>,
): (key: string, params?: Record<string, string | number>) => string {
  return (key: string, params?: Record<string, string | number>) => {
    let s = templates[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        s = s.replaceAll(`{{${k}}}`, String(v));
      }
    }
    return s;
  };
}

describe("subscription-display", () => {
  const t = mockT({
    "paywall.billingFooterWeekly": "{{price}}/week · Cancel anytime",
    "paywall.billingFooterMonthly": "{{price}}/month · Cancel anytime",
    "paywall.billingFooterYearlyEquiv":
      "Only {{equiv}}/month billed annually · Cancel anytime",
    "paywall.billingFooterYearlySimple": "{{price}}/year · Cancel anytime",
    "paywall.billingFooterGeneric": "{{price}} · Cancel anytime",
    "paywall.yearlyApproxPerMonth": "{{price}}/mo",
  });

  it("footer matches weekly billing period", () => {
    expect(
      getSubscriptionDisplay(
        "weekly",
        { priceString: "$2.99", price: 2.99, currencyCode: "USD" },
        { t, locale: "en-US" },
      ).footerText,
    ).toBe("$2.99/week · Cancel anytime");
  });

  it("footer matches monthly billing period", () => {
    expect(
      getSubscriptionDisplay(
        "monthly",
        { priceString: "$7.99", price: 7.99, currencyCode: "USD" },
        { t, locale: "en-US" },
      ).footerText,
    ).toBe("$7.99/month · Cancel anytime");
  });

  it("yearly uses monthly equivalent + billed annually when numeric price present", () => {
    const result = getSubscriptionDisplay(
      "yearly",
      { priceString: "$34.99", price: 34.99, currencyCode: "USD" },
      { t, locale: "en-US" },
    );
    expect(result.footerText).toBe(
      "Only $2.92/month billed annually · Cancel anytime",
    );
    expect(result.yearlyPlanCardCaption).toBe("$2.92/mo");
  });

  it("yearly falls back to simple /year when price number missing", () => {
    expect(
      getSubscriptionDisplay(
        "yearly",
        { priceString: "US$34.99" },
        { t, locale: "en-US" },
      ).footerText,
    ).toBe("$34.99/year · Cancel anytime");
  });

  it("formatMonthlyBillFromAnnual avoids US-prefixed USD in en-GB storefronts", () => {
    const m = formatMonthlyBillFromAnnual(34.99, "USD", "en-GB");
    expect(m.startsWith("US$")).toBe(false);
    expect(m.includes("2.9")).toBe(true);
  });

  it("formatStorefrontPriceLabel normalizes US$ from StoreKit strings", () => {
    expect(
      formatStorefrontPriceLabel({
        priceString: "US$34.99",
        currencyCode: "USD",
      }),
    ).toBe("$34.99");
  });

  it("normalizeUsdMarketingSymbol strips US$ for USD only", () => {
    expect(normalizeUsdMarketingSymbol("US$2.92", "USD")).toBe("$2.92");
    expect(normalizeUsdMarketingSymbol("US$2.92/mo", "USD")).toBe("$2.92/mo");
    expect(normalizeUsdMarketingSymbol("CA$3.00", "CAD")).toBe("CA$3.00");
    expect(normalizeUsdMarketingSymbol("€2,92", "EUR")).toBe("€2,92");
  });

  it("formatMonthlyBillFromAnnual uses currency + locale", () => {
    const m = formatMonthlyBillFromAnnual(36, "USD", "en-US");
    expect(m.startsWith("$")).toBe(true);
    expect(parseFloat(m.replace(/[^0-9.]/g, ""))).toBeCloseTo(3, 1);
  });
});
