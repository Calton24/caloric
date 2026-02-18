# Mobile Core Validation Checklist

Complete step-by-step guide to validate all Mobile Core infrastructure is working correctly.

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Phase 1: Installation & Boot](#phase-1-installation--boot)
- [Phase 2: Supabase Configuration](#phase-2-supabase-configuration)
- [Phase 3: Theme System Validation](#phase-3-theme-system-validation)
- [Phase 4: Glass Components Validation](#phase-4-glass-components-validation)
- [Phase 5: Bottom Sheets Validation](#phase-5-bottom-sheets-validation)
- [Phase 6: Authentication Validation](#phase-6-authentication-validation)
- [Phase 7: Notes Feature Validation](#phase-7-notes-feature-validation)
- [Phase 8: Infrastructure Abstraction Validation](#phase-8-infrastructure-abstraction-validation)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm installed (`npm --version`)
- [ ] iOS: Xcode 15+ with Command Line Tools
- [ ] iOS: CocoaPods installed (`pod --version`)
- [ ] Android: Android Studio with SDK 34+
- [ ] Git installed
- [ ] Supabase account (free tier works)
- [ ] Code editor (VS Code recommended)

---

## Environment Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/Calton24/mobile-core.git
cd mobile-core
```

**Expected Output:**

```
Cloning into 'mobile-core'...
remote: Enumerating objects: ...
```

- [ ] Repository cloned successfully

### Step 2: Install Dependencies

```bash
npm install
```

**Expected Output:**

```
added 1234 packages in 45s
```

- [ ] Dependencies installed without errors

### Step 3: iOS Native Dependencies (iOS Only)

```bash
cd ios
pod install
cd ..
```

**Expected Output:**

```
Pod installation complete! There are 42 dependencies from the Podfile...
```

- [ ] CocoaPods installed successfully
- [ ] No conflicting pod versions

> **⚠️ Important:** Do not routinely run `npx expo prebuild --clean`. It regenerates the ios directory and can wipe Podfile third-party podspec overrides. If you run it, reapply the overrides before running `pod install`.

---

## Phase 1: Installation & Boot

### Step 1: Start Development Server

```bash
npm start
```

**Expected Output:**

```
Starting project at /path/to/mobile-core
Metro waiting on ...
› Press i │ open iOS simulator
› Press a │ open Android emulator
```

- [ ] Metro bundler starts without errors
- [ ] No red errors in terminal

### Step 2: Build Development Client (First Time Only)

**iOS:**

```bash
npx expo run:ios
```

**Android:**

```bash
npx expo run:android
```

**Expected Outcome:**

- [ ] App builds successfully
- [ ] App opens on simulator/emulator
- [ ] No fatal crashes on launch

**Expected Screens:**

- [ ] Home tab visible
- [ ] Auth tab visible
- [ ] Playground tab visible (if `SHOW_PLAYGROUND` enabled)
- [ ] Mobile Core tab visible (dev mode only)

---

## Phase 2: Supabase Configuration

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Enter project details:
   - Name: `mobile-core-dev` (or your choice)
   - Database Password: (save securely)
   - Region: Choose closest
4. Click "Create new project"
5. Wait ~2 minutes for provisioning

- [ ] Project created successfully
- [ ] Project dashboard accessible

### Step 2: Get API Credentials

1. Navigate to: Settings → API
2. Locate "Project URL" section
3. Copy **Project URL** (e.g., `https://abcxyz.supabase.co`)
4. Locate "Project API keys" section
5. Copy **anon public** key (long JWT token)

**⚠️ CRITICAL:** Use "anon public" NOT "service_role" (service role bypasses RLS)

- [ ] Project URL copied
- [ ] Anon key copied

### Step 3: Configure Environment Variables

Create `.env` in project root:

```dotenv
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-actual-key-here

# App Configuration
EXPO_PUBLIC_APP_PROFILE=default
EXPO_PUBLIC_APP_ENV=dev
```

- [ ] `.env` file created
- [ ] Supabase URL matches your project
- [ ] Anon key pasted correctly (no extra spaces)

### Step 4: Enable Email Authentication

1. Go to: Authentication → Providers
2. Find "Email" provider
3. Toggle to **Enabled**
4. **For Testing:** Disable "Confirm email"
5. **For Production:** Configure SMTP settings
6. Click "Save"

- [ ] Email provider enabled
- [ ] Email confirmation settings configured

### Step 5: Run Notes Table Migration

1. Navigate to: SQL Editor
2. Click "New query"
3. Copy entire contents of `supabase/migrations/20260217000000_create_notes_table.sql`
4. Paste into SQL Editor
5. Click "Run"

**Expected Output:**

```
Success. No rows returned
```

6. Navigate to: Table Editor
7. Verify `notes` table exists

- [ ] Migration executed successfully
- [ ] `notes` table visible in editor
- [ ] Table has columns: `id`, `content`, `created_at`, `user_id`

### Step 6: Restart Development Server

```bash
# Stop current server (Ctrl+C)
npm start -- --clear
```

**Expected Log Output:**

```
📱 Loading config for profile: default, environment: dev
✅ Config loaded successfully:
    App: Mobile Core Dev
    Supabase: https://your-project-id.supabase.co
🔌 Initializing Supabase client for: Mobile Core Dev
    Project: https://your-project-id.supabase.co
```

- [ ] Config loads without errors
- [ ] Supabase URL matches your project
- [ ] No "Network request failed" errors

---

## Phase 3: Theme System Validation

### Step 1: Verify Light Mode Default

1. Launch app
2. Observe default theme

**Expected:**

- [ ] Light mode active by default
- [ ] White/light gray backgrounds
- [ ] Black/dark gray text

### Step 2: Toggle Dark Mode

1. Navigate to: Playground tab
2. Find "Theme Settings" section
3. Tap dark mode toggle

**Expected:**

- [ ] App transitions to dark mode immediately
- [ ] Black/dark backgrounds
- [ ] White/light text
- [ ] Glass components adapt (darker blur)
- [ ] No UI elements stay in light colors

### Step 3: Change Brand Hue

1. In Playground, find color picker
2. Tap "Primary Color" button
3. Bottom sheet opens with color picker
4. Select different color (e.g., red, green, blue)

**Expected:**

- [ ] Color picker opens
- [ ] Selected color preview updates
- [ ] Hue value displays (0-360°)
- [ ] Primary color throughout app updates
- [ ] Buttons, links use new color

### Step 4: Verify Theme Persistence

1. Change mode to dark
2. Change brand hue to 180° (cyan)
3. Close app completely
4. Reopen app

**Expected:**

- [ ] Dark mode persists
- [ ] Brand hue (cyan) persists
- [ ] No flash of default theme

---

## Phase 4: Glass Components Validation

### Step 1: Verify Glass Cards

1. Navigate to: Playground tab
2. Scroll to find glass card examples

**Expected:**

- [ ] Cards have semi-transparent background
- [ ] Blur effect visible (content behind card blurs)
- [ ] Border visible (subtle, matches theme)
- [ ] Cards adapt to light/dark mode

### Step 2: Verify Glass in Light Mode

1. Switch to light mode
2. Observe glass components

**Expected:**

- [ ] Semi-transparent white background
- [ ] "extraLight" blur tint
- [ ] Subtle shadow/border

### Step 3: Verify Glass in Dark Mode

1. Switch to dark mode
2. Observe glass components

**Expected:**

- [ ] Semi-transparent black background
- [ ] "dark" blur tint
- [ ] Visible against dark backgrounds

---

## Phase 5: Bottom Sheets Validation

### Step 1: Open Bottom Sheet

1. Navigate to: Playground tab
2. Find bottom sheet examples
3. Tap "Open Bottom Sheet" button

**Expected:**

- [ ] Bottom sheet animates up from bottom
- [ ] Glass background (blurred, semi-transparent)
- [ ] Backdrop dims the background
- [ ] Single handle indicator at top
- [ ] No duplicate handles

### Step 2: Test Snap Points

1. With sheet open, drag handle upward
2. Drag handle downward

**Expected:**

- [ ] Sheet snaps to defined positions (e.g., 50%, 90%)
- [ ] Smooth animation between snap points
- [ ] No getting stuck between positions

### Step 3: Test Backdrop Dismiss

1. Open bottom sheet
2. Tap dark area outside sheet

**Expected:**

- [ ] Sheet closes
- [ ] Smooth animation down
- [ ] Backdrop fades out

### Step 4: Test Pan Down Gesture

1. Open bottom sheet
2. Swipe down on handle or content

**Expected:**

- [ ] Sheet follows finger
- [ ] Releases and closes when swiped far enough
- [ ] Snaps back if not swiped far enough

### Step 5: Verify Glass Background Rendering

1. Open bottom sheet
2. Observe background at different snap points

**Expected:**

- [ ] Glass background consistent at all snap points
- [ ] No flashing or flickering
- [ ] Blur intensity remains constant
- [ ] Rounded top corners visible

---

## Phase 6: Authentication Validation

### Step 1: Navigate to Auth Tab

1. Tap "Auth" tab at bottom
2. Observe initial state

**Expected:**

- [ ] Sign up / Sign in toggle visible
- [ ] Email and password input fields
- [ ] Submit button

### Step 2: Sign Up New User

1. Toggle to "Sign Up"
2. Enter email: `test@example.com`
3. Enter password: `TestPassword123!`
4. Enter confirm password: `TestPassword123!`
5. Tap "Create Account"

**Expected:**

- [ ] Loading indicator appears
- [ ] Alert: "Success - Check your email to verify" (if confirmation enabled)
- [ ] OR: User immediately signed in (if confirmation disabled)
- [ ] No "Network request failed" error

### Step 3: Verify User in Supabase

1. Go to Supabase Dashboard
2. Navigate to: Authentication → Users
3. Find your test user

**Expected:**

- [ ] User exists in table
- [ ] Email matches
- [ ] Created timestamp recent

### Step 4: Sign Out

1. In Auth tab, tap "Sign Out" button

**Expected:**

- [ ] Returns to sign in form
- [ ] User email no longer displayed
- [ ] Session cleared

### Step 5: Sign In

1. Enter same email/password
2. Tap "Sign In"

**Expected:**

- [ ] Loading indicator appears
- [ ] User email displayed
- [ ] "Sign Out" buttonvisible
- [ ] No errors

### Step 6: Verify Session Persistence

1. While signed in, close app completely
2. Reopen app
3. Navigate to Auth tab

**Expected:**

- [ ] User still signed in
- [ ] Email displayed
- [ ] No need to re-enter credentials

---

## Phase 7: Notes Feature Validation

**⚠️ Prerequisites:**

- Supabase configured
- Notes table migration run
- User signed in

### Step 1: Navigate to Notes Tab (Dev Only)

1. Tap "Notes" tab at bottom

**Expected:**

- [ ] Notes tab visible in dev mode
- [ ] Screen loads (may show "No notes" initially)

**If Notes tab not visible:**

- Check you're in dev mode (`__DEV__` = true)
- Production builds exclude this tab

### Step 2: Verify Authentication Gate

1. If not signed in, navigate to Notes tab

**Expected:**

- [ ] Prompted to sign in OR empty state shown
- [ ] Cannot create notes without auth

2. Sign in via Auth tab
3. Return to Notes tab

**Expected:**

- [ ] "Create Note" button visible
- [ ] Feed area visible

### Step 3: Create First Note

1. Tap "Create Note" button
2. Bottom sheet opens

**Expected:**

- [ ] Bottom sheet with glass background
- [ ] Text input field
- [ ] "Save" button

3. Enter text: "My first note"
4. Tap "Save"

**Expected:**

- [ ] Loading indicator on button
- [ ] Sheet closes
- [ ] Note appears in feed immediately
- [ ] Note displays: content + "Just now" timestamp

### Step 4: Create Multiple Notes

1. Create 2-3 more notes with different content

**Expected:**

- [ ] Each note appears immediately after creation
- [ ] Notes ordered newest first
- [ ] Glass card styling for each note

### Step 5: Verify Database Persistence

1. Close app completely
2. Reopen app
3. Navigate to Notes tab

**Expected:**

- [ ] All created notes still visible
- [ ] Correct order (newest first)
- [ ] Timestamps updated (e.g., "2 minutes ago")

### Step 6: Pull to Refresh

1. Scroll to top of notes list
2. Pull down to trigger refresh

**Expected:**

- [ ] Loading spinner appears
- [ ] Notes reload
- [ ] No duplicates

### Step 7: Verify Supabase Data

1. Go to Supabase Dashboard
2. Navigate to: Table Editor → notes

**Expected:**

- [ ] All notes visible in table
- [ ] `user_id` matches your user ID
- [ ] `created_at` timestamps accurate

### Step 8: Test Realtime (Optional - Multi-Device)

1. Open app on second device/simulator
2. Sign in as same user
3. Navigate to Notes tab on both devices
4. Create note on Device 1

**Expected:**

- [ ] Note appears on Device 1 immediately
- [ ] Note appears on Device 2 within 1-2 seconds
- [ ] Realtime broadcast working

**If realtime doesn't work:**

- Check both devices are signed in as same user
- Verify internet connection
- Check Supabase Dashboard → Realtime → Inspector for channel activity

---

## Phase 8: Infrastructure Abstraction Validation

### Step 1: Verify Analytics Integration

1. Navigate to Notes tab
2. Check terminal output for logs

**Expected Log:**

```
Analytics tracked: notes_screen_viewed { user_id: "..." }
```

3. Create a note
4. Check terminal output

**Expected Log:**

```
Analytics tracked: note_created { content_length: 13 }
```

- [ ] Analytics events fire
- [ ] No crashes when calling `analytics.track()`

### Step 2: Verify Logger Integration

1. Force an error (e.g., airplane mode + create note)
2. Check terminal output

**Expected Log:**

```
[NotesScreen] Failed to create note: Network request failed
```

- [ ] Errors logged to console
- [ ] Context included in logs

### Step 3: Verify Feature Flags

1. Open `src/features/notes/NotesScreen.tsx`
2. Find line: `flags.isEnabled("notes.create", true)`
3. Change to: `flags.isEnabled("notes.create", false)`
4. Save and reload app

**Expected:**

- [ ] "Create Note" button disappears
- [ ] Feature flag system working

4. Revert change (set back to `true`)

### Step 4: Verify ErrorBoundary

1. Open `src/features/notes/NotesScreen.tsx`
2. Inside component, add: `throw new Error("Test error");`
3. Navigate to Notes tab

**Expected:**

- [ ] Error boundary catches error
- [ ] Fallback UI shown
- [ ] Error logged
- [ ] App doesn't crash completely

4. Remove test error

---

## Troubleshooting

### "Network request failed"

**Symptoms:**

- Auth sign up fails
- Notes don't load
- Realtime doesn't work

**Diagnosis:**

1. Check `.env` has correct Supabase URL and anon key
2. Verify credentials in Supabase Dashboard → Settings → API
3. Ensure no extra spaces in `.env`
4. Check internet connection

**Fix:**

```bash
# Update .env with correct credentials
# Then restart server
npm start -- --clear
```

### "Unknown app profile: default"

**Symptoms:**

- App won't start
- Error in terminal about unknown profile

**Diagnosis:**

1. Check `src/config/app-profiles.js` includes "default"
2. Verify `EXPO_PUBLIC_APP_PROFILE` matches a registered profile

**Fix:**

```bash
# Ensure .env has:
EXPO_PUBLIC_APP_PROFILE=default

# Restart server
npm start -- --clear
```

### Bottom Sheet Won't Open

**Symptoms:**

- Tap button, nothing happens
- Sheet flickers/crashes

**Diagnosis:**

1. Check `babel.config.js` has Reanimated plugin as **last plugin**
2. Verify `GestureHandlerRootView` at app root

**Fix:**

```bash
# Clear cache
npm start -- --clear

# If still broken, rebuild dev client
npx expo run:ios  # or: npx expo run:android
```

### Theme Doesn't Update

**Symptoms:**

- Change brand hue, some components don't update
- Hardcoded colors visible

**Diagnosis:**

1. Check component uses `theme.colors.*` not hardcoded strings
2. Verify `useTheme()` hook is called

**Fix:**

```tsx
// ❌ BAD
<Text style={{ color: "#000" }}>

// ✅ GOOD
const { theme } = useTheme();
<Text style={{ color: theme.colors.textPrimary }}>
```

### ColorPicker Crashes (Android)

**Symptoms:**

- App crashes when opening color picker
- "Module not found" error

**Diagnosis:**

- `@expo/ui` ColorPicker is iOS-only (uses SwiftUI)

**Fix:**

- Use on iOS only
- Or implement custom color picker for Android

### Notes Tab Not Visible

**Symptoms:**

- Can't find Notes tab

**Diagnosis:**1. Notes tab is dev-only (gated by `__DEV__`) 2. Check you're running in development mode

**Fix:**

- Notes tab intentionally hidden in production builds
- Run `npm start` (not production build)

---

## Validation Complete

If all checkboxes are marked, your Mobile Core installation is fully validated! 🎉

**Next Steps:**

- Read [ARCHITECTURE.md](./ARCHITECTURE.md) for deep dive
- Build your own features using Mobile Core infrastructure
- Create additional app profiles in `src/config/profiles/`

---

## Quick Reference

**Start Dev Server:**

```bash
npm start
```

**Clear Cache:**

```bash
npm start -- --clear
```

**Rebuild Dev Client:**

```bash
npx expo run:ios
# or
npx expo run:android
```

**Run Tests:**

```bash
npm test
```

**Type Check:**

```bash
npm run typecheck
```

**Full Validation:**

```bash
npm run validate  # lint + test + typecheck
```
