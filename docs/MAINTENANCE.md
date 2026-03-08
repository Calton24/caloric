# Maintenance / Degraded-Mode System

> Resilient maintenance and outage handling that does **NOT** rely on Supabase.

**Fork contract:** To enable maintenance control, set `features.maintenance = true` in your config profile and configure either `EXPO_PUBLIC_MAINTENANCE_URL` (primary) or PostHog flags (fallback). No app code changes required.

## Why independent of Supabase?

The maintenance system exists specifically for the scenario where Supabase (or any backend) is **down**. If the maintenance layer depended on Supabase, it would fail at the exact moment it's needed most. Instead, it uses:

- A plain **JSON file** hosted on any CDN/static host (S3, Cloudflare, Vercel, GitHub Pages)
- **PostHog** feature flags (separate infrastructure)
- **Automatic health monitoring** via raw HTTP (no SDK import)
- **AsyncStorage** caching so the last known state survives restarts

The maintenance module **never imports** any Supabase SDK. The `SupabaseHealthMonitor` pings the Supabase REST health endpoint using plain `fetch()`.

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                    MaintenanceGate                │  UI layer
│  full-screen overlay / banner / useMaintenanceState │
└───────────────────────┬──────────────────────────┘
                        │ maintenance.getState()
┌───────────────────────▼──────────────────────────┐
│              maintenance.ts (proxy)               │  Singleton
│  Priority: localOverride > monitor > provider     │
└───┬────────────┬────────────┬────────────────────┘
    │            │            │
    ▼            ▼            ▼
 Override   HealthMonitor   Provider
 (AsyncStorage) (auto)     (RemoteJson | PostHog | Noop)
```

### State resolution priority

1. **Local override** (`setLocalOverride`) — manual "force maintenance" always wins
2. **SupabaseHealthMonitor** — auto-detected outage escalation
3. **Provider** — RemoteJson, PostHog, or Noop

---

## Remote JSON Endpoint

Host a static JSON file at any URL. Set `EXPO_PUBLIC_MAINTENANCE_URL` in your environment.

### Payload shape

```json
{
  "mode": "normal",
  "message": "Optional message shown in banners / overlay",
  "reason": "manual_override",
  "blockedFeatures": ["growth", "realtime", "uploads"],
  "until": "2026-02-25T06:00:00Z"
}
```

| Field             | Type                                                                                | Required | Description                         |
| ----------------- | ----------------------------------------------------------------------------------- | -------- | ----------------------------------- |
| `mode`            | `"normal" \| "degraded" \| "read_only" \| "maintenance"`                            | ✅       | Current operational mode            |
| `message`         | `string`                                                                            | ❌       | Human-readable message for users    |
| `reason`          | `"manual_override" \| "supabase_unreachable" \| "network_unreachable" \| "unknown"` | ❌       | Why the mode was set                |
| `blockedFeatures` | `string[]`                                                                          | ❌       | Feature keys to force-disable       |
| `until`           | `string` (ISO 8601)                                                                 | ❌       | Estimated end of maintenance window |

### Validation rules

- `mode` must be one of the four valid values — invalid payloads are rejected
- `blockedFeatures` items must be strings — non-strings are filtered out
- `reason` must be a recognized value — invalid reasons are ignored
- Any additional fields are silently ignored

---

## Modes

| Mode          | UI                          | Features                   | Use case                        |
| ------------- | --------------------------- | -------------------------- | ------------------------------- |
| `normal`      | Nothing                     | All enabled                | Everything is fine              |
| `degraded`    | Dismissible amber banner    | `blockedFeatures` disabled | Supabase slow / partial outage  |
| `read_only`   | Dismissible blue banner     | Writes blocked, reads OK   | Database migration, backups     |
| `maintenance` | Full-screen overlay + retry | All blocked                | Full outage, deploy in progress |

---

## Automatic Outage Detection

The `SupabaseHealthMonitor` pings `${SUPABASE_URL}/auth/v1/health` every 30 seconds.

**Escalation ladder:**

| Consecutive failures | Mode          | Reason                 |
| -------------------- | ------------- | ---------------------- |
| 1–2                  | `normal`      | —                      |
| 3–5                  | `degraded`    | `supabase_unreachable` |
| 6+                   | `maintenance` | `supabase_unreachable` |

**Recovery:** 2 consecutive successes → back to `normal` (unless a manual override is active).

**Gating:** Only starts when both `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are present.

