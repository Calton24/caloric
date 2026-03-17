# Testing Guide

Comprehensive testing setup for caloric with Jest, TypeScript, and React Native Testing Library.

## Quick Start

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Watch mode (re-run on file changes)
npm run test:watch

# Coverage report
npm run test:coverage

# Type check
npm run typecheck

# Validate everything
npm run validate
```

## Test Structure

```
caloric/
├── __tests__/           # Test files
│   ├── setup.ts         # Jest setup
│   ├── config.test.ts   # Config system tests
│   ├── billing.test.ts  # Billing tests
│   └── supabase.test.ts # Supabase client tests
├── __mocks__/           # Module mocks
│   ├── react-native.ts
│   ├── expo-constants.ts
│   └── @react-native-async-storage/
└── jest.config.js       # Jest configuration
```

## Writing Tests

### Test File Naming

- **Unit tests**: `*.test.ts` or `*.test.tsx`
- **Integration tests**: `*.integration.test.ts`
- **Location**: `__tests__/` directory or co-located with source files

### Basic Test Structure

```typescript
/**
 * Feature Name Tests
 * Description of what this test suite covers
 */

describe("Feature Name", () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe("Specific Functionality", () => {
    it("should do something specific", () => {
      // Arrange
      const input = "test";

      // Act
      const result = functionToTest(input);

      // Assert
      expect(result).toBe("expected");
    });
  });
});
```

## Test Categories

### 1. Config System Tests

**File**: `__tests__/config.test.ts`

Tests:

- ✅ Profile selection (intake, proxi)
- ✅ Environment overrides (dev, staging, production)
- ✅ Feature flags
- ✅ Config caching
- ✅ Type safety
- ✅ Security (no secret keys)

Example:

```typescript
it("should load intake profile when EXPO_PUBLIC_APP_PROFILE=intake", () => {
  process.env.EXPO_PUBLIC_APP_PROFILE = "caloric";
  const config = getActiveConfig();
  expect(config.app.name).toBe("Intake");
});
```

### 2. Billing Tests

**File**: `__tests__/billing.test.ts`

Tests:

- ✅ Provider selection (Superwall, Stripe, No-op)
- ✅ Entitlement model consistency
- ✅ Initialization
- ✅ Error handling
- ✅ Caching

**Important**: We test adapter logic, NOT external SDK internals.

Example:

```typescript
it("should return SuperwallProvider for intake profile", () => {
  mockGetActiveConfig.mockReturnValue({
    features: { billing: true },
    billing: { provider: "superwall", superwall: { ... } },
  });

  const provider = getBillingProvider();
  expect(provider.getProviderName()).toBe("superwall");
});
```

### 3. Supabase Client Tests

**File**: `__tests__/supabase.test.ts`

Tests:

- ✅ Singleton pattern
- ✅ Config integration
- ✅ Security (no service role key exposure)
- ✅ API surface

Example:

```typescript
it("should return the same instance on multiple calls", () => {
  const client1 = getSupabaseClient();
  const client2 = getSupabaseClient();
  expect(client1).toBe(client2);
});
```

## Mocking

### Mock External Dependencies

```typescript
// Mock Supabase
jest.mock("../src/lib/supabase", () => ({
  getSupabaseClient: jest.fn(() => ({
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  })),
}));

