/**
 * Notifications Factory Tests
 * Mirrors factory.test.ts pattern from analytics.
 */

import { initNotifications, resetNotifications } from "./factory";

// Mock config gating — default: notifications enabled
jest.mock("../../config", () => ({
  getAppConfig: () => ({
    app: { profile: "test" },
    features: { notifications: true },
  }),
}));

describe("notifications factory", () => {
  beforeEach(() => {
    resetNotifications();
  });

  it("returns the same instance on repeated init", () => {
    const a = initNotifications();
    const b = initNotifications();
    expect(a).toBe(b);
  });

  it("returns ExpoNotificationsClient or Noop depending on SDK availability", () => {
    const client = initNotifications();
    // In test env, expo-notifications may or may not be resolvable.
    // Factory must never throw — it either resolves to Expo or Noop.
    expect(client).toBeDefined();
    expect(typeof client.getPermissions).toBe("function");
    expect(typeof client.requestPermissions).toBe("function");
    expect(typeof client.getPushToken).toBe("function");
    expect(typeof client.scheduleLocal).toBe("function");
    expect(typeof client.clearBadge).toBe("function");
  });
});

describe("notifications factory gating", () => {
  it("forces Noop when config.features.notifications is false", () => {
    jest.resetModules();
    jest.doMock("../../config", () => ({
      getAppConfig: () => ({
        app: { profile: "test" },
        features: { notifications: false },
      }),
    }));

    const {
      initNotifications: initAgain,
      resetNotifications: resetAgain,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("./factory");
    const {
      NoopNotificationsClient: Noop,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("./NoopNotificationsClient");

    resetAgain();
    const client = initAgain();
    expect(client).toBeInstanceOf(Noop);
  });
});
