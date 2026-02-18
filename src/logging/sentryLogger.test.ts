/**
 * Sentry Logger Tests
 */

// Import after mock to ensure mock is applied
/* eslint-disable import/first */
import { SentryLogger } from "./sentryLogger";

// Mock sentry-expo
jest.mock("sentry-expo", () => ({
  init: jest.fn(),
  Native: {
    addBreadcrumb: jest.fn(),
    captureException: jest.fn(),
    setContext: jest.fn(),
  },
}));

// Import after mock
import * as Sentry from "sentry-expo";
/* eslint-enable import/first */

describe("SentryLogger", () => {
  let logger: SentryLogger;
  let consoleLogSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    logger = new SentryLogger();
    jest.clearAllMocks();

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("in development mode (__DEV__ = true)", () => {
    beforeEach(() => {
      // __DEV__ is true in test environment by default
      (global as any).__DEV__ = true;
      logger = new SentryLogger();
    });

    it("should log to console instead of Sentry", () => {
      logger.log("test message", { key: "value" });

      expect(consoleLogSpy).toHaveBeenCalledWith("test message", {
        key: "value",
      });
      expect(Sentry.Native.addBreadcrumb).not.toHaveBeenCalled();
    });

    it("should warn to console instead of Sentry", () => {
      logger.warn("warning message", { severity: "medium" });

      expect(consoleWarnSpy).toHaveBeenCalledWith("warning message", {
        severity: "medium",
      });
      expect(Sentry.Native.addBreadcrumb).not.toHaveBeenCalled();
    });

    it("should error to console instead of Sentry", () => {
      logger.error("error message", { code: 500 });

      expect(consoleErrorSpy).toHaveBeenCalledWith("error message", {
        code: 500,
      });
      expect(Sentry.Native.captureException).not.toHaveBeenCalled();
    });
  });

  describe("in production mode (__DEV__ = false)", () => {
    beforeEach(() => {
      (global as any).__DEV__ = false;
      logger = new SentryLogger();
    });

    afterEach(() => {
      (global as any).__DEV__ = true; // Reset to default
    });

    describe("log()", () => {
      it("should send breadcrumb to Sentry with info level", () => {
        logger.log("info message");

        expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith({
          message: "info message",
          level: "info",
          data: undefined,
        });
        expect(consoleLogSpy).not.toHaveBeenCalled();
      });

      it("should attach metadata to breadcrumb", () => {
        const meta = { userId: "123", action: "login" };
        logger.log("user action", meta);

        expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith({
          message: "user action",
          level: "info",
          data: meta,
        });
      });

      it("should fallback to console if Sentry fails", () => {
        (Sentry.Native.addBreadcrumb as jest.Mock).mockImplementationOnce(
          () => {
            throw new Error("Sentry error");
          }
        );

        logger.log("fallback message", { test: true });

        expect(consoleLogSpy).toHaveBeenCalledWith(
          "[Sentry fallback]",
          "fallback message",
          { test: true }
        );
      });
    });

    describe("warn()", () => {
      it("should send breadcrumb to Sentry with warning level", () => {
        logger.warn("warning message");

        expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith({
          message: "warning message",
          level: "warning",
          data: undefined,
        });
        expect(consoleWarnSpy).not.toHaveBeenCalled();
      });

      it("should attach metadata to warning breadcrumb", () => {
        const meta = { component: "Auth", issue: "timeout" };
        logger.warn("component warning", meta);

        expect(Sentry.Native.addBreadcrumb).toHaveBeenCalledWith({
          message: "component warning",
          level: "warning",
          data: meta,
        });
      });

      it("should fallback to console if Sentry fails", () => {
        (Sentry.Native.addBreadcrumb as jest.Mock).mockImplementationOnce(
          () => {
            throw new Error("Sentry error");
          }
        );

        logger.warn("fallback warning", { code: 404 });

        expect(consoleWarnSpy).toHaveBeenCalledWith(
          "[Sentry fallback]",
          "fallback warning",
          { code: 404 }
        );
      });
    });

    describe("error()", () => {
      it("should capture exception in Sentry", () => {
        logger.error("error message");

        expect(Sentry.Native.captureException).toHaveBeenCalledWith(
          expect.any(Error)
        );
        const capturedError = (Sentry.Native.captureException as jest.Mock).mock
          .calls[0][0];
        expect(capturedError.message).toBe("error message");
        expect(consoleErrorSpy).not.toHaveBeenCalled();
      });

      it("should attach metadata as context", () => {
        const meta = { userId: "456", errorCode: "AUTH_FAILED" };
        logger.error("authentication error", meta);

        expect(Sentry.Native.setContext).toHaveBeenCalledWith(
          "error_metadata",
          meta
        );
        expect(Sentry.Native.captureException).toHaveBeenCalled();
      });

      it("should not set context when no metadata", () => {
        logger.error("simple error");

        expect(Sentry.Native.setContext).not.toHaveBeenCalled();
        expect(Sentry.Native.captureException).toHaveBeenCalled();
      });

      it("should fallback to console if Sentry fails", () => {
        (Sentry.Native.captureException as jest.Mock).mockImplementationOnce(
          () => {
            throw new Error("Sentry error");
          }
        );

        logger.error("fallback error", { critical: true });

        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[Sentry fallback]",
          "fallback error",
          { critical: true }
        );
      });
    });
  });

  describe("Logger interface compliance", () => {
    it("should implement log() method", () => {
      expect(logger.log).toBeDefined();
      expect(typeof logger.log).toBe("function");
    });

    it("should implement warn() method", () => {
      expect(logger.warn).toBeDefined();
      expect(typeof logger.warn).toBe("function");
    });

    it("should implement error() method", () => {
      expect(logger.error).toBeDefined();
      expect(typeof logger.error).toBe("function");
    });
  });
});
