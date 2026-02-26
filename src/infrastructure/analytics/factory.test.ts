import { initAnalytics, resetAnalytics } from "./factory";
import { NoopAnalyticsClient } from "./NoopAnalyticsClient";

// Mock config gating — default: analytics enabled
jest.mock("../../config", () => ({
  getAppConfig: () => ({
    app: { profile: "test" },
    features: { analytics: true },
  }),
}));

describe("analytics factory", () => {
  beforeEach(() => {
    resetAnalytics();
    delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
    delete process.env.EXPO_PUBLIC_POSTHOG_HOST;
  });

  it("returns the same instance on repeated init", () => {
    const a = initAnalytics();
    const b = initAnalytics();
    expect(a).toBe(b);
  });

  it("returns Noop when enabled but missing key", () => {
    const client = initAnalytics();
    expect(client).toBeInstanceOf(NoopAnalyticsClient);
  });

  it("returns Noop via sdk_missing_fallback when key present but SDK not installed", () => {
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY = "phc_test_key";
    const client = initAnalytics();
    // PostHog SDK isn't installed in test env, so factory detects the
    // degraded PostHogAnalyticsClient and falls back to Noop.
    expect(client).toBeInstanceOf(NoopAnalyticsClient);
  });
});

describe("analytics factory gating", () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  });

  it("forces Noop when config.features.analytics is false", () => {
    jest.resetModules();
    jest.doMock("../../config", () => ({
      getAppConfig: () => ({
        app: { profile: "test" },
        features: { analytics: false },
      }),
    }));

    const {
      initAnalytics: initAgain,
      resetAnalytics: resetAgain,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("./factory");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NoopAnalyticsClient: Noop } = require("./NoopAnalyticsClient");

    resetAgain();
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY = "phc_test_key";

    const client = initAgain();
    expect(client).toBeInstanceOf(Noop);
  });
});
