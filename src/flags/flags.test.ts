/**
 * Feature Flags Tests
 */

import { flags, getFlagClient, setFlagClient } from "./flags";
import type { FeatureFlagClient } from "./flags.types";
import { NoopFlagClient } from "./flags.types";

describe("Feature Flags", () => {
  let mockFlagClient: jest.Mocked<FeatureFlagClient>;

  beforeEach(() => {
    // Reset to noop client
    setFlagClient(new NoopFlagClient());

    // Create mock client
    mockFlagClient = {
      isEnabled: jest.fn(),
      getValue: jest.fn(),
      setUser: jest.fn(),
      clearUser: jest.fn(),
    };
  });

  describe("Default Behavior", () => {
    it("should use NoopFlagClient by default", () => {
      const currentClient = getFlagClient();
      expect(currentClient).toBeInstanceOf(NoopFlagClient);
    });

    it("should return false by default for isEnabled", () => {
      expect(flags.isEnabled("test-flag")).toBe(false);
    });

    it("should return custom default for isEnabled", () => {
      expect(flags.isEnabled("test-flag", true)).toBe(true);
    });

    it("should return default value for getValue", () => {
      expect(flags.getValue("test-flag", "default")).toBe("default");
      expect(flags.getValue("test-flag", 42)).toBe(42);
      expect(flags.getValue("test-flag", { key: "value" })).toEqual({
        key: "value",
      });
    });

    it("should not throw when setting user", () => {
      expect(() => {
        flags.setUser("user123", { plan: "premium" });
      }).not.toThrow();
    });

    it("should not throw when clearing user", () => {
      expect(() => {
        flags.clearUser();
      }).not.toThrow();
    });
  });

  describe("Client Swapping", () => {
    it("should swap to custom client", () => {
      setFlagClient(mockFlagClient);
      const currentClient = getFlagClient();
      expect(currentClient).toBe(mockFlagClient);
    });

    it("should call custom client isEnabled", () => {
      mockFlagClient.isEnabled.mockReturnValue(true);
      setFlagClient(mockFlagClient);

      const result = flags.isEnabled("test-flag", false);

      expect(mockFlagClient.isEnabled).toHaveBeenCalledWith("test-flag", false);
      expect(result).toBe(true);
    });

    it("should call custom client getValue", () => {
      mockFlagClient.getValue.mockReturnValue("variant-a");
      setFlagClient(mockFlagClient);

      const result = flags.getValue("test-flag", "default");

      expect(mockFlagClient.getValue).toHaveBeenCalledWith(
        "test-flag",
        "default"
      );
      expect(result).toBe("variant-a");
    });

    it("should call custom client setUser", () => {
      setFlagClient(mockFlagClient);

      flags.setUser("user123", { plan: "premium" });

      expect(mockFlagClient.setUser).toHaveBeenCalledWith("user123", {
        plan: "premium",
      });
    });

    it("should call custom client clearUser", () => {
      setFlagClient(mockFlagClient);

      flags.clearUser();

      expect(mockFlagClient.clearUser).toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("should not crash when client throws on isEnabled", () => {
      const throwingClient: FeatureFlagClient = {
        isEnabled: () => {
          throw new Error("Test error");
        },
        getValue: <T>(flagKey: string, defaultValue: T): T => defaultValue,
        setUser: () => {},
        clearUser: () => {},
      };

      setFlagClient(throwingClient);

      expect(() => {
        const result = flags.isEnabled("test-flag", true);
        expect(result).toBe(true); // Should return default
      }).not.toThrow();
    });

    it("should not crash when client throws on getValue", () => {
      const throwingClient: FeatureFlagClient = {
        isEnabled: () => false,
        getValue: () => {
          throw new Error("Test error");
        },
        setUser: () => {},
        clearUser: () => {},
      };

      setFlagClient(throwingClient);

      expect(() => {
        const result = flags.getValue("test-flag", "default");
        expect(result).toBe("default"); // Should return default
      }).not.toThrow();
    });

    it("should not crash when client throws on setUser", () => {
      const throwingClient: FeatureFlagClient = {
        isEnabled: () => false,
        getValue: <T>(flagKey: string, defaultValue: T): T => defaultValue,
        setUser: () => {
          throw new Error("Test error");
        },
        clearUser: () => {},
      };

      setFlagClient(throwingClient);

      expect(() => {
        flags.setUser("user123");
      }).not.toThrow();
    });

    it("should not crash when client throws on clearUser", () => {
      const throwingClient: FeatureFlagClient = {
        isEnabled: () => false,
        getValue: <T>(flagKey: string, defaultValue: T): T => defaultValue,
        setUser: () => {},
        clearUser: () => {
          throw new Error("Test error");
        },
      };

      setFlagClient(throwingClient);

      expect(() => {
        flags.clearUser();
      }).not.toThrow();
    });

    it("should log warnings when methods fail", () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      const throwingClient: FeatureFlagClient = {
        isEnabled: () => {
          throw new Error("Test error");
        },
        getValue: () => {
          throw new Error("Test error");
        },
        setUser: () => {
          throw new Error("Test error");
        },
        clearUser: () => {
          throw new Error("Test error");
        },
      };

      setFlagClient(throwingClient);

      flags.isEnabled("test");
      flags.getValue("test", "default");
      flags.setUser("user123");
      flags.clearUser();

      expect(consoleWarnSpy).toHaveBeenCalledTimes(4);

      consoleWarnSpy.mockRestore();
    });
  });

  describe("NoopFlagClient", () => {
    it("should return default value for isEnabled", () => {
      const noop = new NoopFlagClient();
      expect(noop.isEnabled("test", false)).toBe(false);
      expect(noop.isEnabled("test", true)).toBe(true);
    });

    it("should return default value for getValue", () => {
      const noop = new NoopFlagClient();
      expect(noop.getValue("test", "default")).toBe("default");
      expect(noop.getValue("test", 42)).toBe(42);
    });

    it("should not throw on setUser", () => {
      const noop = new NoopFlagClient();
      expect(() => {
        noop.setUser("user123", { key: "value" });
      }).not.toThrow();
    });

    it("should not throw on clearUser", () => {
      const noop = new NoopFlagClient();
      expect(() => {
        noop.clearUser();
      }).not.toThrow();
    });
  });
});
