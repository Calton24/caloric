import {
  PAYWALL_UPGRADE_HREF,
  parsePaywallRouteMode,
  paywallHidesFreeChallengePath,
} from "../src/features/subscription/paywall-mode";
import {
  formatStorefrontPriceLabel,
  getSubscriptionDisplay,
  type SubscriptionDisplayTranslate,
} from "../src/lib/billing/subscription-display";

describe("paywall-mode helpers", () => {
  describe("parsePaywallRouteMode", () => {
    it("defaults to onboarding", () => {
      expect(parsePaywallRouteMode(undefined)).toBe("onboarding");
    });

    it("parses gate and upgrade", () => {
      expect(parsePaywallRouteMode("gate")).toBe("gate");
      expect(parsePaywallRouteMode("upgrade")).toBe("upgrade");
    });

    it("uses first array element", () => {
      expect(parsePaywallRouteMode(["upgrade", "gate"])).toBe("upgrade");
    });

    it("treats unknown values as onboarding", () => {
      expect(parsePaywallRouteMode("nope")).toBe("onboarding");
    });
  });

  describe("paywallHidesFreeChallengePath", () => {
    it("hides free-challenge chrome for gate and upgrade", () => {
      expect(paywallHidesFreeChallengePath("gate")).toBe(true);
      expect(paywallHidesFreeChallengePath("upgrade")).toBe(true);
    });

    it("shows free-challenge chrome for first-run onboarding", () => {
      expect(paywallHidesFreeChallengePath("onboarding")).toBe(false);
    });
  });

  describe("PAYWALL_UPGRADE_HREF", () => {
    it("targets onboarding paywall with upgrade query param", () => {
      expect(PAYWALL_UPGRADE_HREF).toBe("/(onboarding)/paywall?mode=upgrade");
    });
  });
});

describe("paywall billing display (empty package safety)", () => {
  const tStub: SubscriptionDisplayTranslate["t"] = (key) => key;

  it("formatStorefrontPriceLabel does not throw with undefined product", () => {
    expect(formatStorefrontPriceLabel(undefined)).toBe("—");
  });

  it("getSubscriptionDisplay tolerates missing store product fields", () => {
    expect(() =>
      getSubscriptionDisplay("yearly", undefined, {
        t: tStub,
        locale: "en",
      }),
    ).not.toThrow();
  });
});
