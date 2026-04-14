# Production Environment Configuration

**Last Updated:** April 11, 2026  
**Status:** Pre-Production Checklist

---

## Overview

This document outlines all environment variables and configuration required for production deployment of Caloric to the App Store and Google Play Store.

---

## Environment Variables

### Required for Production

These environment variables **MUST** be set before deploying to production:

```bash
# ── Supabase (Backend) ──
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here

# ── Analytics (PostHog) ──
EXPO_PUBLIC_POSTHOG_API_KEY=phc_your_posthog_key_here
EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# ── Error Reporting (Sentry) ──
EXPO_PUBLIC_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/123456

# ── Revenue (RevenueCat) ──
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=rcb_your_ios_key_here
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=rcb_your_android_key_here

# ── OAuth Providers ──
EXPO_PUBLIC_AUTH_GOOGLE=1  # Enable Google Sign-In
EXPO_PUBLIC_AUTH_APPLE=1   # Enable Apple Sign-In

# ── App Environment ──
EXPO_PUBLIC_APP_PROFILE=caloric
EXPO_PUBLIC_APP_ENV=prod
```

### Optional for Production

These variables are optional but recommended:

```bash
# ── Feature Flags ──
EXPO_PUBLIC_ENABLE_CAMERA_LOG=1
EXPO_PUBLIC_ENABLE_VOICE_LOG=1
EXPO_PUBLIC_ENABLE_LIVE_ACTIVITY=1

# ── Debugging (should be false in production) ──
EXPO_PUBLIC_ENABLE_DEV_MENU=0
EXPO_PUBLIC_ENABLE_DEBUG_SCREENS=0
```

---

## EAS Configuration

### Build Profiles

Production builds are configured in `eas.json`:

```json
{
  "build": {
    "caloric-store": {
      "distribution": "store",
      "env": {
        "EXPO_PUBLIC_APP_PROFILE": "caloric",
        "EXPO_PUBLIC_APP_ENV": "prod",
        "EXPO_PUBLIC_AUTH_GOOGLE": "1",
        "EXPO_PUBLIC_AUTH_APPLE": "1"
      },
      "prebuildCommand": "npx expo prebuild --clean",
      "ios": {
        "autoIncrement": true,
        "image": "macos-sequoia-15.3-xcode-16.2"
      }
    }
  },
  "submit": {
    "caloric-store": {
      "ios": {
        "appleId": "madire24@googlemail.com",
        "ascAppId": "6761738426",
        "appleTeamId": "93HBV58WBY"
      },
      "android": {
        "serviceAccountKeyPath": "./secrets/google-play-service-account.json",
        "track": "production"
      }
    }
  }
}
```

### Building for Production

```bash
# iOS Production Build
eas build --platform ios --profile caloric-store

# Android Production Build
eas build --platform android --profile caloric-store

# Submit to App Store
eas submit --platform ios --profile caloric-store

# Submit to Google Play
eas submit --platform android --profile caloric-store
```

---

## app.json Configuration

### Bundle Identifiers

Production bundle identifiers (configured in `app.json`):

- **iOS Development:** `com.calton24.caloric.dev`
- **iOS Production:** `com.calton24.caloric` (update before store build)
- **Android Development:** `com.calton24.caloric.dev`
- **Android Production:** `com.calton24.caloric` (update before store build)

### Privacy Permissions (iOS)

All required `NSUsageDescription` strings are configured in `app.json`:

- ✅ `NSMotionUsageDescription` - Pedometer for Live Activity
- ✅ `NSMicrophoneUsageDescription` - Voice meal logging
- ✅ `NSSpeechRecognitionUsageDescription` - Speech-to-text
- ✅ `NSCameraUsageDescription` - Food scanning
- ✅ `NSHealthShareUsageDescription` - Read weight from Apple Health
- ✅ `NSHealthUpdateUsageDescription` - Write meals/weight to Apple Health
- ✅ `NSUserTrackingUsageDescription` - App Tracking Transparency (ATT)

---

## Secrets Management

### Required Secrets (Not in Git)

These files **MUST NOT** be committed to Git:

1. **`.env.local`** - Local development environment variables
2. **`secrets/google-play-service-account.json`** - Google Play service account key
3. **iOS Certificates & Provisioning Profiles** - Managed by EAS

### Where to Store Production Secrets

1. **EAS Secrets** (Recommended for CI/CD):

   ```bash
   eas secret:create --name SUPABASE_URL --value "https://..."
   eas secret:create --name SUPABASE_ANON_KEY --value "eyJ..."
   eas secret:create --name POSTHOG_API_KEY --value "phc_..."
   ```

2. **Local .env.local** (For local testing):
   ```bash
   cp .env.example .env.local
   # Fill in production values
   ```

---

## Third-Party Service Configuration

### 1. Supabase

- **Project URL:** Set in `EXPO_PUBLIC_SUPABASE_URL`
- **Anon Key:** Set in `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- **RLS Policies:** Ensure all tables have proper Row Level Security
- **Edge Functions:** Deploy `delete-account` and `export-user-data` functions

### 2. PostHog (Analytics)

- **API Key:** Set in `EXPO_PUBLIC_POSTHOG_API_KEY`
- **Host:** `https://app.posthog.com` (or self-hosted)
- **Feature Flags:** Configure in PostHog dashboard
- **Session Recording:** Disabled by default for privacy

