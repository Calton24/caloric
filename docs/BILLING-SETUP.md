# Billing System Setup Guide

## Architecture Overview

This caloric billing system uses:

- **Stripe** for payment processing (server-side via Supabase Edge Functions)
- **Superwall** for native mobile paywalls (iOS/Android SDK integration)
- **Supabase** for auth, database (subscription state), and Edge Functions
- **Unified BillingProvider interface** for app-agnostic code

## Prerequisites

1. **Stripe Account**
   - Create account at https://stripe.com
   - Get publishable key (pk*test*_ or pk*live*_)
   - Create subscription products and prices
   - Note the price IDs (price\_\*)

2. **Supabase Project**
   - Create project at https://supabase.com
   - Get project URL and anon key
   - Get service role key (for Edge Functions)

3. **Superwall Account** (optional, for native paywalls)
   - Create account at https://superwall.com
   - Get API key

## Installation

### 1. Install Dependencies

```bash
# Core dependencies (already installed)
npm install @supabase/supabase-js expo-constants zod

# Test dependencies
npm install --save-dev jest ts-jest @types/jest
```

### 2. Configure Jest

Create or update `jest.config.js`:

```javascript
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  testMatch: ["**/__tests__/**/*.test.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/examples/**",
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};
```

### 3. Set Up Supabase Database

Run the migration:

```bash
# Using Supabase CLI
npx supabase migration up

# Or manually execute in SQL Editor:
# supabase/migrations/20260204000001_create_subscriptions_table.sql
```

### 4. Deploy Edge Functions

```bash
# Deploy create-checkout-session
npx supabase functions deploy create-checkout-session \
  --project-ref YOUR_PROJECT_REF

# Deploy stripe-webhook
npx supabase functions deploy stripe-webhook \
  --project-ref YOUR_PROJECT_REF

# Set environment secrets
npx supabase secrets set STRIPE_SECRET_KEY=sk_test_... \
  --project-ref YOUR_PROJECT_REF

npx supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_... \
  --project-ref YOUR_PROJECT_REF
```

### 5. Configure Stripe Webhooks

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://YOUR_PROJECT.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
4. Copy the webhook signing secret (whsec\_\*)
5. Add to Supabase secrets (see step 4)

## Configuration

### Update Profile Config

Edit `src/config/profiles/your-app.ts`:

```typescript
export const yourAppConfig: AppProfileConfig = {
  // ... other config

  billing: {
    provider: "stripe", // or "superwall"
    stripe: {
      publishableKey: "pk_test_...", // NEVER put sk_* here!
      mode: "checkout",
      priceIds: {
        monthly: "price_1234567890",
        yearly: "price_0987654321",
        pro: "price_abcdefghij",
      },
      defaultPriceId: "price_1234567890",
      successUrl: "yourapp://checkout/success",
      cancelUrl: "yourapp://checkout/cancel",
    },
  },

  features: {
    billing: true, // Enable billing system
    // ... other features
  },
};
```

### Environment Variables

Create `.env`:

```bash
# App config
EXPO_PUBLIC_APP_PROFILE=yourapp
EXPO_PUBLIC_APP_ENV=dev

# These are read from config, not env vars in client
# (shown here for reference only)
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test file
npm test billing

# Watch mode during development
npm test -- --watch
```

## TDD Workflow

1. **Write failing test** (`__tests__/feature.test.ts`)
2. **Run tests** (`npm test`) - should fail
3. **Implement minimal code** to pass test
4. **Run tests again** - should pass
5. **Refactor** if needed
6. **Repeat**

Example:

```typescript
// 1. Write test first (RED)
it("should map active subscription to pro tier", async () => {
  // Setup mock subscription data
  mockSubscription({ status: "active", price_id: "price_pro" });

  const entitlement = await provider.getEntitlements();

  expect(entitlement.tier).toBe("pro");
  expect(entitlement.isActive).toBe(true);
});

// 2. Run: npm test (FAILS)

// 3. Implement (GREEN)
async getEntitlements() {
  const sub = await this.fetchSubscription();
  return this.mapToEntitlement(sub);
}

// 4. Run: npm test (PASSES)

// 5. Refactor if needed

// 6. Next test...
```

## Usage in App

```typescript
import { initializeBilling, getBillingProvider } from "@/lib/billing";

// Initialize on app start
useEffect(() => {
  initializeBilling().catch(console.error);
}, []);

// Present paywall
const showUpgrade = async () => {
  const provider = getBillingProvider();
  await provider.presentPaywall("monthly"); // Trigger from config
};

// Check entitlements
const checkPro = async () => {
  const provider = getBillingProvider();
  const entitlement = await provider.getEntitlements();

  if (entitlement.isPro) {
    // Show pro features
  }
};

// Restore purchases
const restore = async () => {
  const provider = getBillingProvider();
  await provider.restorePurchases();
};
```

## Security Checklist

- [ ] **Never** put `sk_*` keys in client code or config
- [ ] **Never** put `whsec_*` webhook secrets in client
- [ ] Stripe operations **must** go through Supabase Edge Functions
- [ ] Webhooks **must** verify signatures
- [ ] Client reads subscription state from Supabase (with RLS)
- [ ] Service role key is **only** in Edge Function environment
- [ ] Environment variables use `EXPO_PUBLIC_*` prefix for client values

## Troubleshooting

### Tests fail with "Cannot find module"

```bash
# Clear Jest cache
npx jest --clearCache
npm test
```

### Subscription not updating

1. Check Stripe webhook logs (Dashboard → Developers → Webhooks)
2. Check Edge Function logs: `npx supabase functions logs stripe-webhook`
3. Verify webhook secret is correct
4. Check database: `SELECT * FROM subscriptions WHERE user_id = '...'`

### Checkout session fails

1. Verify publishable key in config
2. Check Edge Function logs: `npx supabase functions logs create-checkout-session`
3. Ensure user is authenticated (JWT in Authorization header)
4. Verify price IDs exist in Stripe

### RLS blocking queries

1. Ensure user is authenticated
2. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'subscriptions'`
3. Verify user_id matches auth.uid()

## Git Hooks (Optional)

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
npm test
npm run type-check
```

Install Husky:

```bash
npm install --save-dev husky
npx husky install
npx husky add .husky/pre-commit "npm test"
```

## Next Steps

1. [ ] Run tests: `npm test`
2. [ ] Deploy Edge Functions
3. [ ] Configure Stripe webhooks
4. [ ] Update app profile config
5. [ ] Test checkout flow end-to-end
6. [ ] Monitor webhook deliveries
7. [ ] Set up alerts for failed payments

## Support

- Stripe Docs: https://stripe.com/docs
- Supabase Docs: https://supabase.com/docs
- Superwall Docs: https://docs.superwall.com
- Issues: File in repo issues
