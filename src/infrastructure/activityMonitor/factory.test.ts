/**
 * Activity Monitor Factory Tests
 * Mirrors factory.test.ts pattern from notifications.
 */

import { initActivityMonitor, resetActivityMonitor } from "./factory";

// Mock config gating — default: activityMonitor enabled
jest.mock("../../config", () => ({
  getAppConfig: () => ({
    app: { profile: "test" },
    features: { activityMonitor: true },
  }),
}));

describe("activityMonitor factory", () => {
  beforeEach(() => {
    resetActivityMonitor();
  });

  it("returns the same instance on repeated init", () => {
    const a = initActivityMonitor();
    const b = initActivityMonitor();
    expect(a).toBe(b);
  });

  it("returns a client with the full ActivityMonitorClient interface", () => {
    const client = initActivityMonitor();
    expect(client).toBeDefined();
    expect(typeof client.start).toBe("function");
    expect(typeof client.update).toBe("function");
    expect(typeof client.end).toBe("function");
    expect(typeof client.isSupported).toBe("function");
    expect(typeof client.getAll).toBe("function");
    expect(typeof client.get).toBe("function");
  });

  it("InAppActivityMonitorClient reports isSupported = true", () => {
    const client = initActivityMonitor();
    expect(client.isSupported()).toBe(true);
  });
});

describe("activityMonitor factory gating", () => {
  it("forces Noop when config.features.activityMonitor is false", () => {
    jest.resetModules();
    jest.doMock("../../config", () => ({
      getAppConfig: () => ({
        app: { profile: "test" },
        features: { activityMonitor: false },
      }),
    }));

    const {
      initActivityMonitor: initAgain,
      resetActivityMonitor: resetAgain,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("./factory");
    const {
      NoopActivityMonitorClient: Noop,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("./NoopActivityMonitorClient");

    resetAgain();
    const client = initAgain();
    expect(client).toBeInstanceOf(Noop);
  });
});
