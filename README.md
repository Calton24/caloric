# Mobile Core

**Production-ready React Native infrastructure** for building authenticated, themed, real-time mobile applications with Expo.

Mobile Core is a reusable foundation that combines essential infrastructure patterns:

- 🎨 **Dynamic theming** with brand color customization
- 🔐 **Authentication** with Supabase (swappable)
- 📊 **Analytics, logging, and feature flags** (swappable abstractions)
- 🪟 **Glass UI components** with blur effects
- 📱 **Bottom sheets** with glass backgrounds
- ⚡ **Real-time** subscriptions via Supabase broadcast
- 🔧 **Multi-app configuration** system

---

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Repository Structure](#repository-structure)
- [Environment Setup](#environment-setup)
- [Supabase Setup](#supabase-setup)
- [Configuration System](#configuration-system)
- [Theme Provider Usage](#theme-provider-usage)
- [Bottom Sheets API](#bottom-sheets-api)
- [Notes Validation Harness](#notes-validation-harness)
- [Common Issues](#common-issues)
- [Documentation](#documentation)

---

## Features

### Infrastructure

- ✅ **Swappable Auth** - Production Supabase auth + mock for testing
- ✅ **Swappable Analytics** - Interface-based with PostHog adapter ready
- ✅ **Swappable Logger** - Console logger default, extensible
- ✅ **Feature Flags** - Runtime flags with remote config support
- ✅ **Error Boundary** - React error boundary with logger integration
- ✅ **Multi-app Config** - Single codebase, multiple apps via env vars

### UI Components

- ✅ **Dynamic Theme System** - Light/dark mode + brand hue customization
- ✅ **Glass Components** - Blur-backed surfaces with theme adaptation
- ✅ **Bottom Sheets** - Snap-to-position modals with glass backgrounds
- ✅ **Typography Primitives** - TText, TButton, TInput with zero hardcoded colors
- ✅ **Color Picker** - Native iOS color picker (@expo/ui integration)

### Real-time & Database

- ✅ **Supabase Client** - Singleton with config-driven credentials
- ✅ **Realtime Broadcast** - Channel-based subscriptions
- ✅ **Row Level Security** - User-scoped database policies

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- iOS: Xcode 15+ and CocoaPods
- Android: Android Studio with SDK 34+
- **Supabase account** (free tier works)

### Installation

```bash
# Clone and install
git clone https://github.com/Calton24/mobile-core.git
cd mobile-core
npm install

# iOS: Install CocoaPods dependencies
cd ios && pod install && cd ..
```

### Environment Configuration

1. Create `.env` in project root:

```dotenv
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...your-actual-key

# App Configuration (optional)
EXPO_PUBLIC_APP_PROFILE=default
EXPO_PUBLIC_APP_ENV=dev
```

2. Get Supabase credentials from https://supabase.com/dashboard → Project Settings → API

### Run

```bash
# Start development server
npm start

# Then press:
# i - iOS simulator
# a - Android emulator
```

**Development Client Required:**

For `@expo/ui` ColorPicker and other native modules:

```bash
# Build dev client once
npx expo run:ios     # or: npx expo run:android

# Subsequent runs use:
npm start
```

---

## Repository Structure

```
mobile-core/
├── app/                          # Expo Router entry points
│   ├── (tabs)/                   # Tab navigation
│   │   ├── index.tsx             # Home tab
│   │   ├── notes.tsx             # Notes tab (dev-only)
│   │   ├── auth.tsx              # Auth tab
│   │   ├── playground.tsx        # Component playground
│   │   └── mobile-core.tsx       # Mobile Core info (dev-only)
│   ├── _layout.tsx               # Root layout with providers
│   └── modal.tsx                 # Example modal
│
├── src/
│   ├── MobileCoreProviders.tsx   # Root provider composition
│   │
│   ├── analytics/                # Analytics abstraction (swappable)
│   │   ├── analytics.types.ts    # Interface + noop client
│   │   ├── analytics.ts          # Singleton pattern
│   │   └── posthog.client.ts     # PostHog adapter
│   │
│   ├── logging/                  # Logger abstraction (swappable)
│   │   ├── logger.types.ts       # Interface + console logger
│   │   ├── logger.ts             # Singleton pattern
│   │   └── ErrorBoundary.tsx     # React error boundary
│   │
│   ├── flags/                    # Feature flags (swappable)
│   │   ├── flags.types.ts        # Interface + noop client
│   │   └── flags.ts              # Singleton pattern
│   │
│   ├── theme/                    # Dynamic theming system
│   │   ├── ThemeProvider.tsx     # Context provider
│   │   ├── useTheme.ts           # Theme hook
│   │   ├── colors.ts             # Palette generator
│   │   ├── tokens.ts             # Design tokens
│   │   └── storage.ts            # Theme persistence
│   │
│   ├── features/                 # Feature modules
│   │   ├── auth/                 # Authentication
│   │   │   ├── authClient.ts     # Supabase + mock clients
│   │   │   ├── AuthProvider.tsx  # Context provider
│   │   │   └── useAuth.ts        # Auth hook
│   │   │
│   │   └── notes/                # Validation harness (dev-only)
│   │       ├── NotesScreen.tsx   # Main screen
│   │       ├── CreateNoteSheet.tsx  # Bottom sheet
│   │       ├── notes.service.ts  # Supabase service
│   │       └── notes.types.ts    # TypeScript types
│   │
│   ├── lib/                      # External service clients
│   │   ├── supabase/             # Supabase client factory
│   │   ├── firebase/             # Firebase (optional)
│   │   └── billing/              # Stripe integration
│   │
│   ├── ui/                       # UI component library
│   │   ├── glass/                # Glass components
│   │   │   ├── GlassSurface.tsx  # Base blur surface
│   │   │   ├── GlassCard.tsx     # Card component
│   │   │   └── glassStyles.ts    # Shared styles
│   │   │
│   │   ├── sheets/               # Bottom sheet system
│   │   │   ├── BottomSheetProvider.tsx  # Manager
│   │   │   └── useBottomSheet.ts        # Hook
│   │   │
│   │   └── primitives/           # Base components
│   │       ├── TText.tsx         # Themed text
│   │       ├── TButton.tsx       # Themed button
│   │       ├── TInput.tsx        # Themed input
│   │       └── ThemeColorPickerSheet.tsx  # Color picker
│   │
│   └── config/                   # Multi-app configuration
│       ├── loader.ts             # Config loader
│       ├── types.ts              # TypeScript interfaces
│       └── profiles/             # App profiles
│           ├── default.ts        # Default app config
│           ├── intake.ts         # Example: Intake app
│           └── proxi.ts          # Example: Proxi app
│
├── supabase/migrations/          # Database schema
│   └── 20260217000000_create_notes_table.sql
│
├── docs/                         # Documentation
│   ├── ARCHITECTURE.md           # Architecture deep dive
│   ├── VALIDATION.md             # Validation checklist
│   ├── CONFIGURATION.md          # Config system guide
│   └── SECURITY.md               # Security best practices
│
├── .env                          # Local env vars (gitignored)
├── .env.example                  # Template
└── babel.config.js               # Reanimated plugin
```

---

## Environment Setup

### Required Environment Variables

```dotenv
# Supabase (required)
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...

# App Profile (optional, defaults to "default")
EXPO_PUBLIC_APP_PROFILE=default

# Environment (optional, defaults to "dev")
EXPO_PUBLIC_APP_ENV=dev
```

### Where to Get Credentials

1. **Supabase:**
   - Go to https://supabase.com/dashboard
   - Select your project
   - Settings → API
   - Copy "Project URL" and "Anon/Public key"

2. **Never use Service Role key** - it bypasses RLS and should only be used server-side

---

## Supabase Setup

### 1. Create Project

1. Sign up at https://supabase.com
2. Create new project (wait ~2 minutes for provisioning)
3. Note your project URL and anon key

### 2. Configure Authentication

1. Go to Authentication → Providers
2. Enable "Email" provider
3. For testing: Disable email confirmation
4. For production: Configure SMTP settings

### 3. Run Notes Table Migration (For Validation)

If you want to test the Notes validation harness:

1. Open Supabase SQL Editor
2. Copy contents of `/supabase/migrations/202602170000000_create_notes_table.sql`
3. Execute the migration
4. Verify table exists in Table Editor

**Migration creates:**

- `notes` table with RLS enabled
- User-scoped policies (users can only see their own notes)
- Indexes for performance

### 4. Update .env

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://your-actual-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-key-here
```

### 5. Restart Dev Server

```bash
# Stop current server (Ctrl+C)
npm start -- --clear  # Clear Metro cache
```

---

## Configuration System

Mobile Core supports multiple apps from a single codebase.

### App Profiles

Each profile defines:

- Supabase project credentials
- Firebase config (optional)
- Feature flags
- App metadata (name, bundle ID)
- Environment overrides (dev/staging/prod)

**Available profiles:**

- `default` - Mobile Core base configuration
- `intake` - Example: Food tracking app
- `proxi` - Example: Social proximity app

### Switch Profiles

```dotenv
# .env
EXPO_PUBLIC_APP_PROFILE=intake     # Use intake profile
EXPO_PUBLIC_APP_ENV=dev            # Use dev environment
```

### Add New Profile

1. Create `src/config/profiles/myapp.ts`
2. Add to `src/config/profiles/index.ts`
3. Add to `src/config/app-profiles.js` (for build-time expo config)
4. Update `EXPO_PUBLIC_APP_PROFILE=myapp`

See `docs/CONFIGURATION.md` for details.

---

## Theme Provider Usage

### Provider Setup

Already configured in `app/_layout.tsx`:

```tsx
import { MobileCoreProviders } from "@/src/MobileCoreProviders";

export default function RootLayout() {
  return <MobileCoreProviders>{/* Your app */}</MobileCoreProviders>;
}
```

### In Components

```tsx
import { useTheme } from "@/src/theme/useTheme";

function MyComponent() {
  const { theme, setMode, setBrandHue, toggleMode } = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.textPrimary }}>Hello World</Text>

      <Button onPress={toggleMode}>
        Toggle {theme.mode === "light" ? "Dark" : "Light"} Mode
      </Button>

      <Slider
        value={theme.brandHue}
        onValueChange={setBrandHue}
        minimumValue={0}
        maximumValue={360}
      />
    </View>
  );
}
```

### Theme Tokens

```tsx
theme.colors.*      // Dynamic palette (updates with brandHue)
theme.spacing.*     // sm, md, lg, xl, xxl
theme.radius.*      // sm, md, lg, full
theme.typography.*  // Font families
theme.mode          // "light" | "dark"
theme.brandHue      // 0-360
```

**Zero hardcoded colors** - all components use `theme.colors.*`

---

## Bottom Sheets API

### Open a Bottom Sheet

```tsx
import { useBottomSheet } from "@/src/ui/sheets/useBottomSheet";
import { TText } from "@/src/ui/primitives/TText";

function MyComponent() {
  const { open, close } = useBottomSheet();

  const handleOpenSheet = () => {
    open(
      <View style={{ padding: 20 }}>
        <TText variant="heading">Hello from Bottom Sheet!</TText>
        <TButton onPress={close}>Close</TButton>
      </View>,
      {
        snapPoints: ["50%", "90%"], // Optional
        enablePanDownToClose: true, // Optional (default: true)
      }
    );
  };

  return <TButton onPress={handleOpenSheet}>Open Sheet</TButton>;
}
```

### Features

- **Glass background** - Auto-adapts to light/dark mode
- **Snap points** - Default 50%, customizable
- **Backdrop dismiss** - Tap outside to close
- **Pan down** - Swipe gesture to dismiss
- **Keyboard aware** - Respects keyboard height

---

## Notes Validation Harness

**Purpose:** Validates Mobile Core infrastructure under real pressure.

**What it validates:**

- ✅ Auth: Requires authenticated user
- ✅ Database: Supabase INSERT/SELECT with RLS
- ✅ Realtime: Broadcast channel subscriptions
- ✅ Analytics: Event tracking (`notes_screen_viewed`, `note_created`)
- ✅ Logger: Error handling
- ✅ Flags: Feature flag integration
- ✅ Bottom Sheets: Create note modal
- ✅ Theme: Dynamic styling
- ✅ ErrorBoundary: Crash protection

**Dev-Only:** Notes tab is gated by `__DEV__` and never appears in production builds.

```tsx
// app/(tabs)/_layout.tsx
{
  __DEV__ && ( // ✅ Gated
    <NativeTabs.Trigger name="notes">
      <Label>Notes</Label>
    </NativeTabs.Trigger>
  );
}
```

**How to Test:**

1. Complete Supabase setup (run notes migration)
2. Sign in via Auth tab
3. Navigate to Notes tab
4. Tap "Create Note"
5. Enter text in bottom sheet
6. Submit → Note appears immediately
7. Open app on another device → Realtime update

**Files:**

- `src/features/notes/` - Complete feature module
- `supabase/migrations/20260217000000_create_notes_table.sql` - DB schema
- `app/(tabs)/notes.tsx` - Tab wrapper

---

## Common Issues

### 1. "Network request failed" on auth/notes

**Cause:** Supabase credentials not configured or incorrect.

**Fix:**

1. Check `.env` has correct `EXPO_PUBLIC_SUPABASE_URL` and `_ANON_KEY`
2. Restart dev server with `npm start -- --clear`
3. Verify credentials in Supabase dashboard → Settings → API

### 2. ColorPicker crashes on Android

**Cause:** `@expo/ui` ColorPicker is iOS-only (uses SwiftUI).

**Fix:** Feature is iOS-only by design. Android will need a custom picker implementation or third-party library.

### 3. Bottom sheet doesn't open

**Cause:** GestureHandlerRootView not at root or Reanimated plugin missing.

**Fix:**

1. Verify `MobileCoreProviders` is used in `app/_layout.tsx`
2. Check `babel.config.js` has `"react-native-reanimated/plugin"` as **last plugin**
3. Clear cache: `npm start -- --clear`

### 4. Theme doesn't update

**Cause:** Components using hardcoded colors instead of `theme.colors.*`.

**Fix:** Always use:

```tsx
const { theme } = useTheme();
<Text style={{ color: theme.colors.textPrimary }}>  // ✅
<Text style={{ color: "#000" }}>  // ❌ Never!
```

### 5. "Unknown app profile: default"

**Cause:** App profile not registered in build-time config.

**Fix:**

1. Check `src/config/app-profiles.js` includes your profile
2. Verify `EXPO_PUBLIC_APP_PROFILE` matches a registered profile
3. Restart dev server

### 6. Dev client required error

**Cause:** `@expo/ui` and other native modules need development build.

**Fix:**

```bash
# Build dev client once
npx expo run:ios  # or: npx expo run:android

# Then use npm start for all subsequent launches
```

---

## Documentation

- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Provider tree, data flow, patterns
- **[VALIDATION.md](./docs/VALIDATION.md)** - Step-by-step validation checklist
- **[CONFIGURATION.md](./docs/CONFIGURATION.md)** - Multi-app config system guide
- **[SECURITY.md](./docs/SECURITY.md)** - RLS policies, env var best practices

---

## Scripts

```bash
npm start              # Start Expo dev server
npm run ios            # Build and run iOS
npm run android        # Build and run Android
npm run lint           # Run ESLint
npm run format         # Format with Prettier
npm test               # Run Jest tests
npm run test:watch     # Jest watch mode
npm run test:coverage  # Coverage report
npm run typecheck      # TypeScript check
npm run validate       # Full validation (lint + test + typecheck)
```

---

## Technology Stack

- **Framework:** Expo SDK 54, React Native 0.81, React 19
- **Router:** Expo Router v6 (file-based)
- **Database:** Supabase (Postgres + Realtime)
- **Auth:** Supabase Auth (email/password, social, magic links)
- **UI:** Custom glass components, @gorhom/bottom-sheet, expo-blur
- **Theming:** Dynamic color generation, AsyncStorage persistence
- **Testing:** Jest, React Native Testing Library
- **TypeScript:** Strict mode, Zod validation
- **Build:** EAS Build (cloud builds)

---

## License

MIT

---

## Contributing

This is a reusable foundation for multiple apps. When adding features:

1. **Keep it generic** - Don't add app-specific logic to `src/`
2. **Use abstractions** - Follow swappable pattern (analytics/logger/flags)
3. **Zero hardcoding** - Use `theme.colors.*` everywhere
4. **Test coverage** - Add tests for new infrastructure
5. **Document** - Update README and docs/ as needed

For app-specific features, create a new profile in `src/config/profiles/`.

---

## Support

- **Issues:** https://github.com/Calton24/mobile-core/issues
- **Discussions:** https://github.com/Calton24/mobile-core/discussions

---

Built with ❤️ using Expo and Supabase
