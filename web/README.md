# CalCut Web

Production landing page and legal docs for CalCut — AI Calorie Tracker.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Supabase (Android waitlist)

## Pages

- **Home:** `/` — marketing landing page
- **Privacy Policy:** `/privacy`
- **Terms of Service:** `/terms`
- **Password Reset:** `/reset`

## Setup

```bash
cd web
cp .env.example .env.local
npm install
npm run dev
```

Visit http://localhost:3000

### Environment variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |

If you already use the mobile app, copy from repo root `.env`:

```bash
grep -E '^EXPO_PUBLIC_SUPABASE_(URL|ANON_KEY)=' .env \
  | sed 's/^EXPO_PUBLIC_/NEXT_PUBLIC_/' > web/.env.local
```

Restart the dev server after creating or changing `.env.local`.

### Supabase waitlist table

Apply the migration in `supabase/migrations/20260708120000_create_android_waitlist.sql` (or the copy under `web/supabase/migrations/`):

```bash
# From repo root, with Supabase CLI linked
supabase db push
```

Or paste the SQL into the Supabase SQL Editor.

The table `android_waitlist` allows public inserts (RLS) and blocks public reads. Duplicate emails return Postgres `23505`, which the form surfaces as “You’re already on the waitlist.”

## Build

```bash
npm run build
npm start
```

## Deploy to Vercel

1. Set Root Directory to `web` (or deploy this folder).
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Deploy:

```bash
vercel --prod
```

App Store CTA: https://apps.apple.com/gb/app/calcut-ai-calorie-tracker/id6761738426
