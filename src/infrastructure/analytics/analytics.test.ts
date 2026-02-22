/**
 * Analytics Tests
 * Migrated from src/analytics/analytics.test.ts → src/infrastructure/analytics/
 */

import { analytics, getAnalyticsClient, setAnalyticsClient } from "./analytics";
import { NoopAnalyticsClient } from "./NoopAnalyticsClient";
import type { AnalyticsClient } from "./types";

describe("Analytics", () => {
  let mockClient: jest.Mocked<AnalyticsClient>;

  beforeEach(() => {
    setAnalyticsClient(new NoopAnalyticsClient());

    mockClient = {
      identify: jest.fn(),
      track: jest.fn(),
      screen: jest.fn(),
      reset: jest.fn(),
    };
  });

  describe("Default Behavior", () => {
    it("should not throw when no client is set", () => {
      expect(() => {
        analytics.track("test_event");
        analytics.identify("user123");
        analytics.screen("home");
        analytics.reset();
      }).not.toThrow();
    });

    it("should use NoopAnalyticsClient by default", () => {
      const currentClient = getAnalyticsClient();
      expect(currentClient).toBeInstanceOf(NoopAnalyticsClient);
    });
  });

  describe("Client Swapping", () => {
    it("should swap to custom client", () => {
      setAnalyticsClient(mockClient);
      expect(getAnalyticsClient()).toBe(mockClient);
    });

    it("should call custom client methods", () => {
      setAnalyticsClient(mockClient);

      analytics.identify("user123", { email: "user@example.com" });
      expect(mockClient.identify).toHaveBeenCalledWith("user123", {
        email: "user@example.com",
      });

      analytics.track("button_clicked", { button: "submit" });
      expect(mockClient.track).toHaveBeenCalledWith("button_clicked", {
        button: "submit",
      });

      analytics.screen("settings", { tab: "account" });
      expect(mockClient.screen).toHaveBeenCalledWith("settings", {
        tab: "account",
      });

      analytics.reset();
      expect(mockClient.reset).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should not crash when client throws error", () => {
      const throwingClient: AnalyticsClient = {
        identify: () => {
          throw new Error("Test error");
        },
        track: () => {
          throw new Error("Test error");
        },
        screen: () => {
          throw new Error("Test error");
        },
        reset: () => {
          throw new Error("Test error");
        },
      };

      setAnalyticsClient(throwingClient);

      expect(() => {
        analytics.identify("user123");
        analytics.track("event");
        analytics.screen("home");
        analytics.reset();
      }).not.toThrow();
    });

    it("should log warning when client fails", () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const throwingClient: AnalyticsClient = {
        identify: () => {
          throw new Error("Test error");
        },
        track: () => {
          throw new Error("Test error");
        },
        screen: () => {
          throw new Error("Test error");
        },
        reset: () => {
          throw new Error("Test error");
        },
      };

      setAnalyticsClient(throwingClient);

      analytics.identify("user123");
      analytics.track("event");
      analytics.screen("home");
      analytics.reset();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(4);
      consoleWarnSpy.mockRestore();
    });
  });

  describe("NoopAnalyticsClient", () => {
    it("should not throw when calling noop methods", () => {
      const noop = new NoopAnalyticsClient();

      expect(() => {
        noop.identify("user123", { email: "test@example.com" });
        noop.track("event", { prop: "value" });
        noop.screen("home", { from: "deep_link" });
        noop.reset();
      }).not.toThrow();
    });
  });
});
