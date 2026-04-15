# Error Reporting - Usage Guide

## Overview

The error reporting subsystem provides optional Sentry integration with zero coupling to the rest of the codebase. If not configured, everything safely no-ops.

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

The `@sentry/react-native` package is already in `package.json`.

### 2. Configure Environment Variables

Create or update your `.env` file:

```bash
# Optional - only set if you want error reporting
EXPO_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Optional - enable Sentry in development (disabled by default)
# EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV=true

# For Sentry source map uploads (build time)
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
SENTRY_AUTH_TOKEN=your-auth-token
```

### 3. That's It!

Error reporting is **automatically initialized** in `CaloricProviders` and works immediately.

## How It Works

1. **Initialization**: `initErrorReporting()` is called when `CaloricProviders` mounts
2. **No-op by default**: If `EXPO_PUBLIC_SENTRY_DSN` is not set, a no-op reporter is used
3. **ErrorBoundary**: Wraps the entire app to catch React errors
4. **Disabled in dev**: Sentry is disabled in `__DEV__` unless explicitly enabled

## Usage in Your Code

### Report Exceptions

```typescript
import { getErrorReporter } from "@/src/infrastructure/errorReporting";

try {
  // Your code
} catch (error) {
  getErrorReporter().captureException(error as Error, {
    context: "user-action",
    userId: "123",
  });
}
```

### Report Messages

```typescript
import { getErrorReporter } from "@/src/infrastructure/errorReporting";

getErrorReporter().captureMessage("Something unexpected happened", "warning", {
  feature: "checkout",
  step: "payment",
});
```

### Set User Context

```typescript
import { getErrorReporter } from "@/src/infrastructure/errorReporting";

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
import { getErrorReporter } from "@/src/infrastructure/errorReporting";

getErrorReporter().addBreadcrumb({
  message: "User clicked checkout",
  category: "user-action",
  level: "info",
  data: {
    cartValue: 99.99,
    items: 3,
  },
});
```

### Set Tags

```typescript
import { getErrorReporter } from "@/src/infrastructure/errorReporting";

getErrorReporter().setTag("feature", "onboarding");
getErrorReporter().setTag("experiment", "new-flow-v2");
```

## Behavior Matrix

| Scenario                                      | Behavior                     |
| --------------------------------------------- | ---------------------------- |
| `EXPO_PUBLIC_SENTRY_DSN` not set              | No-op reporter (safe)        |
| `EXPO_PUBLIC_SENTRY_DSN` set + `__DEV__=true` | No-op (disabled in dev)      |
| `EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV=true`       | Sentry enabled even in dev   |
| `EXPO_PUBLIC_SENTRY_DSN` set + production     | Sentry enabled automatically |

## For New Apps (Forking caloric)

When you fork/clone `caloric` for a new app:

1. **No code changes needed** - error reporting is already integrated
2. **Add Sentry DSN** to your `.env` file (or leave unset to disable)
3. **Configure Sentry project** at https://sentry.io
4. **Update `SENTRY_ORG` and `SENTRY_PROJECT`** in `.env` for source map uploads

That's it! Your app has error reporting with zero coupling.

## Testing

### Test in Development

```bash
# Enable Sentry in dev mode
export EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV=true
export EXPO_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Run app
npm run ios
```

### Test Error Boundary

Add a test button that throws an error:

```typescript
<Button
  onPress={() => {
    throw new Error("Test error boundary");
  }}
  title="Test Error"
/>
```

### Test No-op Mode

```bash
# Don't set EXPO_PUBLIC_SENTRY_DSN
unset EXPO_PUBLIC_SENTRY_DSN

# Run app - should see "error reporting disabled" in logs
npm run ios
```

## Architecture

```
src/infrastructure/errorReporting/
├── index.ts                    # Public API (barrel export)
├── types.ts                    # Interfaces and types
├── NoopErrorReporter.ts        # No-op implementation (default)
├── SentryErrorReporter.ts      # Sentry implementation (only file that imports Sentry)
├── factory.ts                  # Creates appropriate reporter based on config
└── ErrorBoundary.tsx           # React Error Boundary
```

**Key principle**: Only `SentryErrorReporter.ts` imports `@sentry/react-native`. The rest of the app uses the abstraction.

## Customization

### Custom Error Boundary UI

```typescript
import { ErrorBoundary } from "@/src/infrastructure/errorReporting";

<ErrorBoundary
  fallback={(error, retry) => (
    <View>
      <Text>Oops! {error.message}</Text>
      <Button onPress={retry}>Try Again</Button>
    </View>
  )}
>
  {children}
</ErrorBoundary>;
```

### Custom beforeSend Filter

```typescript
// In factory.ts, modify the config:
const config: ErrorReporterConfig = {
  dsn: sentryDsn,
  environment,
  enableInDevelopment: enableInDev,
  debug: __DEV__,
  beforeSend: (error, context) => {
    // Filter out specific errors
    if (error.message.includes("Network request failed")) {
      return false; // Don't send
    }
    return true; // Send
  },
};
```

## Troubleshooting

### Sentry not initializing

Check logs for:

```
[SentryErrorReporter] No DSN provided - error reporting disabled
```

Solution: Set `EXPO_PUBLIC_SENTRY_DSN` in `.env`

### Sentry disabled in development

Expected behavior. To enable:

```bash
export EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV=true
```

### Source maps not uploading

Ensure build-time variables are set:

```bash
SENTRY_ORG=your-org
SENTRY_PROJECT=your-project
SENTRY_AUTH_TOKEN=your-token
```

Then rebuild:

```bash
npx expo prebuild --clean
npx expo run:ios
```

## Production Checklist

- [ ] `EXPO_PUBLIC_SENTRY_DSN` set in production environment
- [ ] `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` set for builds
- [ ] Test error reporting works in staging
- [ ] Verify source maps upload during build
- [ ] Set up Sentry alerts/notifications
- [ ] Configure release tracking (optional)

## Future Providers

To add a different provider (e.g., Bugsnag, Rollbar):

1. Create `BugsnagErrorReporter.ts` implementing `ErrorReporter` interface
2. Update `factory.ts` to check for `EXPO_PUBLIC_BUGSNAG_API_KEY`
3. No other code changes needed!

The abstraction layer keeps the codebase provider-agnostic.
