# Security Guide

## ⚠️ HIGH-STAKES PLATFORM SECURITY

**This is production-grade platform infrastructure that will be forked into multiple production apps.** Security is not optional. Any vulnerabilities will propagate to all downstream forks.

**Hard Constraints (Never Violate):**

- 🚫 Never leak secrets or PII to logs
- 🚫 Never accept service_role JWTs in client code
- 🚫 Never expose debug screens in production builds
- 🚫 Never crash the app due to security measures
- ✅ Security > Convenience (always)

### Quick Reference

| Check             | Command                               | Frequency                      |
| ----------------- | ------------------------------------- | ------------------------------ |
| Secret scan       | `npm run caloric:security`        | Every commit (pre-commit hook) |
| All tests         | `npm run validate`                    | Every commit                   |
| Security tests    | `npm run test -- security.test.ts`    | Every commit                   |
| Deep verification | `npm run caloric:verify:security` | Before merge                   |

---

## Zero-Trust Architecture

This multi-app system follows a **zero-trust security model** where:

- Mobile app has minimal privileges (anon key only)
- All privileged operations go through Edge Functions
- RLS (Row Level Security) protects data at the database level
- No secrets or admin keys in client code

---

## Security Rules

### 1. Client-Side (Mobile App)

#### ✅ SAFE - Anon Key

```typescript
// ✅ SAFE: Anon key respects RLS policies
const supabase = createClient(
  "https://project.supabase.co",
  "your-anon-key-here" // Anon key (JWT from Supabase dashboard)
);
```

**Why it's safe:**

- Anon key can only access data allowed by RLS policies
- Users can only see/modify their own data (if RLS is configured correctly)
- Even if leaked, it can't be used to access other users' data

#### ❌ DANGEROUS - Service Role Key

```typescript
// ❌ NEVER DO THIS
const supabase = createClient(
  "https://project.supabase.co",
  "your-service-role-key" // ← This is the dangerous one
);
```

**Why it's dangerous:**

- Service role key **bypasses all RLS policies**
- Full database access (read/write/delete anything)
- If app is decompiled, your entire database is compromised

### 2. Validation Layer

The config system has built-in security checks:

```typescript
// Zod schema validates anon key
export const SupabaseConfigSchema = z.object({
  anonKey: z.string().refine((key) => !key.includes("service_role"), {
    message: "SECURITY ERROR: service_role key detected!",
  }),
});
```

If you accidentally put a service_role key in your config, the app will crash at startup with a clear error.

---

## Row Level Security (RLS)

### Enable RLS on All Tables

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
```

### Common RLS Patterns

#### 1. Users Can Read Own Data

```sql
CREATE POLICY "Users can read own data"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
```

#### 2. Users Can Update Own Data

```sql
CREATE POLICY "Users can update own data"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

#### 3. Users Can Create Own Records

```sql
CREATE POLICY "Users can create own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

#### 4. Public Read, Authenticated Write

```sql
-- Anyone can read
CREATE POLICY "Public read"
  ON posts FOR SELECT
  TO public
  USING (true);

-- Only authenticated users can create
CREATE POLICY "Authenticated write"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
```

#### 5. Role-Based Access

```sql
-- Check user role from metadata
CREATE POLICY "Admin full access"
  ON admin_table FOR ALL
  TO authenticated
  USING (
    (auth.jwt() ->> 'user_role')::text = 'admin'
  );
```

---

## Edge Functions for Privileged Operations

### When to Use Edge Functions

Use Edge Functions for:

- Admin operations (delete users, ban accounts)
- Payment processing (Stripe API calls)
- External API calls (OpenAI, Google Vision, etc.)
- Batch operations
- Complex business logic that should be server-side
- **Rate-limited client inserts** (growth/feature requests — see below)

### ⚠️ Growth Ingestion — Known Risk

The `feature_requests` table currently accepts direct client INSERTs. RLS prevents user_id spoofing but **does not rate-limit**. A bot could flood thousands of rows, poisoning data or running up Supabase billing.

**Current state:** Direct `client.from("feature_requests").insert(payload)` with client-side cooldown (convenience only).

**Recommended hardening:** Replace with a Supabase Edge Function:

```typescript
// supabase/functions/submit-feature-request/index.ts
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMIT_PER_MIN = 5;
const rateLimitMap = new Map<string, number[]>();

