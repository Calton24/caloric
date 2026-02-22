# Growth Layer

The Growth Layer is a lightweight feedback loop for feature requests plus a
simple growth contract (activation, retention, revenue milestones). It is not a
survey engine. The default behavior is Noop so forks stay safe until explicitly
enabled.

**Contract:** To capture user feedback, call `growth.requestFeature()` from any UI. Growth behavior is controlled by `features.growth` + provider env vars.

## Enable in a fork

1. Turn on the feature flag in config:

- `features.growth = true` in your active profile or environment override.

2. Provide backend wiring via env:

- `EXPO_PUBLIC_GROWTH_PROVIDER=supabase`

If the provider env is missing, Growth falls back to Noop and logs
`[Growth] mode=enabled_missing_backend` at boot.

## Mobile Core Done Gate (run before forking)

### A) Fork simulation (30 minutes, no code edits)

1. Duplicate the repo folder (not a git fork yet).

2. Change:

- App name
- Bundle ID / package
- `EXPO_PUBLIC_APP_PROFILE` (new profile name)
- Supabase env keys (new project)

3. Run:

- `npx tsc --noEmit`
- `npm test`
- `npx expo start` (or iOS sim)
- `npm run mobile-core:verify:deep`

4. Confirm:

- App boots
- Auth still functions (email sign-in)
- Growth request submission works (or clearly noops with structured mode log)
- Analytics boot log shows expected mode

**Pass condition:** Fork works by config/env only. If you edited a file, Mobile Core is not done.

### B) Failure + abuse tests (15 minutes)

Run these and verify behavior is graceful:

- Airplane mode -> submit feature request -> friendly "Try again" message, no crash.
- Bad Supabase key -> growth enabled -> logs `mode=enabled_missing_backend` equivalent and noops safely.
- Spam taps -> cooldown blocks and shows remaining time.
- Deduped request -> same request within window gets blocked or merged, no raw errors.

**Pass condition:** User never sees internal errors; app never crashes; logs are grep-able.

### C) Production sanity

- Growth UI (request sheet demo) is dev-only (catalog only).
- Growth plumbing can run in prod invisibly (API callable, UI optional).
- Boot logs never print secrets. Mode logs are fine.

**Pass condition:** Production is safe and boring.

## Guardrails (non-negotiable)

1. **Single-sentence contract** (above). If it takes more than one line, the abstraction is too complex.

2. **Structured boot mode log:**

- `[Growth] mode=disabled_by_config`
- `[Growth] mode=enabled_missing_backend`
- `[Growth] mode=supabase_initialized`
- `[Growth] mode=sdk_missing_fallback_noop` (if applicable for future providers)

## Feature requests schema (Supabase)

Table: `feature_requests`

Columns:

- `id` uuid primary key default gen_random_uuid()
- `created_at` timestamptz default now()
- `app_profile` text not null
- `anon_id` text not null
- `user_id` uuid null
- `title` text not null
- `description` text null
- `category` text null
- `severity` text null
- `screen` text null
- `platform` text not null
- `app_version` text not null
- `build_number` text not null
- `status` text default 'new'
- `dedupe_hash` text
- `meta` jsonb

Recommended indexes:

- `(app_profile, created_at desc)`
- `(anon_id, created_at desc)`
- Unique or partial index on `dedupe_hash` if you want stronger dedupe

Minimal SQL:

```sql
create table if not exists public.feature_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  app_profile text not null,
  anon_id text not null,
  user_id uuid null,
  title text not null,
  description text null,
  category text null,
  severity text null,
  screen text null,
  platform text not null,
  app_version text not null,
  build_number text not null,
  status text default 'new',
  dedupe_hash text,
  meta jsonb
);

create index if not exists feature_requests_profile_created_at_idx
  on public.feature_requests (app_profile, created_at desc);

create index if not exists feature_requests_anon_created_at_idx
  on public.feature_requests (anon_id, created_at desc);
```

RLS guidance:

- Enable RLS and allow inserts for authenticated and anon users.
- Do not allow direct updates or deletes from the client.
- Use a service role or admin UI for moderation.
