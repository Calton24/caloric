# AUTH-PROVIDERS.md (Mobile Core)

This repo (`mobile-core`) includes auth UX + abstractions. Provider configuration is **per app/project** (Supabase project + OAuth credentials).

---

## 0) Core Principle

- **mobile-core owns:** screens, flows, timers, deep-link handling, error mapping.
- **each app owns:** Supabase project settings, OAuth credentials, `.env` values, Apple/Google setup.

So forking an app = new provider config, same auth code.

---

## 1) Password Reset (Email link → App → Set new password)

### What the user flow should be

1. User enters email on Forgot Password screen.
2. App calls `resetPasswordForEmail(email, redirectTo=<deep link>)`.
3. User receives email link.
4. User taps link → opens the app on `auth/reset-password`.
5. App shows "Set new password" form.
6. Success screen → "Go to Sign In".

### Supabase Dashboard setup (per project)

Go to **Supabase → Authentication**

#### A) Email Templates

- **Authentication → Email Templates**
- Check **Reset Password** template exists and looks sane.
- It should include a link that points to Supabase recovery flow. (Supabase controls the link format.)

#### B) URL Configuration (IMPORTANT)

- **Authentication → URL Configuration**
- Add redirect URLs for:

| Environment | URL                                                                               |
| ----------- | --------------------------------------------------------------------------------- |
| Dev         | `exp://127.0.0.1:19000/--/auth/reset-password` (or whatever your Expo dev URL is) |
| Prod        | `yourappscheme://auth/reset-password`                                             |

**Notes:**

With Expo, the best practice is:

- Dev: `exp://…/--/path`
- Prod: `yourappscheme://path`

#### C) SMTP (deliverability)

If email delivery is flaky, configure custom SMTP:

- **Authentication → SMTP Settings**
- Recommended providers: **Resend** / **Postmark** / **Mailgun** (pick one).
- Without this, free-tier deliverability/rate limits can make testing feel "broken".

### App config requirements

- Ensure `scheme` is set in `app.config.ts` for prod deep links.
- Ensure the reset password route exists: `app/auth/reset-password.tsx`

### Known behavior

Supabase returns success even if the email doesn't exist (anti-enumeration). **This is expected.**

---

## 2) Google OAuth (Supabase Auth)

### What you see ("MobileCoreDev wants to use neumly…supabase.co")

That iOS prompt is normal. iOS is saying: "This app is trying to sign you in via a web domain."

You can't remove that prompt completely — it's part of secure auth session behavior. What you can control is that it's a trusted-looking domain + your UX around it.

### Supabase Dashboard setup (per project)

**Supabase → Authentication → Providers → Google**

You will need:

- **Client ID**
- **Client Secret**

Supabase also provides a **Callback URL**:

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

That callback URL is correct. It **must** be registered in Google Cloud.

### Google Cloud Console setup (per project)

#### Step 1 — Create OAuth credentials

1. **Google Cloud Console → APIs & Services → Credentials**
2. Create credentials → OAuth client ID
3. App type: **Web application** (since you're using Supabase's web-based OAuth flow via `WebBrowser.openAuthSessionAsync`)
4. Add **Authorized redirect URIs**:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

#### Step 2 — Copy values into Supabase

Back in Supabase Google provider screen:

1. Paste **Client ID(s)**
2. Paste **Client Secret**
3. Save

### Supabase URL configuration (also required)

**Authentication → URL Configuration**

Add redirect URLs for your app:

| Environment | URL                                                      |
| ----------- | -------------------------------------------------------- |
| Dev         | `exp://127.0.0.1:19000/--/auth/callback` (or your route) |
| Prod        | `yourappscheme://auth/callback`                          |

If you're not using a dedicated callback route and rely on session update + router state, you can still whitelist the scheme root:

- `yourappscheme://`
- `yourappscheme://auth/*`

### App-side notes

In `mobile-core`, Google OAuth is behind `AuthCapabilities`:

- Default **OFF**
- Enabled per app via env: `EXPO_PUBLIC_AUTH_GOOGLE=1`

---

## 3) Apple Sign In (Supabase Auth)

Apple sign-in is always more annoying. That's life.

### Supabase Dashboard setup (per project)

**Supabase → Authentication → Providers → Apple**

You'll need:

- **Services ID**
- **Team ID**
- **Key ID**
- **Private Key**
- **Redirect URL** (Supabase gives you one similar to Google)

### Apple Developer setup (per project)

1. **Apple Developer portal:**
   - Create an **App ID** with "Sign In with Apple" enabled
   - Create a **Services ID** for web auth
   - Configure return URLs:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
   - Create a **key** for Sign In with Apple
2. Copy **Team ID**, **Key ID**, **Private key** into Supabase

### App-side notes

- Real Apple Sign-In on iOS often also uses the native `expo-apple-authentication` flow.
- For speed: start with Supabase web flow (like Google), then upgrade to native later if needed.

---

## 4) Feature Flags Policy (recommended)

Default behavior in `mobile-core`:

| Capability      | Default | Key in `AuthCapabilities`           |
| --------------- | ------- | ----------------------------------- |
| Email/password  | **ON**  | `emailPassword`                     |
| Forgot password | **ON**  | (always available when email is on) |
| Google OAuth    | **OFF** | `google`                            |
| Apple OAuth     | **OFF** | `apple`                             |

Per app, enable by setting env:

```bash
EXPO_PUBLIC_AUTH_GOOGLE=1
EXPO_PUBLIC_AUTH_APPLE=1
```

Defined in `src/features/auth/authCapabilities.ts`.

---

## 5) Quick Troubleshooting

### "Unsupported provider: provider is not enabled"

You tapped Google/Apple but the provider isn't enabled in Supabase.

**Fix:** Supabase → Authentication → Providers → enable it + add credentials.

### "At least one Client ID is required"

You enabled Google provider in Supabase but didn't paste Client IDs.

**Fix:** Create OAuth Client ID in Google Cloud, paste into Supabase.

### "No email received"

1. Check spam
2. Ensure Email Template is correct
3. Ensure URL Configuration whitelists your redirect
4. Configure SMTP for reliable delivery

### "Email rate limit exceeded"

Supabase rate-limits password reset emails to ~1 per 60s. The app uses a 90s client-side cooldown to buffer this. If you hit it despite the timer, wait 2-3 minutes.

---

## 6) Minimal "Per App Setup Checklist"

For every new app fork:

- [ ] Create new Supabase project
- [ ] Set `.env`:
  - `EXPO_PUBLIC_SUPABASE_URL`
  - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Supabase → URL Configuration: add dev + prod deep links
- [ ] (Optional) SMTP settings for reliable email delivery
- [ ] (Optional) Google provider:
  - Google Cloud OAuth → redirect URI = Supabase callback
  - Paste Client ID/Secret into Supabase
  - Set `EXPO_PUBLIC_AUTH_GOOGLE=1`
- [ ] (Optional) Apple provider:
  - Apple Developer setup → Supabase callback
  - Paste credentials into Supabase
  - Set `EXPO_PUBLIC_AUTH_APPLE=1`
- [ ] Enable feature flags in app config/env
