# Requirements

**Environment setup for mobile-core development.**

---

## System Requirements

| Tool                | Required Version | Install Command                            | Purpose                 |
| ------------------- | ---------------- | ------------------------------------------ | ----------------------- |
| **Node.js**         | 20.x LTS         | `brew install node@20` or `nvm install 20` | JavaScript runtime      |
| **npm**             | 10.x+            | Comes with Node.js                         | Package manager         |
| **Watchman**        | Latest           | `brew install watchman`                    | File watching for Metro |
| **Ruby**            | 2.7+             | System Ruby or `rbenv install 2.7.2`       | CocoaPods dependency    |
| **CocoaPods**       | 1.14+            | `gem install cocoapods`                    | iOS dependency manager  |
| **Xcode**           | 15+              | Mac App Store                              | iOS development         |
| **Xcode CLI Tools** | Latest           | `xcode-select --install`                   | Build tools             |
| **Java JDK**        | 17+              | `brew install openjdk@17`                  | Android builds          |

---

## Development Tools

| Tool           | Required | Install Command                                     | Purpose                 |
| -------------- | -------- | --------------------------------------------------- | ----------------------- |
| **GitHub CLI** | ✅ Yes   | `brew install gh`                                   | Branch protection setup |
| **Maestro**    | ✅ Yes   | `curl -Ls "https://get.maestro.mobile.dev" \| bash` | E2E testing             |
| **EAS CLI**    | ✅ Yes   | `npm install -g eas-cli`                            | Expo build service      |
| **Deno**       | Optional | `brew install deno`                                 | Edge function testing   |
| **jq**         | Optional | `brew install jq`                                   | JSON parsing in scripts |

---

## Quick Setup (macOS)

```bash
# 1. Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Install core dependencies
brew install node@20 watchman gh jq

# 3. Install Ruby dependencies (for CocoaPods)
gem install cocoapods

# 4. Install Maestro for E2E tests
curl -Ls "https://get.maestro.mobile.dev" | bash

# 5. Install EAS CLI
npm install -g eas-cli

# 6. Clone and setup
git clone https://github.com/Calton24/mobile-core.git
cd mobile-core
npm install --legacy-peer-deps

# 7. Install iOS dependencies
cd ios && pod install && cd ..

# 8. Start development
npm start
```

---

## Environment Variables

Create a `.env.local` file (see `.env.example` for template):

```bash
# Required
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional (for full features)
EXPO_PUBLIC_POSTHOG_API_KEY=your_posthog_key
EXPO_PUBLIC_SENTRY_DSN=your_sentry_dsn
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

---

## Running the App

### iOS Simulator

```bash
# Build and run on simulator
npm run ios

# Or with specific device
npx expo run:ios --device "iPhone 15 Pro"
```

### Android Emulator

```bash
# Ensure Android Studio + emulator configured
npm run android
```

### Development Server Only

```bash
npm start
```

---

## Testing

### Unit Tests (Jest)

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

### E2E Tests (Maestro)

```bash
# Requires app running on simulator
npm run maestro:test

# Full CI pipeline (builds app first)
npm run maestro:ci:ios
```

### Edge Function Tests (Deno)

```bash
npm run test:edge
```

---

## Validation Commands

```bash
# Full validation (lint + typecheck + tests)
npm run validate

# Security audit (required before merge)
npm run mobile-core:verify:security

# TypeScript only
npm run typecheck
```

---

## Branch Protection Setup

After cloning, run this to enforce GitHub branch protection:

```bash
# Authenticate with GitHub
gh auth login

# Run setup script
./scripts/setup-branch-protection.sh
```

---

## iOS-Specific Setup

### Simulator Requirements

- iPhone 15 Pro simulator (iOS 17.4+)
- Boot simulator: `xcrun simctl boot "iPhone 15 Pro"`

### Signing (for device builds)

1. Open `ios/MobileCoreDev.xcworkspace` in Xcode
2. Select your team in Signing & Capabilities
3. Build to device

---

## Troubleshooting

### `pod install` fails

```bash
cd ios
pod deintegrate
pod cache clean --all
pod install --repo-update
```

### Metro bundler issues

```bash
npx expo start --clear
```

### Watchman issues

```bash
watchman watch-del-all
watchman shutdown-server
```

### Node modules issues

```bash
rm -rf node_modules
rm package-lock.json
npm install --legacy-peer-deps
```

---

## Version Matrix

Tested with:

| Component    | Version |
| ------------ | ------- |
| Expo SDK     | 54.x    |
| React Native | 0.81.x  |
| TypeScript   | 5.3.x   |
| Node.js      | 20.x    |
| Xcode        | 15+     |
| CocoaPods    | 1.14+   |
| Maestro      | 1.36+   |

---

## Related Documentation

- [README.md](./README.md) — Project overview
- [CONTRIBUTING.md](./CONTRIBUTING.md) — Contribution guidelines
- [docs/SECURITY.md](./docs/SECURITY.md) — Security practices
- [docs/BRANCH-PROTECTION.md](./docs/BRANCH-PROTECTION.md) — GitHub enforcement
