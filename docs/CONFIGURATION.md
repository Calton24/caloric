# Multi-App Configuration System

## Overview

This mobile-core repository uses a **profile-based configuration system** that allows you to:

- Clone the repo and launch multiple apps from the same codebase
- Switch between apps by changing one environment variable: `EXPO_PUBLIC_APP_PROFILE`
- Support multiple environments (dev/staging/prod) per app
- Toggle features per app using feature flags
- Maintain strong typing and runtime validation

## Quick Start

### 1. Clone for a New App

```bash
# Clone the repo
git clone https://github.com/your-org/mobile-core.git my-new-app
cd my-new-app

# Create a new profile
cp src/config/profiles/intake.ts src/config/profiles/mynewapp.ts

# Edit the profile with your app's Supabase credentials and features
# See "Creating a New App Profile" section below
```

### 2. Set Environment Variables

Create a `.env` file:

```bash
EXPO_PUBLIC_APP_PROFILE=mynewapp
EXPO_PUBLIC_APP_ENV=dev
```

### 3. Run the App

```bash
# Install dependencies
npm install

# Run locally
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

That's it! Your app is now connected to your Supabase project with the correct feature flags.

---

## Configuration Architecture

### How It Works

```
1. Set EXPO_PUBLIC_APP_PROFILE=intake
                ↓
2. Config loader reads src/config/profiles/intake.ts
                ↓
3. Merge with environment overrides (dev/staging/prod)
                ↓
4. Validate with Zod schemas
                ↓
5. Create Supabase client with correct credentials
                ↓
6. App runs with intake's features and branding
```

### File Structure

```
src/config/
├── profiles/
│   ├── intake.ts          # Intake app config
│   ├── proxi.ts           # Proxi app config
│   └── index.ts           # Profile registry
├── types.ts               # TypeScript interfaces
├── schema.ts              # Zod validation schemas
├── loader.ts              # Config loading logic
└── index.ts               # Public API

src/lib/
├── supabase/
│   ├── client.ts          # Supabase client factory
│   ├── edge-functions.ts  # Edge function helpers
│   └── index.ts
└── remote-config/         # Optional remote feature flags
    ├── client.ts
    ├── cache.ts
    └── index.ts
```

---

## Creating a New App Profile

### Step 1: Create Profile File

Create `src/config/profiles/mynewapp.ts`:

```typescript
import { AppProfileConfig } from "../types";

export const mynewappConfig: AppProfileConfig = {
  supabase: {
    url: "https://your-project.supabase.co",
    anonKey: "your-anon-key-here",
  },

  features: {
    vision: true, // Enable/disable features
    water: false,
    habit: true,
    paywall: true,
    analytics: true,
    notifications: true,
  },

  app: {
    name: "My New App",
    slug: "mynewapp",
    bundleIdentifier: "com.yourcompany.mynewapp",
    androidPackage: "com.yourcompany.mynewapp",
    version: "1.0.0",
    scheme: "mynewapp",
  },

  environments: {
    dev: {
      supabase: {
        url: "https://your-dev-project.supabase.co",
        anonKey: "your-dev-anon-key",
      },
      features: {
        paywall: false, // Disable paywall in dev
      },
      app: {
        name: "My New App Dev",
        bundleIdentifier: "com.yourcompany.mynewapp.dev",
        androidPackage: "com.yourcompany.mynewapp.dev",
      },
    },
    // Add staging and prod as needed
  },
};
```

### Step 2: Register Profile

Add to `src/config/profiles/index.ts`:

```typescript
import { mynewappConfig } from "./mynewapp";

export const APP_PROFILES: Record<AppProfile, AppProfileConfig> = {
  intake: intakeConfig,
  proxi: proxiConfig,
  mynewapp: mynewappConfig, // Add here
};
```

### Step 3: Update Types

Add to `src/config/types.ts`:

```typescript
export type AppProfile = "intake" | "proxi" | "mynewapp"; // Add here
```

Also update the Zod schema in `src/config/schema.ts`:

```typescript
export const AppProfileSchema = z.enum(["intake", "proxi", "mynewapp"], {
  errorMap: () => ({
    message: "APP_PROFILE must be one of: intake, proxi, mynewapp",
  }),
});
```

---

## Environment Variables

### Required Variables

```bash
# App profile (which app to run)
EXPO_PUBLIC_APP_PROFILE=intake

