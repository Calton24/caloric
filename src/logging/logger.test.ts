/**
 * Logger Tests
 */

import { getLogger, logger, setLogger } from "./logger";
import type { Logger } from "./logger.types";
import { ConsoleLogger } from "./logger.types";

describe("Logger", () => {
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    // Reset to console logger
    setLogger(new ConsoleLogger());

    // Create mock logger
    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };
  });

  describe("Default Behavior", () => {
    it("should use ConsoleLogger by default", () => {
      const currentLogger = getLogger();
      expect(currentLogger).toBeInstanceOf(ConsoleLogger);
    });

    it("should not throw when logging", () => {
      expect(() => {
        logger.log("test message");
        logger.warn("warning message");
        logger.error("error message");
      }).not.toThrow();
    });
  });

  describe("Logger Swapping", () => {
    it("should swap to custom logger", () => {
      setLogger(mockLogger);
      const currentLogger = getLogger();
      expect(currentLogger).toBe(mockLogger);
    });

    it("should call custom logger methods", () => {
      setLogger(mockLogger);

      logger.log("info message", { userId: "123" });
      expect(mockLogger.log).toHaveBeenCalledWith("info message", {
        userId: "123",
      });

      logger.warn("warning message", { code: 400 });
      expect(mockLogger.warn).toHaveBeenCalledWith("warning message", {
        code: 400,
      });

      logger.error("error message", { stack: "..." });
      expect(mockLogger.error).toHaveBeenCalledWith("error message", {
        stack: "...",
      });
    });
  });

  describe("Error Handling", () => {
    it("should not crash when logger throws", () => {
      const throwingLogger: Logger = {
        log: () => {
          throw new Error("Test error");
        },
        warn: () => {
          throw new Error("Test error");
        },
        error: () => {
          throw new Error("Test error");
        },
      };

      setLogger(throwingLogger);

      expect(() => {
        logger.log("message");
        logger.warn("message");
        logger.error("message");
      }).not.toThrow();
    });

    it("should fallback to console when logger fails", () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

      const throwingLogger: Logger = {
        log: () => {
          throw new Error("Test error");
        },
        warn: () => {
          throw new Error("Test error");
        },
        error: () => {
          throw new Error("Test error");
        },
      };

      setLogger(throwingLogger);

      logger.log("log message");
      logger.warn("warn message");
      logger.error("error message");

      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleLogSpy.mockRestore();
      consoleWarnSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    });
  });

  describe("ConsoleLogger", () => {
    it("should log to console", () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      const consoleLogger = new ConsoleLogger();

      consoleLogger.log("test message");
      expect(consoleLogSpy).toHaveBeenCalledWith("test message");

      consoleLogger.log("test with meta", { key: "value" });
      expect(consoleLogSpy).toHaveBeenCalledWith("test with meta", {
        key: "value",
      });

      consoleLogSpy.mockRestore();
    });

    it("should warn to console", () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
      const consoleLogger = new ConsoleLogger();

      consoleLogger.warn("warning");
      expect(consoleWarnSpy).toHaveBeenCalledWith("warning");

      consoleWarnSpy.mockRestore();
    });

    it("should error to console", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      const consoleLogger = new ConsoleLogger();

      consoleLogger.error("error");
      expect(consoleErrorSpy).toHaveBeenCalledWith("error");

      consoleErrorSpy.mockRestore();
    });
  });
});
