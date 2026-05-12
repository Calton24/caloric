# Sentry alerts for food logging

Food logging errors and test events are tagged in Sentry for filtering and alerting.

## Tags on events

| Tag | Meaning |
|-----|---------|
| `area` | Always `food_logging` for funnel-specific captures |
| `flow` | `manual` \| `voice` \| `ai_camera` \| `barcode` \| `quick_add` \| `confirm_meal` \| `sync` \| `scan_result` \| `unknown` |
| `step` | Concrete step, e.g. `validate_draft`, `remote_sync_failed`, `router_push_confirm_meal` |
| `route` | Optional screen path when known |
| `test` | `true` only for `triggerFoodLoggingTestError()` / dev global hook |

Breadcrumbs use `category: "food_logging"` and message keys like `food_logging.save_started`.

## Email / Slack alert (Sentry dashboard)

1. In Sentry: **Alerts → Create Alert → Issue alerts**.
2. **Conditions**: “A new issue is created” or “Event frequency” with threshold 1 in 1 minute for high signal.
3. **Filter** (if your plan supports tag filters):
   - `area` equals `food_logging`, **or**
   - `tags[test]` equals `true` (for QA-only test events).
4. **Action**: Email project owners (and optionally add Slack/Discord via Integrations).

If tag filters are not available on your plan, use **Issue search** saved query: `area:food_logging` and subscribe to weekly digests, or use **Discover** with the same filter.

## Why email might not fire

- **No DSN in build**: `EXPO_PUBLIC_SENTRY_DSN` must be set for release builds. `Sentry.init` is disabled when DSN is missing.
- **`initErrorReporting` vs native init**: The app initializes Sentry in `app/_layout.tsx`. The JS reporter wrapper also requires `features.crashReporting` + DSN in `initErrorReporting()` (see `CalCutProviders`). If DSN is set but `crashReporting` is false, some wrapper paths no-op while native SDK may still capture — align config for production.
- **Quota / spike protection**: Check Sentry **Stats** and **Inbound Filters**.
- **`beforeSend`**: The app’s `beforeSend` returns the event unchanged (no accidental drops).

## Dev test hooks

After a dev client loads with Sentry enabled:

- `globalThis.__triggerSentryTestError?.()` — generic SDK smoke test.
- `globalThis.__triggerFoodLoggingTestError?.()` — fires `captureFoodLoggingError` with `test=true` and a breadcrumb so you can verify tags and the breadcrumb trail on the issue.

Requires `EXPO_PUBLIC_SENTRY_DSN` and, in development, `EXPO_PUBLIC_ENABLE_SENTRY_IN_DEV=true` if you gate dev traffic.

## Source maps (EAS)

Ensure `@sentry/react-native/expo` plugin in `app.config.ts` has `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` at build time so uploaded maps match `release` / `dist` from `app/_layout.tsx` (`slug@version` and native build version when available).
