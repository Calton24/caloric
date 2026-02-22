# Billing System

A unified billing abstraction layer supporting multiple payment providers with a consistent entitlement model.

## Overview

The billing system provides:

- **Unified Interface**: Same API across all billing providers
- **Config-Based Selection**: Provider chosen via app profile config
- **Consistent Entitlements**: Standardized access control model
- **Safe No-Op Mode**: Graceful degradation when billing is disabled
- **Security First**: Prevents secret keys in client config

## Supported Providers

### Superwall (Mobile IAP)

- **Use Case**: Mobile apps with native iOS/Android in-app purchases
- **Features**: Paywalls, A/B testing, analytics
- **Integration**: Direct SDK wrapper
- **Example**: Intake app (food tracking with premium features)

### Stripe (Web/B2B)

- **Use Case**: Web apps, B2B subscriptions, team plans
- **Features**: Flexible pricing, webhooks, customer portal
- **Integration**: Client-side via Supabase Edge Functions
- **Example**: Proxi app (social proximity with team subscriptions)

## Architecture

```
App Code
   ↓
getBillingProvider()
   ↓
┌──────────────────────────────────┐
│   BillingProvider Interface      │
│  - initialize()                  │
│  - getEntitlements()             │
│  - presentPaywall()              │
│  - onEntitlementsChanged()       │
│  - restorePurchases()            │
└──────────────────────────────────┘
   ↓                ↓               ↓
Superwall      Stripe          No-Op
(mobile)     (web/B2B)       (disabled)
```

## Configuration

### Superwall Configuration

```typescript
// src/config/profiles/intake.ts
export default {
  features: {
    billing: true, // Enable billing
  },
  billing: {
    provider: "superwall",
    superwall: {
      apiKey: "pk_xxx", // Superwall public API key
      triggers: {
        premium: "premium_paywall",
        pro: "pro_subscription",
        foodScanning: "food_scan_limit",
      },
    },
  },
};
```

### Stripe Configuration

```typescript
// src/config/profiles/proxi.ts
export default {
  features: {
    billing: true, // Enable billing
  },
  billing: {
    provider: "stripe",
    stripe: {
      publishableKey: "pk_live_xxx", // Stripe publishable key (starts with pk_)
      pricingTableId: "prctbl_xxx", // Pricing table ID
      webhookMode: "supabase", // Webhooks handled by Supabase Edge Function
    },
  },
};
```

**Security**: Zod validation automatically rejects `sk_` (secret key) or `rk_` (restricted key) patterns.

## Usage

### Initialize Billing

```typescript
// App.tsx
import { initializeBilling } from "@/lib/billing";

export default function App() {
  useEffect(() => {
    initializeBilling().catch(console.error);
  }, []);

  return <YourApp />;
}
```

### Check Entitlements

```typescript
import { getBillingProvider } from "@/lib/billing";

function PremiumFeature() {
  const [entitlement, setEntitlement] = useState(null);

  useEffect(() => {
    const provider = getBillingProvider();
    provider.getEntitlements().then(setEntitlement);

    // Listen for changes (purchases, expirations)
    provider.onEntitlementsChanged(setEntitlement);
  }, []);

  if (!entitlement?.isPro) {
    return <UpgradePrompt />;
  }

  return <PremiumContent />;
}
```

### Present Paywall

```typescript
import { getBillingProvider } from "@/lib/billing";

function UpgradeButton() {
  const handleUpgrade = async () => {
    const provider = getBillingProvider();
    await provider.presentPaywall("premium_paywall");
  };

  return <Button onPress={handleUpgrade}>Upgrade to Pro</Button>;
}
```

### Restore Purchases

```typescript
import { getBillingProvider } from "@/lib/billing";

function RestorePurchasesButton() {
  const handleRestore = async () => {
    const provider = getBillingProvider();
    await provider.restorePurchases();
  };

  return <Button onPress={handleRestore}>Restore Purchases</Button>;
}
```

## Entitlement Model

All providers return the same entitlement structure:

```typescript
interface Entitlement {
  isPro: boolean; // Quick check for pro features
  tier: SubscriptionTier; // "free" | "pro" | "team" | "enterprise"
  expiresAt: Date | null; // When subscription expires (null if free)
  isActive: boolean; // Whether subscription is currently active
  productId?: string; // Provider-specific product/price ID
}
```

### Usage Examples

```typescript
// Simple pro check
if (entitlement.isPro) {
  // Enable premium features
}

// Tier-based access
switch (entitlement.tier) {
  case "free":
    // Limited features
    break;
  case "pro":
    // Pro features
    break;
  case "team":
    // Team collaboration features
    break;
  case "enterprise":
    // Full feature set + priority support
    break;
}

// Expiration check
if (entitlement.expiresAt) {
  const daysLeft = Math.ceil(
    (entitlement.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  console.log(`Subscription expires in ${daysLeft} days`);
}
```

