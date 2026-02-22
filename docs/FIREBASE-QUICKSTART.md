# 🔥 Firebase Quick Start Guide

**5-Minute Setup for Existing Apps**

---

## Prerequisites

- Mobile-core repo cloned
- App profile already configured (e.g., `intake` or `proxi`)
- Firebase Console access

---

## Setup Steps

### 1. Create Firebase Project (2 min)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project: `myapp-dev`
3. Enable Analytics and Crashlytics

### 2. Register Apps (2 min)

#### iOS

- Add iOS app
- Bundle ID: `com.company.myapp.dev`
- Download `GoogleService-Info.plist`
- Save as: `ios/GoogleService-Info-dev.plist`

#### Android

- Add Android app
- Package name: `com.company.myapp.dev`
- Download `google-services.json`
- Save as: `android/app/google-services-dev.json`

### 3. Update Profile (3 min)

Open `src/config/profiles/myapp.ts` and add:

```typescript
firebase: {
  ios: {
    googleAppId: "1:123456789:ios:abc123",      // From plist: GOOGLE_APP_ID
    gcmSenderId: "123456789",                   // From plist: GCM_SENDER_ID
    apiKey: "AIzaSy...",                        // From plist: API_KEY
    projectId: "myapp-dev",                     // From plist: PROJECT_ID
    storageBucket: "myapp-dev.appspot.com",     // From plist: STORAGE_BUCKET
    bundleId: "com.company.myapp.dev",          // From plist: BUNDLE_ID
  },
  android: {
    googleAppId: "1:123456789:android:def456",  // From json: client[0].client_info.android_client_info.package_name
    apiKey: "AIzaSy...",                        // From json: client[0].api_key[0].current_key
    projectId: "myapp-dev",                     // From json: project_info.project_id
    storageBucket: "myapp-dev.appspot.com",     // From json: project_info.storage_bucket
    gcmSenderId: "123456789",                   // From json: project_info.project_number
    packageName: "com.company.myapp.dev",       // Your package name
  },
},

features: {
  // ... existing features
  firebaseAnalytics: true,      // ✅ Enable Analytics
  crashReporting: true,          // ✅ Enable Crashlytics
  performanceMonitoring: false,  // ❌ Optional
}
```

### 4. Initialize (30 sec)

Edit `app/_layout.tsx`:

```typescript
import { initializeFirebase } from "@/src/lib/firebase";

export default function RootLayout() {
  React.useEffect(() => {
    initializeFirebase();
  }, []);

  // ... rest of layout
}
```

### 5. Test (30 sec)

```bash
npm start

# Check console for:
# [Firebase] App initialized
# [Firebase] Analytics enabled
# [Firebase] Crashlytics enabled
```

---

## Usage

### Track Events

```typescript
import { trackEvent } from "@/src/lib/firebase";

trackEvent("button_clicked", { button_id: "cta" });
```

### Record Errors

```typescript
import { recordError } from "@/src/lib/firebase";

try {
  await dangerousOperation();
} catch (error) {
  recordError(error, { context: "user_action" });
}
```

### Set User Context

```typescript
import { setUserId, setCrashUserId } from "@/src/lib/firebase";

setUserId("user_123"); // For analytics
setCrashUserId("user_123"); // For crash reports
```

---

## Production Setup

### 1. Create Production Firebase Project

Repeat steps 1-3 for `myapp-prod` (different project)

### 2. Store as EAS Secret

```bash
# iOS
cat ios/GoogleService-Info-prod.plist | base64 | \
  eas secret:create --scope project \
  --name FIREBASE_IOS_PROD_CONFIG --type string

# Android
cat android/app/google-services-prod.json | base64 | \
  eas secret:create --scope project \
  --name FIREBASE_ANDROID_PROD_CONFIG --type string
```

### 3. Build

```bash
eas build --profile myapp-prod --platform all
```

Build hook automatically uses production secrets!

---

## Multi-Environment (Optional)

Create 3 Firebase projects:

- `myapp-dev` → Development
- `myapp-staging` → Staging
- `myapp-prod` → Production

Add environment overrides to profile:

```typescript
environments: {
  dev: {
    firebase: {
      ios: { projectId: "myapp-dev", ... },
      android: { projectId: "myapp-dev", ... },
    },
  },
  staging: {
    firebase: {
      ios: { projectId: "myapp-staging", ... },
      android: { projectId: "myapp-staging", ... },
    },
  },
  // prod uses base config
}
```

---

## Troubleshooting

### "Firebase not initialized"

Check feature flags:

```typescript
features: {
  firebaseAnalytics: true,  // Must be true
  crashReporting: true,     // Must be true
}
```

### "GoogleService-Info.plist not found"

Verify file exists:

```bash
ls ios/GoogleService-Info-dev.plist
```

### Events not showing in Console

Use **DebugView** in Firebase Console (real-time):

1. Firebase Console → Analytics → DebugView
2. Enable debug mode on device
3. Events appear instantly

---

## What's Next?

- **Full Guide**: See [docs/FIREBASE.md](docs/FIREBASE.md)
- **Examples**: See [src/examples/firebase-usage.tsx](src/examples/firebase-usage.tsx)
- **Summary**: See [FIREBASE-SUMMARY.md](FIREBASE-SUMMARY.md)

---

**Total Setup Time: ~8 minutes**

✅ Analytics tracking  
✅ Crash reporting  
✅ Multi-environment support  
✅ EAS build integration  
✅ Production secrets managed

**You're ready to ship!** 🚀
