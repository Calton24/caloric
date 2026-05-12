# CalCut rebrand — actions outside this repository

OAuth, store listings, and some analytics surfaces show the **app name configured in dashboards**, not the strings in `app.config.ts`.

## Google Sign-In & Cloud Console

1. [Google Cloud Console](https://console.cloud.google.com/) → select Firebase-linked project → **APIs & Services → OAuth consent screen**  
   - **App name**: set to **CalCut** (was often “Caloric”).  
   - Save and publish if the consent screen is in production.

2. If you use a **Web client** for Supabase redirects, ensure authorized redirect URIs still match Supabase docs (names there are unrelated; branding is consent screen).

3. **Firebase Console** → Project settings → *Public-facing name* / support email as needed.

## Sign in with Apple

- App name users see usually comes from **App Store Connect** app record and Apple Developer **App ID** description.  
- Update the **App Store listing name** when you ship the rebranded build (`CalCut`).  
- **Do not change** Bundle ID (`com.calton.caloric`) unless you are migrating to a new app id (out of scope here).

## Supabase Auth redirect URLs

The app primary scheme is **`calcut`** (`calcut://auth/callback`, `calcut://auth/reset-password`). **`caloric`** remains registered as a legacy scheme.

In [Supabase Dashboard](https://supabase.com/dashboard) → **Authentication → URL Configuration** → **Redirect URLs**, add (if missing):

```text
calcut://auth/callback
calcut://auth/reset-password
caloric://auth/callback
caloric://auth/reset-password
```

Without these, OAuth and magic-link flows may fail after builds switch redirects to `calcut://`.

## App Store Connect & marketing URLs

- **App name / subtitle**: update to CalCut when you submit.
- Listing URL slug (e.g. `…/app/caloric/id…`) may stay until Apple changes the storefront URL structure; user-visible **name** should read CalCut.
- Hosted legal/policy sites: replace visible “Caloric” with CalCut wherever end users read them.

## RevenueCat & Sentry

- **RevenueCat**: offering / paywall display names optional; **do not rename product identifiers** tied to Store Connect.
- **Sentry**: project/display name optional in Sentry UI; release pipeline stays the same unless you rename the project deliberately.