---

## Safe Default Behavior

The system is designed to **never crash** and **never block boot**:

- All AsyncStorage operations are wrapped in try/catch
- AsyncStorage is loaded lazily (not at module init)
- The proxy catches all errors and returns `{ mode: "normal" }`
- RemoteJson falls back to cached state → default on any failure
- PostHog falls back to cached state → default if SDK missing
- The health monitor never throws — ping failures are silently counted
- `initMaintenance()` is idempotent — safe to call multiple times

---

## Environment Variables

| Variable                        | Purpose                                            |
| ------------------------------- | -------------------------------------------------- |
| `EXPO_PUBLIC_MAINTENANCE_URL`   | URL to static JSON endpoint                        |
| `EXPO_PUBLIC_POSTHOG_API_KEY`   | PostHog API key (also used by analytics)           |
| `EXPO_PUBLIC_POSTHOG_HOST`      | PostHog host (default: `https://us.i.posthog.com`) |
| `EXPO_PUBLIC_SUPABASE_URL`      | Supabase project URL (for health monitor)          |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (for health monitor)             |

---

## Usage in Feature Code

### Checking blocked features (authoritative)

```tsx
import { maintenance } from "@/infrastructure/maintenance";

// Synchronous — uses last known resolved state
if (maintenance.isBlocked("writes")) {
  throw new Error("Writes are blocked during maintenance");
}
```

`maintenance.isBlocked(feature)` returns `true` when:

- `mode === "maintenance"` (everything blocked)
- `feature` is listed in `blockedFeatures`
- `reason === "supabase_unreachable"` and feature is in the implicit block list: **writes, uploads, growth, realtime**

### React hook — `useMaintenanceState`

```tsx
import { useMaintenanceState } from "@/infrastructure/maintenance";

function GrowthScreen() {
  const { state, isFeatureBlocked } = useMaintenanceState();

  if (isFeatureBlocked("growth")) {
    return <Text>Growth features are temporarily unavailable.</Text>;
  }

  return <GrowthDashboard />;
}
```

### Manual override (dev/admin)

```ts
import { maintenance } from "@/infrastructure/maintenance";

// Force maintenance mode
await maintenance.setLocalOverride({
  mode: "maintenance",
  reason: "manual_override",
  message: "Deploying v2.0 — back in 30 minutes",
});

// Clear override
await maintenance.setLocalOverride(null);
```

---

## Boot Sequence Logs

```
[Maintenance] mode=remote_json
[Maintenance] mode=outage_monitor_enabled
```

Possible mode values: `disabled_by_config`, `remote_json`, `posthog`, `local_default`.

---

## Transition Logging

A single structured log line is printed when mode or reason changes:

```
[Maintenance] state_changed mode=degraded reason=supabase_unreachable blocked=writes,growth
[Maintenance] state_changed mode=maintenance reason=supabase_unreachable blocked=growth,realtime,uploads,writes
[Maintenance] state_changed mode=normal reason=none blocked=none
```

At boot, a seed confirmation is emitted after the first state resolution:

```
[Maintenance] seeded=true source=init
```

### Commit Path Rule

Every state change in the system flows through **one** commit function (`notifyListeners`):

| Change source             | Triggers commit via                                            |
| ------------------------- | -------------------------------------------------------------- |
| `setLocalOverride()`      | Direct call to `notifyListeners(resolved)`                     |
| Outage monitor transition | Bridge subscription → `notifyListeners(resolved)`              |
| `loadPersistedOverride()` | Direct call to `notifyListeners(resolved)` when override found |

- **`getState()` is pure** — it resolves + caches state but never logs
- Logs only fire through the commit path, never from polling
- Only fires on transitions — never spams, even in render loops
- Never logs secrets, tokens, or URLs
- `blocked` shows the CSV of `blockedFeatures`, or `"none"`

---

## Operator Workflow

### Hosting the Remote JSON

Host a static `maintenance.json` file on any CDN independent of your app backend:

