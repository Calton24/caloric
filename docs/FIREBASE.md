# Firebase Integration Guide

## Overview

Firebase has been integrated as an **optional instrumentation layer** for:

- **Analytics**: Track user behavior, screen views, custom events
- **Crashlytics**: Monitor crashes and non-fatal errors
- **Performance Monitoring**: (Optional) Track app performance metrics

**Important**: Supabase remains the source of truth for Auth and Database. Firebase is purely for instrumentation.

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Setup for New App](#setup-for-new-app)
4. [Firebase Project Configuration](#firebase-project-configuration)
5. [Native Files Strategy](#native-files-strategy)
6. [EAS Build Configuration](#eas-build-configuration)
7. [Usage Examples](#usage-examples)
8. [Testing](#testing)
9. [Troubleshooting](#troubleshooting)
10. [Clone Checklist](#clone-checklist)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics
```

Optional (for performance monitoring):

```bash
npm install @react-native-firebase/perf
```

### 2. Enable Firebase in Profile

Edit `src/config/profiles/yourapp.ts`:

```typescript
features: {
  firebaseAnalytics: true,      // Enable Analytics
  crashReporting: true,          // Enable Crashlytics
  performanceMonitoring: false,  // Optional
}
```

### 3. Add Firebase Config

Add to your profile with **real Firebase project credentials**:

```typescript
firebase: {
  ios: {
    googleAppId: "1:123456789:ios:abc123",
    gcmSenderId: "123456789",
    apiKey: "AIzaSy...",
    projectId: "myapp-prod",
    storageBucket: "myapp-prod.appspot.com",
    bundleId: "com.yourcompany.myapp",
  },
  android: {
    googleAppId: "1:123456789:android:def456",
    apiKey: "AIzaSy...",
    projectId: "myapp-prod",
    storageBucket: "myapp-prod.appspot.com",
    gcmSenderId: "123456789",
    packageName: "com.yourcompany.myapp",
  },
}
```

### 4. Initialize Firebase

In your `app/_layout.tsx`:

```typescript
import { initializeFirebase } from "@/src/lib/firebase";

export default function RootLayout() {
  React.useEffect(() => {
    initializeFirebase();
  }, []);

  // ... rest of layout
}
```

---

## Architecture

### Feature Flags Control Everything

```typescript
// In your profile config
features: {
  firebaseAnalytics: false,       // ❌ Analytics disabled → no-op
  crashReporting: true,           // ✅ Crashlytics enabled
  performanceMonitoring: false,   // ❌ Performance disabled → no-op
}
```

### Safe No-Op Behavior

All Firebase functions are **safe to call** even when disabled:

```typescript
// If firebaseAnalytics: false
trackEvent("button_clicked"); // No-op, no error

// If crashReporting: false
recordError(new Error("fail")); // No-op, no error
```

This means you can write Firebase calls throughout your codebase without conditionals.

### Singleton Pattern

Firebase initializes once per app lifecycle:

```typescript
initializeFirebase(); // First call: initializes
initializeFirebase(); // Subsequent calls: no-op
```

---

## Setup for New App

### Step 1: Create Firebase Projects

Create **3 Firebase projects** (one per environment):

- `myapp-dev` (development)
- `myapp-staging` (staging)
- `myapp-prod` (production)

**Why 3 projects?**

- Separate analytics data per environment
- Different crash reports (don't mix dev crashes with prod)
- Different bundle IDs (iOS) / package names (Android)

### Step 2: Download Config Files

For each Firebase project:

#### iOS: Download `GoogleService-Info.plist`

1. Firebase Console → Project Settings → iOS app
2. Download `GoogleService-Info.plist`
3. Save as:
   - `ios/GoogleService-Info-dev.plist` (for dev)
   - `ios/GoogleService-Info-staging.plist` (for staging)
   - `ios/GoogleService-Info-prod.plist` (for production)

#### Android: Download `google-services.json`

1. Firebase Console → Project Settings → Android app
2. Download `google-services.json`
3. Save as:
   - `android/app/google-services-dev.json` (for dev)
   - `android/app/google-services-staging.json` (for staging)
   - `android/app/google-services-prod.json` (for production)

### Step 3: Extract Config to Profile

Open each config file and extract values to your profile:

**From `GoogleService-Info.plist` (iOS):**

```xml
<key>GOOGLE_APP_ID</key>
<string>1:123:ios:abc</string>  <!-- googleAppId -->

<key>GCM_SENDER_ID</key>
<string>123456</string>  <!-- gcmSenderId -->

<key>API_KEY</key>
<string>AIzaSy...</string>  <!-- apiKey -->

<key>PROJECT_ID</key>
<string>myapp-prod</string>  <!-- projectId -->

<key>STORAGE_BUCKET</key>
<string>myapp-prod.appspot.com</string>  <!-- storageBucket -->

<key>BUNDLE_ID</key>
<string>com.company.myapp</string>  <!-- bundleId -->
```

**From `google-services.json` (Android):**

```json
{
  "client": [
    {
      "client_info": {
        "android_client_info": {
          "package_name": "com.company.myapp" // packageName
        }
      },
      "api_key": [{ "current_key": "AIzaSy..." }], // apiKey
      "services": {
        "appinvite_service": {
          "other_platform_oauth_client": [
            {
              "client_id": "123-xxx.apps.googleusercontent.com" // clientId
            }
          ]
        }
      }
    }
  ],
  "project_info": {
    "project_id": "myapp-prod", // projectId
    "project_number": "123456", // gcmSenderId
    "storage_bucket": "myapp-prod.appspot.com" // storageBucket
  }
}
```

Add to your profile:

```typescript
// src/config/profiles/myapp.ts

firebase: {
  ios: {
    googleAppId: "...",  // From GoogleService-Info.plist
    gcmSenderId: "...",
    apiKey: "...",
    projectId: "myapp-prod",
    storageBucket: "myapp-prod.appspot.com",
    bundleId: "com.company.myapp",
  },
  android: {
    googleAppId: "...",  // From google-services.json
    apiKey: "...",
    projectId: "myapp-prod",
    storageBucket: "myapp-prod.appspot.com",
    gcmSenderId: "...",
    packageName: "com.company.myapp",
  },
},
environments: {
  dev: {
    firebase: {
      ios: {
        projectId: "myapp-dev",
        storageBucket: "myapp-dev.appspot.com",
        bundleId: "com.company.myapp.dev",
        googleAppId: "1:123:ios:dev123",
        // ... other fields from dev plist
      },
      android: {
        projectId: "myapp-dev",
        storageBucket: "myapp-dev.appspot.com",
        packageName: "com.company.myapp.dev",
        googleAppId: "1:123:android:dev123",
        // ... other fields from dev json
      },
    },
  },
}
```

---

## Native Files Strategy

### The Problem

React Native Firebase needs `GoogleService-Info.plist` (iOS) and `google-services.json` (Android) at build time. But we have 3 environments (dev/staging/prod).

### Solution: EAS Build Hooks

We'll use EAS build hooks to **copy the correct config file** based on the environment **before building**.

### Implementation

#### 1. Store All Config Files

```
ios/
  GoogleService-Info-dev.plist
  GoogleService-Info-staging.plist
  GoogleService-Info-prod.plist

android/app/
  google-services-dev.json
  google-services-staging.json
  google-services-prod.json
```

**Important**: Do NOT commit production secrets! Use EAS Secrets (see below).

#### 2. Create EAS Build Hooks

Create `scripts/eas-build-firebase-setup.sh`:

```bash
#!/bin/bash

# EAS Build Hook: Copy correct Firebase config based on APP_ENV

set -e

APP_ENV="${EXPO_PUBLIC_APP_ENV:-prod}"

echo "🔥 Setting up Firebase config for environment: $APP_ENV"

# iOS
if [ -f "ios/GoogleService-Info-$APP_ENV.plist" ]; then
  cp "ios/GoogleService-Info-$APP_ENV.plist" "ios/GoogleService-Info.plist"
  echo "✅ Copied iOS Firebase config for $APP_ENV"
else
  echo "⚠️  Warning: ios/GoogleService-Info-$APP_ENV.plist not found"
fi

# Android
if [ -f "android/app/google-services-$APP_ENV.json" ]; then
  cp "android/app/google-services-$APP_ENV.json" "android/app/google-services.json"
  echo "✅ Copied Android Firebase config for $APP_ENV"
else
  echo "⚠️  Warning: android/app/google-services-$APP_ENV.json not found"
fi

echo "🔥 Firebase config setup complete"
```

Make it executable:

```bash
chmod +x scripts/eas-build-firebase-setup.sh
```

#### 3. Update `eas.json`

Add build hooks to each profile:

```json
{
  "build": {
    "intake-dev": {
      "env": {
        "EXPO_PUBLIC_APP_PROFILE": "intake",
        "EXPO_PUBLIC_APP_ENV": "dev"
      },
      "prebuildCommand": "./scripts/eas-build-firebase-setup.sh"
    },
    "intake-prod": {
      "env": {
        "EXPO_PUBLIC_APP_PROFILE": "intake",
        "EXPO_PUBLIC_APP_ENV": "prod"
      },
      "prebuildCommand": "./scripts/eas-build-firebase-setup.sh"
    }
  }
}
```

#### 4. Add to `.gitignore`

```gitignore
# Firebase production configs (keep dev configs for local dev)
ios/GoogleService-Info-prod.plist
ios/GoogleService-Info-staging.plist
android/app/google-services-prod.json
android/app/google-services-staging.json

# Generated files (will be created by build hook)
ios/GoogleService-Info.plist
android/app/google-services.json
```

**Commit dev configs**:

```gitignore
# ✅ These ARE committed for local development
# ios/GoogleService-Info-dev.plist
# android/app/google-services-dev.json
```

#### 5. Use EAS Secrets for Production

Store production Firebase configs as **EAS Secrets**:

```bash
# Store as base64 to preserve formatting
cat ios/GoogleService-Info-prod.plist | base64 | eas secret:create --scope project --name FIREBASE_IOS_PROD_CONFIG --type string

cat android/app/google-services-prod.json | base64 | eas secret:create --scope project --name FIREBASE_ANDROID_PROD_CONFIG --type string
```

Update build hook to decode secrets:

```bash
# In scripts/eas-build-firebase-setup.sh

if [ "$APP_ENV" == "prod" ]; then
  # Decode from EAS secrets
  if [ -n "$FIREBASE_IOS_PROD_CONFIG" ]; then
    echo "$FIREBASE_IOS_PROD_CONFIG" | base64 -d > "ios/GoogleService-Info.plist"
  fi

  if [ -n "$FIREBASE_ANDROID_PROD_CONFIG" ]; then
    echo "$FIREBASE_ANDROID_PROD_CONFIG" | base64 -d > "android/app/google-services.json"
  fi
fi
```

---

## EAS Build Configuration

Your `eas.json` should look like this:

```json
{
  "cli": {
    "version": ">= 13.2.0",
    "appVersionSource": "remote"
  },
  "build": {
    "intake-dev": {
      "extends": "development",
      "env": {
        "EXPO_PUBLIC_APP_PROFILE": "intake",
        "EXPO_PUBLIC_APP_ENV": "dev"
      },
      "prebuildCommand": "./scripts/eas-build-firebase-setup.sh",
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      }
    },

    "intake-staging": {
      "distribution": "internal",
      "env": {
        "EXPO_PUBLIC_APP_PROFILE": "intake",
        "EXPO_PUBLIC_APP_ENV": "staging"
      },
      "prebuildCommand": "./scripts/eas-build-firebase-setup.sh"
    },

    "intake-prod": {
      "distribution": "store",
      "env": {
        "EXPO_PUBLIC_APP_PROFILE": "intake",
        "EXPO_PUBLIC_APP_ENV": "prod"
      },
      "prebuildCommand": "./scripts/eas-build-firebase-setup.sh",
      "ios": {
        "simulator": false
      }
    }
  }
}
```

---

## Usage Examples

### Initialize Firebase

```typescript
// app/_layout.tsx
import { initializeFirebase } from "@/src/lib/firebase";

export default function RootLayout() {
  React.useEffect(() => {
    initializeFirebase().then((success) => {
      if (success) {
        console.log("Firebase ready");
      }
    });
  }, []);
}
```

### Track Events

```typescript
import { trackEvent, logScreenView } from "@/src/lib/firebase";

// Custom event
trackEvent("food_scanned", {
  food_type: "apple",
  calories: 95,
  meal_time: "breakfast",
});

// Screen view
logScreenView("HomeScreen", "Home");

// Pre-defined events
import { logLogin, logPurchase } from "@/src/lib/firebase";

logLogin("email");
logPurchase(9.99, "USD", [{ id: "premium_monthly" }]);
```

### Set User Context

```typescript
import { setUserId, setUserProperties } from "@/src/lib/firebase";

// After login
const user = await supabase.auth.getUser();
setUserId(user.id);

setUserProperties({
  subscription_tier: "premium",
  signup_date: "2024-01-15",
});
```

### Record Errors

```typescript
import { recordError, setCrashUserId } from "@/src/lib/firebase";

// Non-fatal error
try {
  await fetchData();
} catch (error) {
  recordError(error, {
    endpoint: "/api/data",
    userId: user.id,
  });
}

// Set user for crash reports
setCrashUserId(user.id);
```

### Error Boundary Integration

```typescript
import { recordError } from '@/src/lib/firebase';
import { ErrorBoundary } from 'react-error-boundary';

function ErrorFallback({ error }) {
  return <Text>Something went wrong</Text>;
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        recordError(error, { errorInfo });
      }}
    >
      <YourApp />
    </ErrorBoundary>
  );
}
```

---

## Testing

### Test Firebase Initialization

```typescript
import { isFirebaseReady, getInitializationError } from "@/src/lib/firebase";

if (isFirebaseReady()) {
  console.log("✅ Firebase ready");
} else {
  console.error("❌ Firebase failed:", getInitializationError());
}
```

### Test Analytics (Dev Mode)

```typescript
import { trackEvent, resetAnalyticsData } from "@/src/lib/firebase";

// Enable debug mode in dev
// iOS: Product > Scheme > Edit Scheme > Arguments > -FIRDebugEnabled
// Android: adb shell setprop debug.firebase.analytics.app <package_name>

trackEvent("test_event", { test: true });

// Check Firebase Console DebugView
```

### Test Crashlytics

```typescript
import { crash, recordError } from "@/src/lib/firebase";

// Test non-fatal error
recordError(new Error("Test error"), { test: true });

// Test fatal crash (only in dev!)
if (__DEV__) {
  crash(); // Will crash the app
}
```

---

## Troubleshooting

### "Firebase not initialized"

**Cause**: Firebase features enabled but config missing or invalid.

**Fix**:

1. Check feature flags: `features.firebaseAnalytics`, `features.crashReporting`
2. Verify `firebase` config block exists in profile
3. Check console for initialization errors

### "GoogleService-Info.plist not found"

**Cause**: Firebase config file missing during build.

**Fix**:

1. Verify files exist: `ios/GoogleService-Info-{env}.plist`
2. Check build hook runs: `prebuildCommand` in `eas.json`
3. Run prebuild locally: `npx expo prebuild --clean`

### "Duplicate Firebase initialization"

**Cause**: `initializeFirebase()` called multiple times.

**Fix**: Only call once in root layout:

```typescript
// ✅ Good: Once in _layout.tsx
useEffect(() => {
  initializeFirebase();
}, []);

// ❌ Bad: In multiple components
```

### Analytics Not Appearing in Console

**Cause**: Events take 24-48 hours to appear in Firebase Console.

**Fix**:

1. Use **DebugView** in Firebase Console for real-time events
2. Enable debug mode (see Testing section)
3. Wait 24 hours for standard reports

### Build Fails: "Could not find google-services.json"

**Cause**: Build hook didn't copy config file.

**Fix**:

1. Check `scripts/eas-build-firebase-setup.sh` is executable
2. Verify `EXPO_PUBLIC_APP_ENV` is set in `eas.json`
3. Check file exists: `android/app/google-services-{env}.json`

---

## Clone Checklist

When cloning caloric for a new app with Firebase:

### 1. Create Firebase Projects

- [ ] Create 3 Firebase projects: `myapp-dev`, `myapp-staging`, `myapp-prod`
- [ ] Enable Analytics in each project
- [ ] Enable Crashlytics in each project
- [ ] (Optional) Enable Performance Monitoring

### 2. Register Apps

#### iOS

- [ ] Add iOS app to each Firebase project
- [ ] Bundle ID: `com.company.myapp.{env}`
- [ ] Download `GoogleService-Info.plist` for each
- [ ] Save as `ios/GoogleService-Info-{env}.plist`

#### Android

- [ ] Add Android app to each Firebase project
- [ ] Package name: `com.company.myapp.{env}`
- [ ] Download `google-services.json` for each
- [ ] Save as `android/app/google-services-{env}.json`

### 3. Extract Config to Profile

- [ ] Create `src/config/profiles/myapp.ts`
- [ ] Copy Firebase config structure from `intake.ts` example
- [ ] Extract values from `GoogleService-Info.plist` (iOS)
- [ ] Extract values from `google-services.json` (Android)
- [ ] Set feature flags: `firebaseAnalytics`, `crashReporting`, `performanceMonitoring`

### 4. Set Environment Variables

- [ ] Create `.env`: `EXPO_PUBLIC_APP_PROFILE=myapp`
- [ ] Set `EXPO_PUBLIC_APP_ENV=dev` for local development

### 5. Update EAS Build Profiles

- [ ] Add `myapp-dev`, `myapp-staging`, `myapp-prod` to `eas.json`
- [ ] Set `EXPO_PUBLIC_APP_PROFILE=myapp` in each
- [ ] Set `EXPO_PUBLIC_APP_ENV` appropriately
- [ ] Add `prebuildCommand: "./scripts/eas-build-firebase-setup.sh"`

### 6. Install Dependencies

```bash
npm install @react-native-firebase/app @react-native-firebase/analytics @react-native-firebase/crashlytics
```

### 7. Initialize Firebase

- [ ] Add `initializeFirebase()` to `app/_layout.tsx`

### 8. Test Locally

```bash
# Dev environment
npm start

# Check console for:
# [Firebase] App initialized
# [Firebase] Analytics enabled
# [Firebase] Crashlytics enabled
```

### 9. Test Build

```bash
# Dev build
eas build --profile myapp-dev --platform ios

# Check build logs for:
# 🔥 Setting up Firebase config for environment: dev
# ✅ Copied iOS Firebase config for dev
```

### 10. Store Production Secrets

```bash
# Only for production configs
cat ios/GoogleService-Info-prod.plist | base64 | eas secret:create --scope project --name FIREBASE_IOS_PROD_CONFIG

cat android/app/google-services-prod.json | base64 | eas secret:create --scope project --name FIREBASE_ANDROID_PROD_CONFIG
```

### 11. Verify .gitignore

```bash
# ✅ Committed (for local dev)
ios/GoogleService-Info-dev.plist
android/app/google-services-dev.json

# ❌ NOT committed (production secrets)
ios/GoogleService-Info-prod.plist
ios/GoogleService-Info-staging.plist
android/app/google-services-prod.json
android/app/google-services-staging.json
```

---

## One-Command Launch

After setup, launching a new app is:

```bash
# 1. Set profile
echo "EXPO_PUBLIC_APP_PROFILE=myapp" > .env
echo "EXPO_PUBLIC_APP_ENV=dev" >> .env

# 2. Run
npm start
```

For production build:

```bash
eas build --profile myapp-prod --platform all
```

---

## Summary

✅ **What's Good**:

- Firebase is optional (feature flags control everything)
- Safe no-op behavior when disabled
- Clean config-driven approach (matches Supabase pattern)
- Per-app, per-environment Firebase projects
- No manual copying files between clones (EAS hooks handle it)
- Production secrets stay in EAS Secrets (not committed)

✅ **What You Get**:

- Analytics: User behavior tracking
- Crashlytics: Crash and error monitoring
- Performance: (Optional) Performance metrics
- Type-safe wrappers with no-op fallbacks
- Consistent with existing Supabase config architecture

✅ **Publisher Workflow**:

1. Clone repo
2. Create 3 Firebase projects (15 min)
3. Add Firebase config to profile (5 min)
4. Add EAS build profiles (2 min)
5. Build: `eas build --profile myapp-prod`

**Total time to Firebase-enabled app: ~25 minutes**

---

**Questions?** Check [CONFIGURATION.md](./CONFIGURATION.md) for general config system docs.
