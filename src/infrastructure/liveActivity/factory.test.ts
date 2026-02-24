/**
 * Live Activity Factory Tests
 * Mirrors factory.test.ts pattern from notifications.
 */

import { initLiveActivity, resetLiveActivity } from "./factory";

// Mock config gating — default: liveActivity enabled
jest.mock("../../config", () => ({
  getAppConfig: () => ({
    app: { profile: "test" },
    features: { liveActivity: true },
  }),
}));

// Mock react-native Platform as iOS
jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  AppState: {
    currentState: "active",
    addEventListener: jest.fn(),
  },
}));

describe("liveActivity factory", () => {
  beforeEach(() => {
    resetLiveActivity();
  });

  it("returns the same instance on repeated init", () => {
    const a = initLiveActivity();
    const b = initLiveActivity();
    expect(a).toBe(b);
  });

  it("returns a client with the full LiveActivityClient interface", () => {
    const client = initLiveActivity();
    expect(client).toBeDefined();
    expect(typeof client.start).toBe("function");
    expect(typeof client.update).toBe("function");
    expect(typeof client.end).toBe("function");
    expect(typeof client.isSupported).toBe("function");
  });
});

describe("liveActivity factory gating", () => {
  it("forces Noop when config.features.liveActivity is false", () => {
    jest.resetModules();
    jest.doMock("../../config", () => ({
      getAppConfig: () => ({
        app: { profile: "test" },
        features: { liveActivity: false },
      }),
    }));

    const {
      initLiveActivity: initAgain,
      resetLiveActivity: resetAgain,
    } = require("./factory");
    const {
      NoopLiveActivityClient: Noop,
    } = require("./NoopLiveActivityClient");

    resetAgain();
    const client = initAgain();
    expect(client).toBeInstanceOf(Noop);
  });
});
