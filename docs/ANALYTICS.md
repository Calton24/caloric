# Analytics

mobile-core ships a **vendor-agnostic analytics abstraction**. Feature code
calls `analytics.track()` / `.screen()` / `.identify()` / `.reset()` and
never touches a provider SDK directly.

## Architecture

```
┌──────────────────────────┐
│  Feature Code            │  analytics.track("food_scanned", { cal: 95 })
│  (screens, hooks, etc.)  │
└──────────┬───────────────┘
           │  import { analytics }
           ▼
┌──────────────────────────┐
│  analytics.ts singleton  │  try/catch proxy — never crashes
└──────────┬───────────────┘
           │  delegates to active AnalyticsClient
           ▼
┌──────────────────────────┐
│  PostHogAnalyticsClient  │  ← or NoopAnalyticsClient
│  (dynamic require)       │
└──────────────────────────┘
```

Only `src/infrastructure/analytics/` and `src/lib/` may import vendor SDKs.
ESLint enforces this boundary.

## Enable / Disable

Analytics is gated by **two things**:

| Control                                          | Where                      | Purpose                        |
| ------------------------------------------------ | -------------------------- | ------------------------------ |
| `features.analytics` (config profile)            | `src/config/profiles/*.ts` | Master kill-switch per product |
| `EXPO_PUBLIC_POSTHOG_API_KEY` (env var at build) | `.env` / `eas.json`        | Credentials (PostHog project)  |

**Decision matrix:**

| `features.analytics` | `EXPO_PUBLIC_POSTHOG_API_KEY` set? | Result           |
| -------------------- | ---------------------------------- | ---------------- |
| `false`              | _any_                              | Noop (silent)    |
| `true`               | no                                 | Noop (logs warn) |
| `true`               | yes                                | PostHog          |

## Setup for forks

### 1. Set env vars

```bash
# .env or eas.json
EXPO_PUBLIC_POSTHOG_API_KEY=phc_xxxxx
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com   # optional, defaults to US
```

### 2. Wire into `app.config.ts`

Already done — values are injected into `extra`:

```ts
extra: {
  POSTHOG_API_KEY: process.env.EXPO_PUBLIC_POSTHOG_API_KEY,
  POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
}
```

### 3. Install the provider SDK in your **fork** (not mobile-core)

```bash
npm install posthog-react-native
```

> mobile-core does **not** hard-install `posthog-react-native`.
> The `PostHogAnalyticsClient` uses `require("posthog-react-native")`
> inside a try/catch — if the package is missing it gracefully falls back
> to `NoopAnalyticsClient`.

### 4. Enable in config profile

```ts
// src/config/profiles/myapp.ts
features: {
  analytics: true,
}
```

That's it. `initAnalytics()` runs automatically in `MobileCoreProviders`.

## Auto screen tracking

`useScreenTracking()` is wired in the root layout (`app/_layout.tsx`).
It normalises expo-router pathnames (strips route groups like `(tabs)`,
dedupes consecutive identical screens) and calls `analytics.screen(name)`.
No per-screen code needed. See [SCREEN_TRACKING.md](SCREEN_TRACKING.md) for
name derivation rules and how to override.

## Auth lifecycle

`AuthProvider` handles identity automatically via the `onAuthStateChange`
listener — this is the single choke point that catches sign-in, sign-up,
OAuth, deep-link token exchange, and session restore.

| Event              | Analytics call                                                                                      |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Session restored   | `analytics.identify(user.id, { email })`                                                            |
| Auth state → user  | `analytics.identify(user.id, { email })` (via `onAuthStateChange`)                                  |
| Auth state → null  | `analytics.reset()` (via `onAuthStateChange`)                                                       |
| Sign in (explicit) | `analytics.track("sign_in", { method })` (before state change)                                      |
| Sign up (explicit) | `analytics.track("sign_up", { method })` (before state change)                                      |
| Sign out           | `analytics.track("sign_out")` **then** `reset()` (track fires first so the event has user identity) |

## Manual tracking

```ts
import { analytics } from "@/src/infrastructure/analytics";

// Custom event
analytics.track("purchase_completed", { plan: "pro", price: 9.99 });

// Manual screen (if not using auto tracking)
analytics.screen("Onboarding", { step: 3 });

// Identify with traits
analytics.identify(userId, { subscription: "premium" });
```

## Adding a new provider

1. Create `src/infrastructure/analytics/MyProviderClient.ts`
   implementing `AnalyticsClient`.
2. Update `factory.ts` to instantiate it based on config/credentials.
3. Keep the SDK import behind `try/catch` or dynamic `require`.

That's it — feature code doesn't change.
