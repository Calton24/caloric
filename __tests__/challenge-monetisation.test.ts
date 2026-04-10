/**
 * Unit tests for insight-trigger.service.ts and challenge-pricing.ts
 *
 * Pure functions — no mocks needed.
 */

import type { InsightInput } from "../src/features/challenge/challenge-monetisation.types";
import { buildOfferingsFromPackages } from "../src/features/challenge/challenge-pricing";
import {
    getInsightMessage,
    isInsightMoment,
} from "../src/features/challenge/insight-trigger.service";

// ── Helpers ──────────────────────────────────────────────────

function makeInsight(overrides: Partial<InsightInput> = {}): InsightInput {
  return {
    scanCount: 0,
    calorieDeviation: 0,
    proteinRatio: 1.0,
    dailyIntakePercent: 0.3,
    timeOfDay: 12,
    ...overrides,
  };
}

// ── isInsightMoment() ───────────────────────────────────────

describe("isInsightMoment", () => {
  it("returns false with no triggers hit", () => {
    expect(isInsightMoment(makeInsight())).toBe(false);
  });

  it("triggers on scanCount >= 3", () => {
    expect(isInsightMoment(makeInsight({ scanCount: 3 }))).toBe(true);
  });

  it("does not trigger on scanCount 2", () => {
    expect(isInsightMoment(makeInsight({ scanCount: 2 }))).toBe(false);
  });

  it("triggers on calorieDeviation > 300", () => {
    expect(isInsightMoment(makeInsight({ calorieDeviation: 301 }))).toBe(true);
  });

  it("does not trigger on calorieDeviation exactly 300", () => {
    expect(isInsightMoment(makeInsight({ calorieDeviation: 300 }))).toBe(false);
  });

  it("triggers on proteinRatio < 0.5", () => {
    expect(isInsightMoment(makeInsight({ proteinRatio: 0.49 }))).toBe(true);
  });

  it("does not trigger on proteinRatio exactly 0.5", () => {
    expect(isInsightMoment(makeInsight({ proteinRatio: 0.5 }))).toBe(false);
  });

  it("triggers on front-loaded eating (>70% before 2pm)", () => {
    expect(
      isInsightMoment(makeInsight({ dailyIntakePercent: 0.71, timeOfDay: 13 }))
    ).toBe(true);
  });

  it("does not trigger at 2pm even with high intake", () => {
    expect(
      isInsightMoment(makeInsight({ dailyIntakePercent: 0.9, timeOfDay: 14 }))
    ).toBe(false);
  });

  it("does not trigger at low intake even before 2pm", () => {
    expect(
      isInsightMoment(makeInsight({ dailyIntakePercent: 0.5, timeOfDay: 10 }))
    ).toBe(false);
  });

  it("is idempotent — same input same result", () => {
    const input = makeInsight({ scanCount: 5 });
    expect(isInsightMoment(input)).toBe(isInsightMoment(input));
  });
});

// ── getInsightMessage() ─────────────────────────────────────

describe("getInsightMessage", () => {
  it("returns null when no trigger matched", () => {
    expect(getInsightMessage(makeInsight())).toBeNull();
  });

  it("returns calorie message for deviation trigger", () => {
    const msg = getInsightMessage(makeInsight({ calorieDeviation: 400 }));
    expect(msg).toContain("400 calories off");
    expect(msg).toContain("affecting your results");
  });

  it("returns protein message for low ratio", () => {
    const msg = getInsightMessage(makeInsight({ proteinRatio: 0.3 }));
    expect(msg).toContain("protein");
    expect(msg).toContain("limiting your progress");
  });

  it("returns intake message for front-loaded eating", () => {
    const msg = getInsightMessage(
      makeInsight({ dailyIntakePercent: 0.8, timeOfDay: 11 })
    );
    expect(msg).toContain("80%");
    expect(msg).toContain("energy and hunger balance");
  });

  it("returns fallback scan message for scanCount trigger", () => {
    const msg = getInsightMessage(makeInsight({ scanCount: 3 }));
    expect(msg).toContain("pattern");
    expect(msg).toContain("affecting your results");
  });

  it("prioritises calorie over scan count", () => {
    const msg = getInsightMessage(
      makeInsight({ scanCount: 5, calorieDeviation: 400 })
    );
    expect(msg).toContain("400 calories");
  });

  it("prioritises protein over scan count", () => {
    const msg = getInsightMessage(
      makeInsight({ scanCount: 5, proteinRatio: 0.3 })
    );
    expect(msg).toContain("protein");
  });

  it("prioritises calorie over protein", () => {
    const msg = getInsightMessage(
      makeInsight({ calorieDeviation: 500, proteinRatio: 0.2 })
    );
    expect(msg).toContain("500 calories");
  });
});

// ── buildOfferingsFromPackages() ──────────────────────────────────────

/** Create a mock RC package with the given product identifier and price. */
function mockPackage(
  identifier: string,
  productId: string,
  price: number,
  currencyCode = "GBP",
  introPrice?: { price: number; priceString: string }
) {
  const symbols: Record<string, string> = { GBP: "£", USD: "$", EUR: "€" };
  const symbol = symbols[currencyCode] ?? currencyCode + " ";
  return {
    identifier,
    product: {
      identifier: productId,
      price,
      priceString: `${symbol}${price.toFixed(2)}`,
      currencyCode,
      ...(introPrice ? { introPrice: { ...introPrice } } : {}),
    },
  };
}

// Challenge offering packages: weekly + challenge annual
const challengePackages = [
  mockPackage("$rc_weekly", "calcut_weekly", 2.99, "GBP", {
    price: 0.99,
    priceString: "£0.99",
  }),
  mockPackage("$rc_annual", "calcut_annual_challenge", 34.99),
];

