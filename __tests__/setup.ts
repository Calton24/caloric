/**
 * Jest Setup
 * Runs after test environment is set up but before tests run
 */

// Define __DEV__ for tests
(global as any).__DEV__ = true;

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables for testing
process.env.EXPO_PUBLIC_APP_PROFILE = "intake";
process.env.EXPO_PUBLIC_APP_ENV = "dev";
process.env.APP_ENV = "dev"; // Also set APP_ENV for config loader