serve(async (req) => {
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const now = Date.now();

  // Per-IP rate limiting
  const timestamps =
    rateLimitMap.get(ip)?.filter((t) => now - t < 60_000) ?? [];
  if (timestamps.length >= RATE_LIMIT_PER_MIN) {
    return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    });
  }
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);

  // Validate and insert
  const body = await req.json();
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Allowlist fields — strip anything unexpected
  const { error } = await supabase.from("feature_requests").insert({
    title: String(body.title).slice(0, 500),
    description: body.description
      ? String(body.description).slice(0, 2000)
      : null,
    category: body.category,
    user_id: body.user_id,
    anon_id: body.anon_id,
    platform: body.platform,
    app_version: body.app_version,
  });

  if (error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
    });
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

**Client change:**

```typescript
// In SupabaseGrowthClient.ts — replace:
//   client.from("feature_requests").insert(payload)
// with:
//   client.functions.invoke("submit-feature-request", { body: payload })
```

### Example: Admin User Deletion

**Mobile App:**

```typescript
// Mobile app just calls the function
import { callEdgeFunction } from "@/src/lib/supabase";

async function deleteUserAccount(userId: string) {
  const { data, error } = await callEdgeFunction({
    name: "admin-delete-user",
    body: { userId },
  });

  if (error) {
    console.error("Failed to delete user:", error);
  }
}
```

**Edge Function:**

```typescript
// supabase/functions/admin-delete-user/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Get service role client (safe here, runs on Supabase servers)
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Get authenticated user from request
  const authHeader = req.headers.get("Authorization")!;
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
  } = await supabaseAdmin.auth.getUser(token);

  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // Check if user is admin (from metadata)
  if (user.user_metadata?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }

  // Now we can safely perform admin operation
  const { userId } = await req.json();

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

### Example: External API Call (OpenAI Vision)

**Mobile App:**

```typescript
const { data } = await callEdgeFunction<{ labels: string[] }>({
  name: "analyze-image",
  body: { imageUrl: "https://..." },
});
```

**Edge Function:**

```typescript
// supabase/functions/analyze-image/index.ts
serve(async (req) => {
  const { imageUrl } = await req.json();

  // OpenAI API key is safe here (server-side)
  const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

  const response = await fetch("https://api.openai.com/v1/vision", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: imageUrl,
      model: "gpt-4-vision",
    }),
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});
```

---

## Secrets Management

### Environment Variables in Edge Functions

Set secrets in Supabase Dashboard:

```bash
# Project Settings → Edge Functions → Environment Variables
OPENAI_API_KEY=sk-...
STRIPE_SECRET_KEY=sk_live_...
```

Or via Supabase CLI:

```bash
supabase secrets set OPENAI_API_KEY=sk-...
```

### Never in Mobile Code

```typescript
// ❌ WRONG - These will be bundled into the app
const OPENAI_KEY = "sk-...";
const STRIPE_KEY = "sk_live_...";

// ✅ RIGHT - Call Edge Function that has the key
const { data } = await callEdgeFunction({
  name: "process-payment",
  body: { amount: 999 },
});
```

---

## Per-App Secrets

### Problem: Different Stripe Accounts per App

You have multiple apps, each with its own Stripe account.

### Solution: Use Different Supabase Projects

Each app profile points to a different Supabase project:

```typescript
// Caloric app → caloric-prod Supabase project
export const caloricConfig = {
  supabase: {
    url: "https://caloric-prod.supabase.co",
    anonKey: "...",
  },
};

