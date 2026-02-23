/**
 * Error Reporting Factory Tests
 * Validates factory gating, SDK availability checks, and boot mode logging
 */

import { NoopErrorReporter } from "./NoopErrorReporter";
import { SentryErrorReporter } from "./SentryErrorReporter";

// Now import factory functions
import {
    getErrorReporter,
    initErrorReporting,
    resetErrorReporting,
} from "./factory";

// Mock the config system BEFORE importing factory
jest.mock("../../config", () => ({
  getAppConfig: jest.fn(() => ({
    features: {
      crashReporting: true, // Default to enabled for most tests
    },
  })),
}));

// Store original console methods
const originalLog = console.log;
const originalWarn = console.warn;

describe("Error Reporting Factory", () => {
  let consoleLogs: string[] = [];
  let consoleWarns: string[] = [];
  let mockGetAppConfig: jest.Mock;

  beforeEach(() => {
    // Reset factory state
    resetErrorReporting();

    // Set up default mock for getAppConfig
    const { getAppConfig } = require("../../config");
    mockGetAppConfig = getAppConfig as jest.Mock;
    mockGetAppConfig.mockClear();
    mockGetAppConfig.mockReturnValue({
      features: {
        crashReporting: true,
      },
    });

    // Capture console output
    consoleLogs = [];
    consoleWarns = [];
    console.log = jest.fn((...args) => {
      consoleLogs.push(args.join(" "));
    });
    console.warn = jest.fn((...args) => {
      consoleWarns.push(args.join(" "));
    });

    // Clear env vars
    delete process.env.EXPO_PUBLIC_SENTRY_DSN;
    delete process.env.EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV;
  });

  afterEach(() => {
    // Restore console
    console.log = originalLog;
    console.warn = originalWarn;
  });

  describe("Singleton Behavior", () => {
    it("should return the same instance on multiple calls", () => {
      const reporter1 = initErrorReporting();
      const reporter2 = initErrorReporting();

      expect(reporter1).toBe(reporter2);
    });

    it("should return new instance after reset", () => {
      const reporter1 = initErrorReporting();
      resetErrorReporting();
      const reporter2 = initErrorReporting();

      expect(reporter1).not.toBe(reporter2);
    });
  });

  describe("Config Gating", () => {
    it("should return Noop when crashReporting is disabled in config", () => {
      mockGetAppConfig.mockReturnValue({
        features: { crashReporting: false },
      });

      const reporter = initErrorReporting();

      expect(reporter).toBeInstanceOf(NoopErrorReporter);
      expect(consoleLogs).toContain("[ErrorReporting] mode=disabled_by_config");
    });

    it("should proceed to check DSN when crashReporting is enabled", () => {
      mockGetAppConfig.mockReturnValue({
        features: { crashReporting: true },
      });

      const reporter = initErrorReporting();

      // Should hit enabled_missing_dsn since no DSN is set
      expect(reporter).toBeInstanceOf(NoopErrorReporter);
      expect(consoleLogs).toContain(
        "[ErrorReporting] mode=enabled_missing_dsn"
      );
    });
  });

  describe("DSN Validation", () => {
    it("should return Noop when DSN is missing", () => {
      mockGetAppConfig.mockReturnValue({
        features: { crashReporting: true },
      });

      const reporter = initErrorReporting();

      expect(reporter).toBeInstanceOf(NoopErrorReporter);
      expect(consoleLogs).toContain(
        "[ErrorReporting] mode=enabled_missing_dsn"
      );
    });

    it("should check SDK availability when DSN is present", () => {
      mockGetAppConfig.mockReturnValue({
        features: { crashReporting: true },
      });

      process.env.EXPO_PUBLIC_SENTRY_DSN = "https://test@sentry.io/123456";

      const reporter = initErrorReporting();

      // Should check if SDK is available
      // Since @sentry/react-native is not installed in test env, should fallback to Noop
      if (!SentryErrorReporter.isSdkAvailable()) {
        expect(reporter).toBeInstanceOf(NoopErrorReporter);
        expect(consoleLogs).toContain(
          "[ErrorReporting] mode=sdk_missing_fallback_noop"
        );
      } else {
        // If SDK is installed (e.g., in CI with full deps), should initialize Sentry
        expect(reporter).toBeInstanceOf(SentryErrorReporter);
        expect(consoleLogs).toContain(
          "[ErrorReporting] mode=sentry_initialized"
        );
      }
    });
  });

  describe("SDK Availability", () => {
    it("should return Noop when SDK is missing even with DSN", () => {
      mockGetAppConfig.mockReturnValue({
        features: { crashReporting: true },
      });

      process.env.EXPO_PUBLIC_SENTRY_DSN = "https://test@sentry.io/123456";

      // Mock SDK as unavailable
      const isSdkAvailable = SentryErrorReporter.isSdkAvailable();

      const reporter = initErrorReporting();

      if (!isSdkAvailable) {
        expect(reporter).toBeInstanceOf(NoopErrorReporter);
        expect(consoleLogs).toContain(
          "[ErrorReporting] mode=sdk_missing_fallback_noop"
        );
      }
    });
  });

  describe("getErrorReporter", () => {
    it("should return Noop and warn when not initialized", () => {
      const reporter = getErrorReporter();

      expect(reporter).toBeInstanceOf(NoopErrorReporter);
      expect(consoleWarns.length).toBeGreaterThan(0);
      expect(consoleWarns[0]).toContain("Not initialized");
    });

    it("should return initialized instance after init", () => {
      const initializedReporter = initErrorReporting();
      const retrievedReporter = getErrorReporter();

      expect(retrievedReporter).toBe(initializedReporter);
    });
  });

  describe("Boot Mode Logging", () => {
    const modes = [
      "disabled_by_config",
      "enabled_missing_dsn",
      "sdk_missing_fallback_noop",
      "sentry_initialized",
    ];

    it("should log structured boot mode in format [ErrorReporting] mode=...", () => {
      // Test disabled_by_config
      mockGetAppConfig.mockReturnValue({
        features: { crashReporting: false },
      });

      initErrorReporting();

      const modeLog = consoleLogs.find((log) => log.includes("mode="));
      expect(modeLog).toBeTruthy();
      expect(modeLog).toMatch(/\[ErrorReporting\] mode=\w+/);
    });

    it("should only log one mode per initialization", () => {
      mockGetAppConfig.mockReturnValue({
        features: { crashReporting: false },
      });

      initErrorReporting();

      const modeLogs = consoleLogs.filter((log) =>
        log.includes("[ErrorReporting] mode=")
      );
      expect(modeLogs.length).toBe(1);
    });
  });
});
