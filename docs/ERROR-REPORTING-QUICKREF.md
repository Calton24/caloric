# Error Reporting - Quick Reference

## 📦 Files Added

```
src/infrastructure/errorReporting/
├── index.ts                  # Public API
├── types.ts                  # Interface definitions
├── NoopErrorReporter.ts      # No-op implementation
├── SentryErrorReporter.ts    # Sentry provider
├── factory.ts                # Reporter factory
└── ErrorBoundary.tsx         # React Error Boundary

docs/ERROR_REPORTING.md       # Full documentation
```

## 🔧 Files Modified

- `package.json` → Added `@sentry/react-native: ~6.5.0`
- `src/CaloricProviders.tsx` → Added ErrorBoundary + `initErrorReporting()`
- `app.config.ts` → Added Sentry plugin + `extra` config
- `.env.example` → Added Sentry env var examples

## 🚀 Usage in Code

```typescript
import { getErrorReporter } from "@/src/infrastructure/errorReporting";

// Capture exception
getErrorReporter().captureException(error, { userId: "123" });

// Capture message
getErrorReporter().captureMessage("Warning", "warning", { context: "data" });

// Set user
getErrorReporter().setUser({ id: "123", email: "user@example.com" });

// Add breadcrumb
getErrorReporter().addBreadcrumb({
  message: "User clicked button",
  category: "ui",
  data: { buttonId: "submit" },
});

// Set tag
getErrorReporter().setTag("feature", "checkout");
```

## 🔐 Environment Setup

```bash
# Runtime (optional - leave unset to disable)
EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/123

# Runtime (optional - enable in dev)
EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV=true

# Build time (for source maps)
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-token
```

## ✅ Verification

```bash
npm run typecheck  # ✅ Passes
npm run lint       # ✅ Passes
npm test           # ✅ 128 tests pass
```

## 🎯 Key Features

- **Zero coupling** - Only one file imports Sentry SDK
- **Safe no-op** - Works without configuration
- **Auto-disabled in dev** - Opt-in for development
- **Provider agnostic** - Easy to swap providers
- **Error Boundary** - Catches React errors automatically
- **No code changes needed** - Already integrated in CaloricProviders

## 📚 Documentation

Full guide: [`docs/ERROR_REPORTING.md`](docs/ERROR_REPORTING.md)
