# Error Reporting Implementation Summary

## ✅ Implementation Complete

Optional error reporting subsystem with Sentry integration added to caloric. Zero coupling, safe no-op when not configured.

---

## 📁 New Files Created

```
src/infrastructure/errorReporting/
├── index.ts                    # Public API (barrel export)
├── types.ts                    # ErrorReporter interface & types
├── NoopErrorReporter.ts        # No-op implementation (default)
├── SentryErrorReporter.ts      # Sentry provider (only file importing Sentry SDK)
├── factory.ts                  # Creates appropriate reporter based on config
└── ErrorBoundary.tsx           # React Error Boundary component

docs/
└── ERROR_REPORTING.md          # Complete usage guide
```

---

## 📝 Modified Files

### 1. `package.json`

**Added dependency:**

```json
"@sentry/react-native": "~6.5.0"
```

### 2. `src/CaloricProviders.tsx`

**Changes:**

- Imported `ErrorBoundary` and `initErrorReporting`
- Added `useEffect` to call `initErrorReporting()` on mount
- Wrapped entire app tree with `<ErrorBoundary>`

### 3. `app.config.ts`

**Added:**

- Sentry plugin to `plugins` array for source map uploads
- Sentry config to `extra` object (runtime access to DSN, environment)

### 4. `.env.example`

**Added:**

- `EXPO_PUBLIC_SENTRY_DSN` - Sentry DSN (runtime)
- `EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV` - Enable in dev (runtime)
- `SENTRY_ORG` - Organization slug (build time)
- `SENTRY_PROJECT` - Project slug (build time)
- `SENTRY_AUTH_TOKEN` - Auth token (build time)

---

## 🔧 Setup Instructions

### Install Dependencies

```bash
npm install --legacy-peer-deps
```

### Configure Environment (Optional)

```bash
# .env file - only if you want error reporting
EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Optional: enable in development (disabled by default)
# EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV=true

# For source map uploads (build time)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

---

## 📊 Behavior Matrix

| `EXPO_PUBLIC_SENTRY_DSN` | `__DEV__` | `ENABLE_SENTRY_IN_DEV` | Result                         |
| ------------------------ | --------- | ---------------------- | ------------------------------ |
| ❌ Not set               | Any       | Any                    | ✅ No-op (safe)                |
| ✅ Set                   | `true`    | ❌ Not set             | ✅ No-op (disabled in dev)     |
| ✅ Set                   | `true`    | ✅ Set to `true`       | 📊 Sentry enabled (dev mode)   |
| ✅ Set                   | `false`   | Any                    | 📊 Sentry enabled (production) |

**Default behavior:** Disabled in development, automatically enabled in production if DSN is set.

---

## 🎯 Usage Examples

### Capture Exceptions

```typescript
import { getErrorReporter } from "@/src/infrastructure/errorReporting";

try {
  await riskyOperation();
} catch (error) {
  getErrorReporter().captureException(error as Error, {
    context: "checkout",
    userId: user.id,
  });
}
```

### Capture Messages

```typescript
getErrorReporter().captureMessage("Payment processing failed", "error", {
  orderId: "123",
  amount: 99.99,
});
```

### Set User Context

```typescript
// On login
getErrorReporter().setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// On logout
getErrorReporter().setUser(null);
```

### Add Breadcrumbs

```typescript
getErrorReporter().addBreadcrumb({
  message: "User added item to cart",
  category: "user-action",
  level: "info",
  data: { productId: "xyz", price: 29.99 },
});
```

### Set Tags

```typescript
getErrorReporter().setTag("feature", "onboarding");
getErrorReporter().setTag("experiment", "new-ui-v2");
```

---

## ✅ Verification

### Type Check

```bash
npm run typecheck
# ✅ Passes
```

### Tests

```bash
npm test
# ✅ 128 tests pass (9 test suites)
```

### Lint

```bash
npm run lint
# ✅ Passes
```

---

## 🏗️ Architecture Highlights

1. **Zero Coupling**: Only `SentryErrorReporter.ts` imports Sentry SDK
2. **Provider Agnostic**: Interface allows swapping providers (Bugsnag, Rollbar, etc.)
3. **Safe No-op**: Missing config = no errors, just silent no-op
4. **Automatic Init**: Called in `CaloricProviders`, no manual setup needed
5. **Error Boundary**: Catches React errors automatically
6. **Environment Aware**: Disabled in dev by default, respects `__DEV__`

---

## 📦 For Future Apps (Forking caloric)

When you clone/fork caloric for a new app:

1. **No code changes needed** ✅
2. Add `EXPO_PUBLIC_SENTRY_DSN` to `.env` (or leave unset to disable)
3. Configure Sentry project at https://sentry.io
4. Set `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` for builds

That's it! Error reporting works immediately.

---

## 🔍 Key Design Decisions

1. **Optional by default**: No DSN = no-op, never crashes
2. **Disabled in dev**: Avoids noise during development (override with `ENABLE_SENTRY_IN_DEV`)
3. **Singleton pattern**: One reporter instance, initialized once
4. **ErrorBoundary placement**: At root level, catches all React errors
5. **Context flexibility**: All methods accept optional context for rich debugging

---

## 📚 Documentation

- **Full Guide**: [`docs/ERROR_REPORTING.md`](/Users/calton/Coding/Mobile/caloric/docs/ERROR_REPORTING.md)
- **Environment Setup**: [`.env.example`](/Users/calton/Coding/Mobile/caloric/.env.example)

---

## 🎉 Done!

Error reporting is now fully integrated and ready for production use in caloric and all future apps.

Safe defaults, zero coupling, opt-in functionality. ✨
