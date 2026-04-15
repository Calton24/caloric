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
process.env.EXPO_PUBLIC_APP_PROFILE = "caloric";
process.env.EXPO_PUBLIC_APP_ENV = "dev";
process.env.APP_ENV = "dev"; // Also set APP_ENV for config loader
process.env.EXPO_PUBLIC_REVENUECAT_API_KEY = "test_placeholder_api_key"; // Required for caloric profile

// Clean up any pending timers after each test
afterEach(() => {
  jest.clearAllTimers();
});

// Ensure all async operations are cleaned up after all tests
afterAll(async () => {
  // Give async operations a moment to settle
  await new Promise((resolve) => setImmediate(resolve));
});