// Default offering packages: weekly + monthly + annual
const defaultPackages = [
  mockPackage("$rc_weekly", "calcut_weekly", 2.99),
  mockPackage("$rc_monthly", "calcut_monthly", 7.99),
  mockPackage("$rc_annual", "calcut_annual", 49.99),
];

describe("buildOfferingsFromPackages", () => {
  it("returns null for empty packages", () => {
    expect(
      buildOfferingsFromPackages([], {
        isChallengeActive: true,
        isIntroEligible: false,
      })
    ).toBeNull();
  });

  it("returns challenge tiers with intro when eligible", () => {
    const config = buildOfferingsFromPackages(challengePackages, {
      isChallengeActive: true,
      isIntroEligible: true,
    });
    expect(config).not.toBeNull();
    expect(config!.includesMonthly).toBe(false);
    expect(config!.tiers.length).toBe(3);
    expect(config!.tiers[0].displayId).toBe("intro");
    expect(config!.tiers[0].purchaseTarget).toBe("weekly");
    expect(config!.tiers[0].price).toBe("£0.99");
    expect(config!.tiers[0].highlighted).toBe(true);
    expect(config!.tiers[1].displayId).toBe("annual");
    expect(config!.tiers[1].purchaseTarget).toBe("annual");
    expect(config!.tiers[2].displayId).toBe("weekly");
    expect(config!.tiers[2].purchaseTarget).toBe("weekly");
  });

  it("returns challenge tiers without intro when not eligible", () => {
    const config = buildOfferingsFromPackages(challengePackages, {
      isChallengeActive: true,
      isIntroEligible: false,
    });
    expect(config).not.toBeNull();
    expect(config!.includesMonthly).toBe(false);
    expect(config!.tiers.length).toBe(2);
    expect(config!.tiers[0].displayId).toBe("annual");
    expect(config!.tiers[0].highlighted).toBe(true); // hero when no intro
    expect(config!.tiers[1].displayId).toBe("weekly");
  });

  it("never includes monthly in challenge paywall", () => {
    const config = buildOfferingsFromPackages(challengePackages, {
      isChallengeActive: true,
      isIntroEligible: true,
    });
    expect(
      config!.tiers.find((t) => t.displayId === "monthly")
    ).toBeUndefined();
  });

  it("returns standard tiers with monthly when not in challenge", () => {
    const config = buildOfferingsFromPackages(defaultPackages, {
      isChallengeActive: false,
      isIntroEligible: false,
    });
    expect(config).not.toBeNull();
    expect(config!.includesMonthly).toBe(true);
    expect(config!.tiers.length).toBe(3);
    expect(config!.tiers.find((t) => t.displayId === "monthly")).toBeDefined();
    expect(
      config!.tiers.find((t) => t.displayId === "annual")?.highlighted
    ).toBe(true);
  });

  it("annual shows per-month savings text", () => {
    const config = buildOfferingsFromPackages(challengePackages, {
      isChallengeActive: true,
      isIntroEligible: false,
    });
    const annual = config!.tiers.find((t) => t.displayId === "annual");
    expect(annual?.savingsText).toContain("/mo");
  });

  it("intro tier shows strikethrough price from weekly package", () => {
    const config = buildOfferingsFromPackages(challengePackages, {
      isChallengeActive: true,
      isIntroEligible: true,
    });
    const intro = config!.tiers.find((t) => t.displayId === "intro");
    expect(intro?.strikethrough).toBe("£2.99");
  });

  it("intro tier has renewalText and subtext", () => {
    const config = buildOfferingsFromPackages(challengePackages, {
      isChallengeActive: true,
      isIntroEligible: true,
    });
    const intro = config!.tiers.find((t) => t.displayId === "intro");
    expect(intro?.renewalText).toContain("£2.99");
    expect(intro?.subtext).toBe("First week only");
    expect(intro?.period).toBe("/week");
  });

  it("intro purchaseTarget is weekly, not a separate product", () => {
    const config = buildOfferingsFromPackages(challengePackages, {
      isChallengeActive: true,
      isIntroEligible: true,
    });
    const intro = config!.tiers.find((t) => t.displayId === "intro");
    const weekly = config!.tiers.find((t) => t.displayId === "weekly");
    expect(intro?.purchaseTarget).toBe("weekly");
    expect(weekly?.purchaseTarget).toBe("weekly");
  });

  it("prices come from package data, not hardcoded", () => {
    // Use USD packages to prove no hardcoded GBP
    const usdPackages = [
      mockPackage("$rc_weekly", "calcut_weekly", 3.49, "USD"),
      mockPackage("$rc_annual", "calcut_annual", 59.99, "USD"),
    ];
    const config = buildOfferingsFromPackages(usdPackages, {
      isChallengeActive: false,
      isIntroEligible: false,
    });
    expect(config).not.toBeNull();
    const weekly = config!.tiers.find((t) => t.displayId === "weekly");
    expect(weekly?.price).toBe("$3.49");
    const annual = config!.tiers.find((t) => t.displayId === "annual");
    expect(annual?.price).toBe("$59.99");
  });

  it("omits tiers whose packages are missing from the offering", () => {
    // Only weekly in the offering — no monthly or annual
    const weeklyOnly = [mockPackage("$rc_weekly", "calcut_weekly", 2.99)];
    const config = buildOfferingsFromPackages(weeklyOnly, {
      isChallengeActive: false,
      isIntroEligible: false,
    });
    expect(config).not.toBeNull();
    expect(config!.tiers.length).toBe(1);
    expect(config!.tiers[0].displayId).toBe("weekly");
  });
});