# Environment (which variant: dev/staging/prod)
EXPO_PUBLIC_APP_ENV=dev
```

### How to Set Them

**Local Development (.env file):**

```bash
# .env
EXPO_PUBLIC_APP_PROFILE=intake
EXPO_PUBLIC_APP_ENV=dev
```

**EAS Builds (eas.json):**

```json
{
  "build": {
    "intake-prod": {
      "env": {
        "EXPO_PUBLIC_APP_PROFILE": "intake",
        "EXPO_PUBLIC_APP_ENV": "prod"
      }
    }
  }
}
```

**Runtime (command line):**

```bash
EXPO_PUBLIC_APP_PROFILE=proxi EXPO_PUBLIC_APP_ENV=staging npm start
```

---

## Using the Configuration in Your App

### Get App Config

```typescript
import { getAppConfig } from "@/src/config";

const config = getAppConfig();
console.log(config.app.name); // "Intake"
console.log(config.supabase.url); // "https://..."
console.log(config.features.vision); // true
```

### Use Supabase Client

```typescript
import { getSupabaseClient } from "@/src/lib/supabase";

const supabase = getSupabaseClient();

// The client is automatically configured for the active profile!
const { data, error } = await supabase.from("users").select("*");
```

### Call Edge Functions

```typescript
import { callEdgeFunction } from "@/src/lib/supabase";

const { data, error } = await callEdgeFunction<{ message: string }>({
  name: "process-vision",
  body: { imageUrl: "https://..." },
});
```

### Feature Flags

```typescript
import { getAppConfig } from "@/src/config";

const config = getAppConfig();

if (config.features.vision) {
  // Show vision AI features
}

if (config.features.paywall) {
  // Show subscription paywall
}
```

### Remote Feature Flags (Optional)

```typescript
import { getFeatureFlags, isFeatureEnabled } from "@/src/lib/remote-config";

// Fetch from Supabase with caching
const features = await getFeatureFlags();

// Or check individual feature
if (await isFeatureEnabled("vision")) {
  // Enable vision features
}
```

---

## Local Development

### Run Different Apps

```bash
# Run Intake app in dev
EXPO_PUBLIC_APP_PROFILE=intake npm start

# Run Proxi app in staging
EXPO_PUBLIC_APP_PROFILE=proxi EXPO_PUBLIC_APP_ENV=staging npm start
```

### Switch Profiles

1. Update `.env` file:

   ```bash
   EXPO_PUBLIC_APP_PROFILE=proxi
   ```

2. Restart Metro bundler (kill and `npm start`)

3. Reload app (shake device → Reload)

---

## EAS Build Configuration

### Build Profiles

Each app has 3 build profiles per environment:

- `{app}-dev` - Development builds with dev Supabase project
- `{app}-staging` - Internal testing with staging Supabase project
- `{app}-prod` - Production builds for app stores

### Build Commands

```bash
# Build Intake dev
eas build --profile intake-dev --platform ios

# Build Proxi production
eas build --profile proxi-prod --platform all

# Build specific app + env
eas build --profile mynewapp-staging --platform android
```

### Adding New Build Profile

In `eas.json`:

```json
{
  "build": {
    "mynewapp-dev": {
      "extends": "development",
      "env": {
        "EXPO_PUBLIC_APP_PROFILE": "mynewapp",
        "EXPO_PUBLIC_APP_ENV": "dev"
      }
    }
  }
}
```

---

## Security Best Practices

### ✅ DO

1. **Use anon key only in client code**
   - The anon key is safe to expose in the mobile app
   - It respects RLS (Row Level Security) policies

2. **Store sensitive operations in Edge Functions**
   - Admin operations use service_role key
   - Keep service_role key in Supabase Edge Functions only
   - Never in mobile code

3. **Enable RLS on all tables**

   ```sql
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;

   CREATE POLICY "Users can read own data"
     ON users FOR SELECT
     TO authenticated
     USING (auth.uid() = id);
   ```

4. **Use Edge Functions for privileged operations**

   ```typescript
   // Mobile app calls Edge Function
   const { data } = await callEdgeFunction({
     name: "admin-operation",
     body: { action: "delete-user" },
   });
   ```

   ```typescript
   // Edge Function uses service_role key
   // supabase/functions/admin-operation/index.ts
   const supabaseAdmin = createClient(
     Deno.env.get("SUPABASE_URL")!,
     Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, // Safe here
   );
   ```

### ❌ DO NOT

1. **Never put service_role key in mobile code**

   ```typescript
   // ❌ WRONG - This bypasses RLS and is a security risk
   const supabase = createClient(url, SERVICE_ROLE_KEY);
   ```

2. **Never put service_role key in environment variables exposed to client**

   ```bash
   # ❌ WRONG - EXPO_PUBLIC_ variables are bundled into the app
   EXPO_PUBLIC_SUPABASE_SERVICE_KEY=...
   ```

3. **Never disable RLS for convenience**

   ```sql
   -- ❌ WRONG - This exposes all data
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ```

4. **Never store secrets in profile configs**
   ```typescript
   // ❌ WRONG - API keys should be in Edge Functions
   export const config = {
     secrets: {
       stripeApiKey: "sk_live_...", // Don't do this
     },
   };
   ```

### Key Management

- **Mobile App**: Only anon key (public, safe)
- **Edge Functions**: Service role key (via Supabase environment)
- **External APIs**: Use Edge Functions as proxy (keep API keys server-side)

---

## Remote Feature Flags (Optional)

### Setup

1. Create Supabase table:

```sql
CREATE TABLE remote_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_profile TEXT NOT NULL,
  environment TEXT NOT NULL,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(app_profile, environment)
);

