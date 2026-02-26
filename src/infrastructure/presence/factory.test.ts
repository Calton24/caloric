/**
 * Presence Factory Tests
 * Mirrors factory.test.ts pattern from notifications.
 */

import { initPresence, resetPresence } from "./factory";

// Mock config gating — default: presence enabled
jest.mock("../../config", () => ({
  getAppConfig: () => ({
    app: { profile: "test" },
    features: { presence: true, analytics: false },
  }),
}));

describe("presence factory", () => {
  beforeEach(() => {
    resetPresence();
  });

  it("returns the same instance on repeated init", () => {
    const a = initPresence();
    const b = initPresence();
    expect(a).toBe(b);
  });

  it("returns a client with the full PresenceClient interface", () => {
    const client = initPresence();
    expect(client).toBeDefined();
    expect(typeof client.start).toBe("function");
    expect(typeof client.stop).toBe("function");
    expect(typeof client.getState).toBe("function");
    expect(typeof client.onChange).toBe("function");
  });

  it("client getState returns a valid lifecycle state", () => {
    const client = initPresence();
    const state = client.getState();
    expect(["active", "background", "inactive"]).toContain(state);
  });
});

describe("presence factory gating", () => {
  it("forces Noop when config.features.presence is false", () => {
    jest.resetModules();
    jest.doMock("../../config", () => ({
      getAppConfig: () => ({
        app: { profile: "test" },
        features: { presence: false, analytics: false },
      }),
    }));

    const {
      initPresence: initAgain,
      resetPresence: resetAgain,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("./factory");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { NoopPresenceClient: Noop } = require("./NoopPresenceClient");

    resetAgain();
    const client = initAgain();
    expect(client).toBeInstanceOf(Noop);
  });
});