## Provider Implementation Details

### Superwall Provider

**Implementation**: `src/lib/billing/superwall.ts`

Wraps the Superwall SDK:

```typescript
// TODO: Install Superwall SDK
// npm install @superwall/react-native-superwall

// Initialization
await Superwall.configure(config.apiKey);

// Present paywall
await Superwall.shared.present(trigger);

// Get subscription status
const status = await Superwall.shared.getSubscriptionStatus();
```

**Mapping**: Product IDs to subscription tiers determined by your Superwall dashboard configuration.

### Stripe Provider

**Implementation**: `src/lib/billing/stripe.ts`

Client-side only, uses Supabase Edge Functions:

```typescript
// Create checkout session (via Edge Function)
const { data } = await supabase.functions.invoke("create-checkout", {
  body: {
    priceId: "price_xxx",
    userId: user.id,
    successUrl: "myapp://checkout/success",
    cancelUrl: "myapp://checkout/cancel",
  },
});

// Open checkout URL
await openBrowserAsync(data.url);

// Query subscription from database (updated by webhook)
const { data: subscription } = await supabase
  .from("subscriptions")
  .select("*")
  .eq("user_id", userId)
  .eq("status", "active")
  .single();
```

**Required Setup**:

1. Create Supabase Edge Function `create-checkout`
2. Add Stripe webhook endpoint → Edge Function
3. Create `subscriptions` table
4. Edge Function updates database on webhook events

**Security**: Stripe secret key lives in Edge Function environment variables, never in mobile app.

## Testing

Tests focus on **adapter logic**, not external SDK internals:

```typescript
// Mock external dependencies
jest.mock("@superwall/react-native-superwall");
jest.mock("../src/lib/supabase");

// Test provider selection logic
describe("Provider Selection", () => {
  it("should return correct provider based on config", () => {
    const provider = getBillingProvider();
    expect(provider.getProviderName()).toBe("superwall");
  });
});

// Test entitlement mapping
describe("Entitlement Model", () => {
  it("should return consistent structure across providers", async () => {
    const entitlement = await provider.getEntitlements();
    expect(entitlement).toHaveProperty("isPro");
    expect(entitlement).toHaveProperty("tier");
  });
});
```

Run tests:

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

## Development Workflow

### Disable Billing for Development

```typescript
// src/config/profiles/intake.ts
export default {
  environments: {
    dev: {
      features: {
        billing: false, // Disable in dev
      },
    },
  },
};
```

When disabled, `getBillingProvider()` returns `NoBillingProvider` (no-op).

### Testing Paywalls

1. Set `billing: true` in dev environment
2. Use Superwall test mode or Stripe test keys
3. Test purchases without real charges

### Adding a New Provider

1. Create `src/lib/billing/your-provider.ts`
2. Implement `BillingProvider` interface
3. Add config types to `src/config/types.ts`
4. Add Zod schema to `src/config/schema.ts`
5. Update factory in `src/lib/billing/index.ts`
6. Add tests in `__tests__/billing.test.ts`

## Troubleshooting

### "Must call initialize() first"

Call `initializeBilling()` in App.tsx before using other methods.

### "SECURITY ERROR: Stripe secret key detected"

Replace `sk_xxx` or `rk_xxx` with `pk_xxx` (publishable key).

### Entitlements not updating

- **Superwall**: Check subscription status in Superwall dashboard
- **Stripe**: Verify webhook is firing and updating database

### No paywall shown (Superwall)

Check trigger name matches Superwall dashboard configuration.

### Checkout URL not opening (Stripe)

Ensure Edge Function `create-checkout` is deployed and working.

## Best Practices

1. **Initialize Early**: Call `initializeBilling()` in App.tsx
2. **Cache Entitlements**: Don't query on every render
3. **Listen for Changes**: Use `onEntitlementsChanged()` for real-time updates
4. **Handle Errors**: Wrap billing calls in try/catch
5. **Test No-Op Mode**: Verify app works with `billing: false`
6. **Secure Keys**: Never commit real API keys (use `.env` files)
7. **Feature Flags**: Use environment overrides for dev/staging

## Next Steps

- [ ] Install Superwall SDK: `npm install @superwall/react-native-superwall`
- [ ] Create Supabase Edge Function for Stripe checkout
- [ ] Set up Stripe webhook → Supabase Edge Function
- [ ] Create `subscriptions` table in Supabase
- [ ] Configure products in Superwall/Stripe dashboards
- [ ] Test purchases end-to-end in sandbox/test mode

## References

- [Superwall Documentation](https://docs.superwall.com/)
- [Stripe Documentation](https://stripe.com/docs)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
