# TDD Plan: Billing System Implementation

## Phase 1: Config Validation (DONE ✓)

- [x] Test: billing enabled + missing config => throws in dev
- [x] Test: billing enabled + missing config => no-op in prod
- [x] Test: stripe provider + missing stripe config => throws
- [x] Test: superwall provider + missing superwall config => throws
- [x] Test: stripe publishable key validation (pk\_\* required)
- [x] Test: security - reject sk*/rk* in client config
- [x] Test: Supabase URL accepts custom domains

## Phase 2: Provider Factory (DONE ✓)

- [x] Test: billing disabled => NoBillingProvider
- [x] Test: stripe selected => StripeProvider instance
- [x] Test: superwall selected => SuperwallProvider instance
- [x] Test: provider caching works
- [x] Test: \_\_resetBillingProvider clears cache
- [x] Test: unknown provider => throws

## Phase 3: StripeProvider Core (DONE ✓)

- [x] Test: initialize requires authenticated user
- [x] Test: presentPaywall calls edge function with correct payload
- [x] Test: presentPaywall with trigger maps to priceId correctly
- [x] Test: presentPaywall with no trigger uses defaultPriceId
- [x] Test: presentPaywall throws if priceId not found
- [x] Test: getEntitlements returns free tier when no subscription
- [x] Test: getEntitlements maps active subscription correctly
- [x] Test: getEntitlements maps expired subscription correctly
- [x] Test: getEntitlements maps canceled subscription correctly
- [x] Test: mapPriceIdToTier handles enterprise/team/pro tiers
- [x] Test: restorePurchases syncs from Supabase DB

## Phase 4: SuperwallProvider (DONE ✓)

- [x] Test: default trigger selection logic
- [x] Test: presentPaywall uses trigger from config
- [x] Test: mock implementation doesn't throw

## Phase 5: Supabase Integration (DONE ✓)

- [x] SQL: subscriptions table schema
- [x] SQL: RLS policies (users can SELECT own rows, service_role has full access)
- [x] Edge Function: create-checkout (Deno, TypeScript)
- [x] Edge Function: stripe-webhook (signature verification, DB updates)
- [x] Test: subscription DB queries work (via enhanced tests)
- [x] Implementation: Enhanced StripeProvider.getEntitlements() with proper tier mapping

## Phase 6: End-to-End Scenarios (TO BUILD)

- [ ] Test: user upgrades => entitlement changes
- [ ] Test: subscription expires => downgrade to free
- [ ] Test: restore purchases syncs state
- [ ] Test: concurrent requests are idempotent
