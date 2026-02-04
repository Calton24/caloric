# Quick Reference

## Common Commands

### Local Development

```bash
# Run app with default profile (from .env)
npm start

# Run specific profile
EXPO_PUBLIC_APP_PROFILE=intake npm start
EXPO_PUBLIC_APP_PROFILE=proxi npm start

# Run specific environment
EXPO_PUBLIC_APP_ENV=staging npm start

# Run specific profile + environment
EXPO_PUBLIC_APP_PROFILE=intake EXPO_PUBLIC_APP_ENV=prod npm start

# Clear cache and restart
npm start --reset-cache
```

### EAS Builds

```bash
# Build for iOS
eas build --profile intake-prod --platform ios
eas build --profile proxi-dev --platform ios

# Build for Android
eas build --profile intake-prod --platform android

# Build for both
eas build --profile proxi-staging --platform all

# Submit to app stores
eas submit --profile production --platform ios
eas submit --profile production --platform android
```

---

## Code Snippets

### Get Current Config

```typescript
import { getAppConfig } from "@/src/config";

const config = getAppConfig();
console.log(config.profile); // 'intake'
console.log(config.environment); // 'dev'
console.log(config.app.name); // 'Intake Dev'
console.log(config.features); // { vision: true, ... }
```

### Supabase Client

```typescript
import { getSupabaseClient } from "@/src/lib/supabase";

const supabase = getSupabaseClient();

// Query
const { data, error } = await supabase
  .from("users")
  .select("*")
  .eq("id", userId);

// Insert
const { data, error } = await supabase.from("posts").insert({ title, content });

// Auth
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "password",
});
```

### Call Edge Function

```typescript
import { callEdgeFunction } from "@/src/lib/supabase";

// Simple call
const { data, error } = await callEdgeFunction({
  name: "my-function",
  body: { key: "value" },
});

// Typed call
interface Response {
  message: string;
}
const { data, error } = await callTypedEdgeFunction<Response>("my-function", {
  key: "value",
});

// Authenticated call
const { data, error } = await callAuthenticatedEdgeFunction({
  name: "protected-function",
  body: { data },
});
```

### Feature Flags

```typescript
import { getAppConfig } from "@/src/config";

const config = getAppConfig();

// Static flags (from config)
if (config.features.vision) {
  // Enable vision features
}

// Remote flags (from Supabase)
import { getFeatureFlags, isFeatureEnabled } from "@/src/lib/remote-config";

const features = await getFeatureFlags();
const isEnabled = await isFeatureEnabled("vision");
```

---

## File Locations

### Configuration

- **App Profiles:** `src/config/profiles/*.ts`
- **Types:** `src/config/types.ts`
- **Schemas:** `src/config/schema.ts`
- **Loader:** `src/config/loader.ts`

### Supabase

- **Client:** `src/lib/supabase/client.ts`
- **Edge Functions:** `src/lib/supabase/edge-functions.ts`

### Remote Config (Optional)

- **Client:** `src/lib/remote-config/client.ts`
- **Cache:** `src/lib/remote-config/cache.ts`

### Build Configuration

- **Expo Config:** `app.config.ts`
- **EAS Config:** `eas.json`
- **Environment:** `.env`

---

## Environment Variables

### Required

```bash
# Which app to run
EXPO_PUBLIC_APP_PROFILE=intake

# Which environment
EXPO_PUBLIC_APP_ENV=dev
```

### Optional

```bash
# EAS Project ID
EAS_PROJECT_ID=your-project-id
```

---

## Creating New App Profile

1. **Create profile file:**

   ```bash
   cp src/config/profiles/intake.ts src/config/profiles/newapp.ts
   ```

2. **Edit profile:**
   - Update Supabase URL and anon key
   - Configure feature flags
   - Set app metadata (name, bundle ID, etc.)
   - Add environment overrides

3. **Register profile:**

   ```typescript
   // src/config/profiles/index.ts
   export const APP_PROFILES = {
     intake: intakeConfig,
     proxi: proxiConfig,
     newapp: newappConfig, // Add this
   };
   ```

4. **Update types:**

   ```typescript
   // src/config/types.ts
   export type AppProfile = "intake" | "proxi" | "newapp";

   // src/config/schema.ts
   export const AppProfileSchema = z.enum(["intake", "proxi", "newapp"]);
   ```

5. **Add EAS profiles:**

   ```json
   // eas.json
   {
     "build": {
       "newapp-dev": {
         "extends": "development",
         "env": {
           "EXPO_PUBLIC_APP_PROFILE": "newapp",
           "EXPO_PUBLIC_APP_ENV": "dev"
         }
       }
     }
   }
   ```

6. **Test:**
   ```bash
   EXPO_PUBLIC_APP_PROFILE=newapp npm start
   ```

---

## Troubleshooting

### Config not loading

```bash
# Check env vars
echo $EXPO_PUBLIC_APP_PROFILE
echo $EXPO_PUBLIC_APP_ENV

# Clear cache
npm start --reset-cache

# Check config
import { getAppConfig } from '@/src/config';
console.log(getAppConfig());
```

### Supabase not connecting

```typescript
// Verify config
const config = getAppConfig();
console.log("URL:", config.supabase.url);
console.log("Key:", config.supabase.anonKey.substring(0, 20) + "...");

// Test client
const supabase = getSupabaseClient();
const { data, error } = await supabase.from("users").select("count");
console.log("Connected:", !error);
```

### Feature flag not working

```typescript
// Check static flags
const config = getAppConfig();
console.log("Vision enabled:", config.features.vision);

// Check remote flags (if using)
const features = await getFeatureFlags();
console.log("Remote vision:", features.vision);
```

### Build failing

```bash
# Check EAS config
cat eas.json | grep -A 10 "intake-prod"

# Verify env vars in profile
eas build --profile intake-dev --platform ios --non-interactive

# Check logs
eas build:list
eas build:view <build-id>
```

---

## SQL Snippets

### Enable RLS on Table

```sql
ALTER TABLE my_table ENABLE ROW LEVEL SECURITY;
```

### User Can Read Own Data

```sql
CREATE POLICY "Users read own"
  ON my_table FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
```

### User Can Write Own Data

```sql
CREATE POLICY "Users write own"
  ON my_table FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

### Remote Config Table

```sql
CREATE TABLE remote_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  app_profile TEXT NOT NULL,
  environment TEXT NOT NULL,
  feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1,
  UNIQUE(app_profile, environment)
);

ALTER TABLE remote_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can read config"
  ON remote_config FOR SELECT
  TO authenticated
  USING (enabled = true);
```

---

## Edge Function Template

```typescript
// supabase/functions/my-function/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Your logic here
    const { data } = await req.json();

    // Return response
    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

---

## Useful Links

- **Configuration Guide:** `docs/CONFIGURATION.md`
- **Security Guide:** `docs/SECURITY.md`
- [Supabase Docs](https://supabase.com/docs)
- [Expo Docs](https://docs.expo.dev/)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
