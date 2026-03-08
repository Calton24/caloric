# Screen Tracking

Auto screen tracking is handled by `useScreenTracking()` in
`src/infrastructure/analytics/useScreenTracking.ts`, wired once in
`app/_layout.tsx`.

## How screen names are derived

1. expo-router's `usePathname()` returns the raw URL pathname:

   ```
   /(tabs)/home           → raw from router
   /(tabs)/caloric/primitives
   /auth/forgot-password
   /modal
   ```

2. `normalisePathname()` cleans it up:
   - **Strip route groups** — parenthesised segments like `(tabs)` or `(drawer)` are removed.
   - **Collapse duplicate slashes** — `//home///` → `/home`
   - **Strip trailing slash** — `/settings/` → `/settings`
   - **Root** — `/(tabs)/` or `/(tabs)` both resolve to `/`

   Result:

   ```
   /(tabs)/home                    → /home
   /(tabs)/caloric/primitives  → /caloric/primitives
   /auth/forgot-password           → /auth/forgot-password
   /modal                          → /modal
   /(tabs)/                        → /
   ```

3. **Dedupe** — `shouldTrackScreen()` suppresses consecutive identical screen
   names, so rapid re-renders or tab refocuses don't spam events.

## How to override a screen name

If you need a custom screen name for a specific route (e.g., a dynamic route
like `/user/[id]`), call `analytics.screen()` directly in that screen's
component:

```tsx
import { analytics } from "@/src/infrastructure/analytics";

export default function UserProfile() {
  const { id } = useLocalSearchParams();

  useEffect(() => {
    // Override the auto-tracked pathname with a richer name
    analytics.screen("UserProfile", { userId: id });
  }, [id]);

  return <View>...</View>;
}
```

The auto-tracked `/user/123` event will still fire (it runs in the root
layout), but your manual call gives you a second, richer event with structured
properties. If you'd prefer to suppress the auto event entirely, you can
check for a specific prefix in a future `screenFilter` option — but in
practice, having both is fine (PostHog dedupes by distinct_id + timestamp).

## Where tracking is wired

| File                                                  | What                                  |
| ----------------------------------------------------- | ------------------------------------- |
| `src/infrastructure/analytics/useScreenTracking.ts`   | Hook + pure helpers                   |
| `app/_layout.tsx`                                     | `useScreenTracking()` called once     |
| `src/infrastructure/analytics/screenTracking.test.ts` | Unit tests for dedupe + normalisation |