// Mock config
jest.mock("../src/lib/config", () => ({
  getActiveConfig: jest.fn(),
}));
```

### Reset State Between Tests

```typescript
beforeEach(() => {
  // Clear caches
  __clearConfigCache();
  __resetBillingProvider();
  __resetSupabaseClient();

  // Reset mocks
  jest.clearAllMocks();
});
```

### Mock Environment Variables

```typescript
beforeEach(() => {
  process.env.EXPO_PUBLIC_APP_PROFILE = "caloric";
  process.env.EXPO_PUBLIC_APP_ENV = "dev";
});
```

## Testing Patterns

### Testing Config Changes

```typescript
it("should reload config after cache clear", () => {
  process.env.EXPO_PUBLIC_APP_PROFILE = "caloric";
  const config1 = getActiveConfig();

  __clearConfigCache();

  process.env.EXPO_PUBLIC_APP_PROFILE = "proxi";
  const config2 = getActiveConfig();

  expect(config1.app.name).toBe("Intake");
  expect(config2.app.name).toBe("Proxi");
});
```

### Testing Async Operations

```typescript
it("should initialize provider", async () => {
  const provider = getBillingProvider();
  await expect(provider.initialize()).resolves.not.toThrow();
});
```

### Testing Error Cases

```typescript
it("should throw error for unknown profile", () => {
  process.env.EXPO_PUBLIC_APP_PROFILE = "nonexistent";
  expect(() => getActiveConfig()).toThrow();
});
```

### Testing Security

```typescript
it("should reject Stripe secret keys in config", () => {
  expect(() => {
    if (key.includes("sk_")) {
      throw new Error("SECURITY ERROR: Stripe secret key detected");
    }
  }).toThrow("secret key");
});
```

## Coverage

### Coverage Thresholds

Current requirements (70%):

- Branches: 70%
- Functions: 70%
- Lines: 70%
- Statements: 70%

### View Coverage Report

```bash
npm run test:coverage
open coverage/lcov-report/index.html  # macOS
```

### Excluded from Coverage

- Type definition files (`*.d.ts`)
- Example files (`src/examples/**`)
- Type-only files (`src/types/**`)

## CI/CD Integration

### Pre-commit Hook

Runs on `git commit`:

- Prettier (format code)
- ESLint (lint code)

```bash
# .husky/pre-commit
npx lint-staged
```

### Pre-push Hook

Runs on `git push`:

- TypeScript check
- Jest tests

```bash
# .husky/pre-push
npm run typecheck && npm run test
```

### GitHub Actions

Runs on push to `main` or `develop`:

1. Install dependencies
2. TypeScript check
3. ESLint
4. Jest tests with coverage
5. Upload coverage to Codecov

See `.github/workflows/ci.yml`

## Best Practices

### 1. Clear Test Names

```typescript
// ❌ Bad
it("works", () => { ... });

// ✅ Good
it("should return free entitlement when billing is disabled", () => { ... });
```

### 2. Test One Thing at a Time

```typescript
// ❌ Bad
it("should handle config and billing", () => {
  const config = getActiveConfig();
  const provider = getBillingProvider();
  // Testing too much
});

// ✅ Good
it("should load correct config profile", () => { ... });
it("should select correct billing provider", () => { ... });
```

### 3. Use beforeEach for Setup

```typescript
describe("Feature", () => {
  let provider: BillingProvider;

  beforeEach(() => {
    provider = getBillingProvider();
  });

  it("should do X", () => {
    // Use provider
  });
});
```

### 4. Mock External Dependencies

```typescript
// ❌ Bad: Testing Superwall SDK internals
it("should call Superwall.configure()", () => { ... });

// ✅ Good: Testing our adapter logic
it("should initialize with API key", async () => {
  const provider = getBillingProvider();
  await expect(provider.initialize()).resolves.not.toThrow();
});
```

### 5. Test Error Cases

```typescript
it("should throw if called before initialize", async () => {
  const provider = getBillingProvider();
  await expect(provider.getEntitlements()).rejects.toThrow(
    "Must call initialize() first"
  );
});
```

## Debugging Tests

### Run Single Test File

```bash
npm test config.test.ts
```

### Run Single Test

```bash
npm test -- -t "should load intake profile"
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--no-cache"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

### Verbose Output

```bash
npm test -- --verbose
```

## Common Issues

### "Cannot find module" Error

**Cause**: Module not mocked or path incorrect

**Solution**:

1. Check `moduleNameMapper` in `jest.config.js`
2. Add mock in `__mocks__/` directory
3. Use `jest.mock()` in test file

### Tests Fail Due to Cached Config

**Cause**: Config cached from previous test

**Solution**:

```typescript
beforeEach(() => {
  __clearConfigCache();
  __resetBillingProvider();
});
```

### TypeScript Errors in Tests

**Cause**: Types not available or incorrect

**Solution**:

1. Install `@types/jest`
2. Check `tsconfig.json` includes test files
3. Use type assertions if needed: `as jest.MockedFunction<typeof fn>`

### Async Tests Timing Out

**Cause**: Promise never resolves/rejects

**Solution**:

1. Check mock returns Promise
2. Increase timeout: `jest.setTimeout(10000)`
3. Use `await expect(promise).resolves/rejects`

## Performance Tips

### Skip Slow Tests During Development

```typescript
it.skip("slow test", () => { ... });
```

### Run Related Tests Only

```bash
npm run test:watch
# Press 'p' to filter by filename
# Press 't' to filter by test name
```

### Parallelize Tests

Jest runs tests in parallel by default. To run sequentially:

```bash
npm test -- --runInBand
```

## Next Steps

- [ ] Add more integration tests (e.g., full billing flow)
- [ ] Add E2E tests with Detox or Maestro
- [ ] Increase coverage thresholds (aim for 80-90%)
- [ ] Add visual regression tests with Storybook
- [ ] Add performance benchmarks

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Native Testing Library](https://callstack.github.io/react-native-testing-library/)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