1. **GitHub Pages** — commit `maintenance.json` to a `gh-pages` branch
2. **Cloudflare Pages / Netlify / Vercel** — deploy a single static file
3. **S3 + CloudFront** — upload to a bucket with public read
4. **Any static host** — ensure it returns JSON with CORS headers

Set the URL in your environment:

```bash
EXPO_PUBLIC_MAINTENANCE_URL=https://status.yourapp.com/maintenance.json
```

### Example Payloads

**Normal operation:**

```json
{ "mode": "normal" }
```

**Planned maintenance window:**

```json
{
  "mode": "maintenance",
  "reason": "manual_override",
  "message": "Deploying v2.0 — back in 30 minutes",
  "until": "2026-02-25T06:00:00Z"
}
```

**Partial outage — block specific features:**

```json
{
  "mode": "degraded",
  "reason": "manual_override",
  "message": "Realtime features are temporarily offline.",
  "blockedFeatures": ["realtime", "growth"]
}
```

**Read-only mode for database migration:**

```json
{
  "mode": "read_only",
  "reason": "manual_override",
  "message": "Running database migration. Reads still work.",
  "blockedFeatures": ["writes", "uploads"]
}
```

### Forcing Override in Dev

Open the **Maintenance** panel in the Caloric catalog (`__DEV__` only):

1. Navigate to **Caloric → Maintenance**
2. Press **Force Degraded / Force Maintenance / Force Read-Only** to set a local override
3. Press **Clear Override** to remove it
4. Press **Trigger Health Check** to run a single Supabase ping on demand

Or programmatically:

```ts
import { maintenance } from "@/infrastructure/maintenance";

// Force degraded
await maintenance.setLocalOverride({
  mode: "degraded",
  reason: "manual_override",
  message: "Testing degraded banner",
  updatedAt: Date.now(),
});

// Clear
await maintenance.setLocalOverride(null);
```

---

## Dev Debug Panel

The `MaintenanceDebugPanel` is available in the Caloric catalog under `__DEV__` only.

Route: `app/(tabs)/caloric/maintenance.tsx`
Component: `src/ui/dev/MaintenanceDebugPanel.tsx`

It shows:

- Current resolved mode / reason / message / blockedFeatures / until
- Override buttons: Normal, Degraded, Read-Only, Maintenance, Clear
- Trigger Health Check button (runs `monitor.checkOnce()`)

---

## Auth UX Protection

When Supabase is unreachable, the auth proxy (`authClient`) checks `maintenance.isBlocked("auth")` before calling Supabase. If blocked, it returns:

```
"Service temporarily unavailable. Please try again shortly."
```

instead of confusing errors like "wrong password" or "session expired" (which would appear because the server is simply unreachable).

Protected operations: `signIn`, `signUp`, `signInWithOAuth`. Read-only operations (`getSession`, `onAuthStateChange`, `signOut`) are **not** blocked — a user who is already signed in should not be forcibly signed out.

---

## Implicit Feature Blocks

When `reason === "supabase_unreachable"`, these features are implicitly blocked even if not listed in `blockedFeatures`:

- `writes` — any Supabase insert/update
- `uploads` — file uploads
- `growth` — feature request submission
- `realtime` — realtime subscriptions
- `auth` — sign-in, sign-up, OAuth

---

## File Structure

```
src/infrastructure/maintenance/
├── types.ts                         # Contract + constants
├── NoopMaintenanceClient.ts         # Safe default (always normal)
├── RemoteJsonMaintenanceClient.ts   # HTTP JSON endpoint
├── PostHogMaintenanceClient.ts      # Feature flag provider
├── SupabaseHealthMonitor.ts         # Automatic outage detection
├── maintenance.ts                   # Singleton proxy (logTransition, isBlocked)
├── factory.ts                       # Boot-time provider selection
├── MaintenanceGate.tsx              # UI gate component
├── index.ts                         # Barrel exports
└── *.test.ts                        # Tests

src/ui/dev/
└── MaintenanceDebugPanel.tsx        # Dev-only debug panel

app/(tabs)/caloric/
└── maintenance.tsx                  # Catalog route for debug panel
```