-- Enable RLS
ALTER TABLE remote_config ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Users can read config"
  ON remote_config FOR SELECT
  TO authenticated
  USING (enabled = true);
```

2. Insert config:

```sql
INSERT INTO remote_config (app_profile, environment, feature_flags)
VALUES (
  'intake',
  'prod',
  '{"vision": true, "paywall": false}'::jsonb
);
```

3. Use in app:

```typescript
import { getFeatureFlags } from "@/src/lib/remote-config";

// Fetches from Supabase, cached for 5 minutes
const features = await getFeatureFlags();
```

### When to Use Remote Config

**Use for:**

- Kill switches (disable broken features remotely)
- A/B testing
- Gradual feature rollouts
- Emergency toggles

**Don't use for:**

- Frequent changes (adds network delay)
- Core features (use static config)
- Security-sensitive features (use RLS + Edge Functions)

---

## Troubleshooting

### "Unknown app profile" Error

```
❌ Unknown app profile: myapp
Available profiles: intake, proxi
```

**Solution:** Add your profile to `src/config/profiles/index.ts` and update the `AppProfile` type.

### "Missing required environment variable: APP_PROFILE"

**Solution:** Set `EXPO_PUBLIC_APP_PROFILE` in `.env` or `eas.json`.

### Supabase Client Not Connecting

1. Check your Supabase URL and anon key in profile config
2. Verify the profile is loading correctly: `console.log(getAppConfig())`
3. Check for typos in environment variable names

### Config Not Updating

- Kill Metro bundler and restart: `npm start --reset-cache`
- Clear app cache: Shake device → "Reload"
- For native changes: Rebuild app (`npm run ios` or `eas build`)

---

## Cloning Checklist

When cloning mobile-core for a new app:

- [ ] 1. Create new profile in `src/config/profiles/mynewapp.ts`
- [ ] 2. Add profile to `src/config/profiles/index.ts`
- [ ] 3. Update `AppProfile` type in `src/config/types.ts`
- [ ] 4. Update Zod schema in `src/config/schema.ts`
- [ ] 5. Add EAS build profiles in `eas.json`
- [ ] 6. Set `.env` file with `EXPO_PUBLIC_APP_PROFILE=mynewapp`
- [ ] 7. Update app icons/splash screens in `assets/`
- [ ] 8. Create Supabase projects (dev, staging, prod)
- [ ] 9. Add Supabase URLs and anon keys to profile
- [ ] 10. Test: `npm start` and verify correct app loads

**Time to launch: ~15 minutes** ⚡

---

## Examples

See example usage in:

- `src/lib/supabase/client.ts` - Supabase client initialization
- `src/lib/supabase/edge-functions.ts` - Calling Edge Functions
- `src/lib/remote-config/client.ts` - Remote feature flags
- `app.config.ts` - Dynamic Expo configuration

---

## Support

For questions or issues:

1. Check this documentation
2. Review error messages (they're designed to be helpful!)
3. Inspect the config: `console.log(getAppConfig())`
4. Check Supabase dashboard for RLS policies and data