// Proxi app → proxi-prod Supabase project
export const proxiConfig = {
  supabase: {
    url: "https://proxi-prod.supabase.co",
    anonKey: "...",
  },
};
```

Then set different secrets in each Supabase project:

- `caloric-prod` project has Caloric's Stripe key
- `proxi-prod` project has Proxi's Stripe key

Edge Functions automatically use the correct project's secrets.

---

## Authentication Security

### Secure Sign-Up

```typescript
// ✅ GOOD: Let Supabase handle password hashing
const { data, error } = await supabase.auth.signUp({
  email: "user@example.com",
  password: "secure-password",
});

// Add user metadata (stored in JWT)
const { data, error } = await supabase.auth.updateUser({
  data: {
    name: "John",
    role: "user", // Not 'admin' by default!
  },
});
```

### Prevent Admin Role Escalation

```sql
-- Create trigger to prevent users from setting admin role
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow during user creation (for actual admins)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Prevent changing role to admin via update
  IF NEW.user_metadata->>'role' = 'admin'
     AND OLD.user_metadata->>'role' != 'admin' THEN
    RAISE EXCEPTION 'Cannot set admin role';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_role_escalation
  BEFORE UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();
```

### JWT Validation

The anon key is a JWT token. Supabase validates it automatically, but you can inspect claims:

```typescript
// In Edge Function
const authHeader = req.headers.get("Authorization")!;
const token = authHeader.replace("Bearer ", "");

// Decode JWT (already validated by Supabase)
const {
  data: { user },
} = await supabase.auth.getUser(token);

// Check claims
if (user.user_metadata?.role !== "admin") {
  return new Response("Forbidden", { status: 403 });
}
```

---

## Data Validation

### Client-Side (Mobile)

```typescript
import { z } from "zod";

// Validate user input before sending to Supabase
const PostSchema = z.object({
  title: z.string().min(1).max(100),
  content: z.string().min(1).max(10000),
  tags: z.array(z.string()).max(10),
});

const validatedPost = PostSchema.parse(userInput);
```

### Server-Side (Edge Functions)

Always validate again on the server:

```typescript
// Even if client validates, always validate in Edge Functions
const { title, content } = await req.json();

if (!title || title.length > 100) {
  return new Response("Invalid title", { status: 400 });
}

// Sanitize before inserting
const sanitizedContent = DOMPurify.sanitize(content);
```

---

## Common Security Mistakes

### ❌ Mistake 1: Trusting Client Data

```typescript
// ❌ WRONG: Client sends user_id
const { user_id } = await req.json();
await supabase.from("posts").insert({ user_id, content });
```

**Why it's wrong:** Attacker can send any user_id and create posts as them.

**✅ Solution:**

```typescript
// ✅ RIGHT: Get user from auth token
const {
  data: { user },
} = await supabase.auth.getUser(token);
await supabase.from("posts").insert({
  user_id: user.id, // Use authenticated user's ID
  content,
});
```

### ❌ Mistake 2: Weak RLS Policies

```sql
-- ❌ WRONG: Checks if user_id matches, but doesn't check if user is authenticated
CREATE POLICY "Users can read own posts"
  ON posts FOR SELECT
  USING (user_id = current_setting('request.jwt.claims')::json->>'sub');
```

**Why it's wrong:** Anonymous users could potentially bypass this.

**✅ Solution:**

```sql
-- ✅ RIGHT: Explicitly require authentication
CREATE POLICY "Users can read own posts"
  ON posts FOR SELECT
  TO authenticated  -- Only authenticated users
  USING (auth.uid() = user_id);
