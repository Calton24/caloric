#!/bin/bash

# EAS Build Hook: Copy correct Firebase config based on APP_ENV
# This runs before each build to set up the environment-specific Firebase config

set -e

APP_ENV="${EXPO_PUBLIC_APP_ENV:-prod}"
APP_PROFILE="${EXPO_PUBLIC_APP_PROFILE:-intake}"

echo "🔥 Firebase Setup for $APP_PROFILE / $APP_ENV"
echo "================================================"

# iOS Configuration
echo ""
echo "📱 iOS Configuration:"
if [ "$APP_ENV" == "prod" ] && [ -n "$FIREBASE_IOS_PROD_CONFIG" ]; then
  # Production: Decode from EAS secret
  echo "  ├─ Using EAS Secret: FIREBASE_IOS_PROD_CONFIG"
  echo "$FIREBASE_IOS_PROD_CONFIG" | base64 -d > "ios/GoogleService-Info.plist"
  echo "  └─ ✅ Decoded production config from secret"
elif [ "$APP_ENV" == "staging" ] && [ -n "$FIREBASE_IOS_STAGING_CONFIG" ]; then
  # Staging: Decode from EAS secret
  echo "  ├─ Using EAS Secret: FIREBASE_IOS_STAGING_CONFIG"
  echo "$FIREBASE_IOS_STAGING_CONFIG" | base64 -d > "ios/GoogleService-Info.plist"
  echo "  └─ ✅ Decoded staging config from secret"
elif [ -f "ios/GoogleService-Info-$APP_ENV.plist" ]; then
  # Dev or local file available
  echo "  ├─ Using local file: GoogleService-Info-$APP_ENV.plist"
  cp "ios/GoogleService-Info-$APP_ENV.plist" "ios/GoogleService-Info.plist"
  echo "  └─ ✅ Copied iOS Firebase config for $APP_ENV"
else
  echo "  └─ ⚠️  Warning: No iOS Firebase config found for $APP_ENV"
  echo "     Expected: ios/GoogleService-Info-$APP_ENV.plist or EAS secret"
fi

# Android Configuration
echo ""
echo "🤖 Android Configuration:"
if [ "$APP_ENV" == "prod" ] && [ -n "$FIREBASE_ANDROID_PROD_CONFIG" ]; then
  # Production: Decode from EAS secret
  echo "  ├─ Using EAS Secret: FIREBASE_ANDROID_PROD_CONFIG"
  echo "$FIREBASE_ANDROID_PROD_CONFIG" | base64 -d > "android/app/google-services.json"
  echo "  └─ ✅ Decoded production config from secret"
elif [ "$APP_ENV" == "staging" ] && [ -n "$FIREBASE_ANDROID_STAGING_CONFIG" ]; then
  # Staging: Decode from EAS secret
  echo "  ├─ Using EAS Secret: FIREBASE_ANDROID_STAGING_CONFIG"
  echo "$FIREBASE_ANDROID_STAGING_CONFIG" | base64 -d > "android/app/google-services.json"
  echo "  └─ ✅ Decoded staging config from secret"
elif [ -f "android/app/google-services-$APP_ENV.json" ]; then
  # Dev or local file available
  echo "  ├─ Using local file: google-services-$APP_ENV.json"
  cp "android/app/google-services-$APP_ENV.json" "android/app/google-services.json"
  echo "  └─ ✅ Copied Android Firebase config for $APP_ENV"
else
  echo "  └─ ⚠️  Warning: No Android Firebase config found for $APP_ENV"
  echo "     Expected: android/app/google-services-$APP_ENV.json or EAS secret"
fi

echo ""
echo "================================================"
echo "🔥 Firebase configuration complete"
echo ""

exit 0
