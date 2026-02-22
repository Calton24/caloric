#!/bin/bash
set -e

echo "🧹 Cleaning previous builds..."
rm -rf ios/build
rm -rf ios/Pods
rm -rf ios/Podfile.lock

echo "📦 Running expo prebuild (like CI)..."
npx expo prebuild --platform ios --clean

echo "🔧 Installing CocoaPods..."
cd ios
pod install
cd ..

echo "🏗️  Building iOS app for Detox..."
npm run e2e:build

echo "✅ Build succeeded! Ready to test in CI."