### 3. Sentry (Error Reporting)

- **DSN:** Set in `EXPO_PUBLIC_SENTRY_DSN`
- **Environment:** Set to `production` in production builds
- **Release Tracking:** Automatically handled by `sentry-expo`
- **Source Maps:** Uploaded during EAS build

### 4. RevenueCat (Subscriptions)

- **iOS API Key:** Set in `EXPO_PUBLIC_REVENUECAT_API_KEY_IOS`
- **Android API Key:** Set in `EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID`
- **Products:** Configure in RevenueCat dashboard
- **Webhooks:** Set up for Supabase integration

### 5. Google Sign-In

- **iOS Client ID:** Configured in Google Cloud Console
- **Android Client ID:** Configured in Google Cloud Console
- **OAuth Consent Screen:** Must be verified for production
- **Scopes:** `email`, `profile` only

### 6. Apple Sign-In

- **Enabled via:** App Identifier entitlements
- **Provisioning Profile:** Must include Apple Sign-In capability
- **Email Privacy:** Handle private relay emails (`privaterelay.appleid.com`)

---

## Pre-Production Checklist

Before submitting to App Store/Google Play:

### Environment & Configuration

- [ ] All production environment variables set in EAS Secrets
- [ ] Bundle identifiers updated to production (remove `.dev` suffix)
- [ ] Version number incremented in `app.json`
- [ ] App icons and splash screens finalized
- [x] Privacy Policy and Terms of Service URLs active (https://caloric-sage.vercel.app)

### Services & Integrations

- [ ] Supabase RLS policies tested and verified
- [ ] RevenueCat products configured (monthly, yearly)
- [ ] Sentry error reporting tested in production build
- [ ] PostHog analytics tracking verified
- [ ] Google Sign-In configured and tested
- [ ] Apple Sign-In configured and tested

### Features & Compliance

- [ ] App Tracking Transparency (ATT) prompt implemented
- [ ] Analytics consent flow implemented
- [ ] Account deletion feature tested
- [ ] In-app review prompts tested
- [ ] All permissions usage strings in `app.json`
- [ ] Privacy nutrition labels data ready (App Store Connect)

### Testing

- [ ] Production build tested on physical iOS device
- [ ] Production build tested on physical Android device
- [ ] All OAuth providers tested in production build
- [ ] In-app purchases tested with sandbox accounts
- [ ] Crash reporting verified (test crash in production build)
- [ ] Analytics events verified in PostHog dashboard

### App Store Connect / Google Play Console

- [ ] App Store Connect app created with correct bundle ID
- [ ] Google Play Console app created with correct package name
- [ ] Screenshots prepared (all required device sizes)
- [ ] App description and keywords finalized
- [ ] Privacy nutrition labels completed (iOS)
- [ ] Data safety form completed (Android)
- [ ] Age rating questionnaire completed
- [ ] Support URL and privacy policy URL set

---

## Common Issues & Solutions

### Issue: OAuth Not Working in Production

**Solution:** Ensure OAuth redirect URIs include production scheme:

```
caloric://oauth-callback
```

### Issue: RevenueCat Products Not Loading

**Solution:** Check:

1. Products created in App Store Connect / Google Play Console
2. Products imported in RevenueCat dashboard
3. API keys are correct for production environment

### Issue: Sentry Not Capturing Errors

**Solution:** Verify:

1. `EXPO_PUBLIC_SENTRY_DSN` is set correctly
2. Environment is set to `production` (not `dev`)
3. Source maps uploaded during build

### Issue: ATT Prompt Not Showing

**Solution:** Check:

1. `NSUserTrackingUsageDescription` in `app.json`
2. iOS version is 14.5+ (ATT not available on older iOS)
3. App is running in production mode (not Expo Go)

---

## Post-Launch Monitoring

After app is live in stores:

1. **Monitor Sentry** - Track crash-free rate, aim for 99.9%+
2. **Monitor PostHog** - Track user flows, conversion rates
3. **Monitor RevenueCat** - Track subscription metrics, churn
4. **Monitor App Store Reviews** - Respond to user feedback
5. **Monitor Google Play Reviews** - Respond to user feedback

---

## Version Management

### Version Numbering

Follow semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR:** Breaking changes, major features
- **MINOR:** New features, backward compatible
- **PATCH:** Bug fixes, small improvements

**Current Version:** `1.0.0`

### Build Numbers

- **iOS:** Auto-incremented by EAS (`autoIncrement: true`)
- **Android:** Auto-incremented by EAS (`autoIncrement: true`)

---

## Support & Resources

- **EAS Documentation:** https://docs.expo.dev/eas/
- **Supabase Docs:** https://supabase.com/docs
- **RevenueCat Docs:** https://www.revenuecat.com/docs
- **Sentry Docs:** https://docs.sentry.io/platforms/javascript/guides/react-native/
- **PostHog Docs:** https://posthog.com/docs

---

**Document Owner:** Development Team  
**Review Frequency:** Before each production deployment