```

### ❌ Mistake 3: Storing Sensitive Data Unencrypted

```typescript
// ❌ WRONG: Storing credit card in plaintext
await supabase.from("users").update({
  credit_card: "4111-1111-1111-1111",
});
```

**✅ Solution:** Never store sensitive payment data. Use Stripe/payment provider directly.

---

## Security Checklist

When launching a new app:

- [ ] All tables have RLS enabled
- [ ] RLS policies tested with different user roles
- [ ] No service_role key in mobile code
- [ ] All admin operations use Edge Functions
- [ ] External API keys in Edge Functions only
- [ ] User input validated client and server side
- [ ] Auth tokens properly validated
- [ ] No sensitive data stored in database
- [ ] Rate limiting enabled on auth endpoints
- [ ] Supabase project has strong database password
- [ ] Edge Function environment variables set
- [ ] App uses HTTPS only (enforced by Expo/Supabase)

---

## Incident Response

### If Anon Key is Leaked

**Impact:** Low - anon key respects RLS policies

**Action:**

1. Review RLS policies to ensure they're correct
2. Optionally rotate key in Supabase Dashboard
3. Update profile configs with new key
4. Rebuild and redeploy app

### If Service Role Key is Leaked

**Impact:** CRITICAL - full database access

**Action:**

1. **Immediately** rotate key in Supabase Dashboard
2. Audit database for unauthorized changes
3. Review all Edge Functions for security issues
4. Update Edge Function environment variables
5. Review how key was leaked and prevent recurrence

### If User Account is Compromised

**Action:**

1. User can reset password via email
2. Admin can force logout via Edge Function:
   ```typescript
   await supabaseAdmin.auth.admin.signOut(userId);
   ```
3. Review audit logs for suspicious activity

---

## Personally Identifiable Information (PII) Protection

### Email Hashing for Analytics

Raw email addresses must never be sent to analytics services (PostHog, etc.):

```typescript
// ✅ CORRECT - Hash email before analytics
import { hashEmail } from "@/src/features/auth/AuthProvider";

const session = await getSession();
analytics.identify({
  email_hash: hashEmail(session.user.email), // SHA-256 hash
});

// ❌ WRONG - Never send raw email
// analytics.identify({ email: session.user.email });
```

**Why:**

- Analytics logs are NOT encrypted
- Raw emails enable user identification and tracking
- Hash is deterministic (same user = same hash each time)
- Hash cannot be reversed to recover original email

### Debug Screen Production Gating

All development screens must be inaccessible in production builds. Every debug screen requires this pattern:

```typescript
// app/(tabs)/caloric/[debug-screen].tsx
import { Redirect } from "expo-router";

export default function DebugScreen() {
  // ✅ Guards checked at module load time, removed in production
  if (!__DEV__) return <Redirect href="/(tabs)/caloric" />;

  return <View>
    {/* Debug UI only visible in development */}
  </View>;
}
```

### Logging & Sensitive Data Redaction

Automatic redaction prevents secrets from leaking in logs:

```typescript
// src/logging/redactor.ts
import { redactSensitive } from "@/src/logging";

// Automatically redacts:
// - JWT tokens (eyJ...) → [JWT_REDACTED]
// - API keys → [KEY_REDACTED]
// - Authorization headers → Bearer [TOKEN_REDACTED]
// - Stripe keys → [STRIPE_KEY_REDACTED]

console.log(redactSensitive(`User token: ${jwtToken}`));
// Result: "User token: [JWT_REDACTED]"
```

Run security audits before deployment:

```bash
npm run caloric:security  # Scans for leaks and violations
npm run test -- __tests__/security.test.ts  # 11 in-depth security tests
```

---

## For Fork Maintainers

### Fork-Safe Design

Mobile-core requires only **environment/profile changes** for secure forks:

```bash
# ✅ SAFE environment-only approach
DATABASE_URL=your-prod-db ANON_KEY=your-key npm run build

# ⚠️ UNSAFE - Never modify source code (use .env instead)
```

Pre-deployment checklist:

```bash
npm run caloric:security          # Secret scan
npm run caloric:verify:security   # Full security verification
npm run validate                      # All tests pass
```

---

## Further Reading

- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- [React Native Security](https://reactnative.dev/docs/security)
