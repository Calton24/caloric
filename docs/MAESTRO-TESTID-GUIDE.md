# Maestro TestID Implementation Guide

## Required TestIDs for Smoke Test

The smoke test now uses **deterministic assertions** with accessibility IDs. You must add these `testID` props to your React Native components.

### 1. App-Ready Sentinel: `app-ready`

**Purpose:** Proves React Native bridge is up and app is fully mounted

**Where to add:** Root-level View that renders only after app initialization completes

**Example locations:**

- In your root `_layout.tsx` (Expo Router)
- In your main App component wrapper
- After Supabase client initializes, fonts load, etc.

```tsx
// app/_layout.tsx (or similar root file)
export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    // Wait for critical initialization
    Promise.all([
      loadFonts(),
      initSupabase(),
      // ... other async setup
    ]).then(() => setAppReady(true));
  }, []);

  if (!appReady) {
    return <SplashScreen />;
  }

  return (
    <View testID="app-ready" style={{ flex: 1 }}>
      <Stack>{/* Your navigation */}</Stack>
    </View>
  );
}
```

**Alternative (simpler):**
If you don't have async initialization, add to your outermost View:

```tsx
<SafeAreaView testID="app-ready" style={{ flex: 1 }}>
  {/* Your app content */}
</SafeAreaView>
```

### 2. Tab Navigation: `tab-explore`

**Purpose:** Verify tab bar rendered and is tappable

**Where to add:** Expo Router Tabs configuration or custom tab button

**Example with Expo Router Tabs:**

```tsx
// app/(tabs)/_layout.tsx
<Tabs.Screen
  name="explore"
  options={{
    title: "Explore",
    tabBarButtonTestID: "tab-explore", // ← ADD THIS
    tabBarIcon: ({ color }) => <TabBarIcon name="code" color={color} />,
  }}
/>
```

**Example with custom tab bar button:**

```tsx
<Pressable testID="tab-explore" onPress={() => navigation.navigate("Explore")}>
  <Text>Explore</Text>
</Pressable>
```

### 3. Explore Screen Sentinel: `screen-explore`

**Purpose:** Verify Explore screen loaded after navigation

**Where to add:** Top-level container of Explore screen

```tsx
// app/(tabs)/explore.tsx
export default function ExploreScreen() {
  return (
    <View testID="screen-explore" style={{ flex: 1 }}>
      <ParallaxScrollView
        headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
        headerImage={
          <IconSymbol
            size={310}
            color="#808080"
            name="chevron.left.forwardslash.chevron.right"
          />
        }
      >
        {/* Your Explore screen content */}
      </ParallaxScrollView>
    </View>
  );
}
```

---

## Testing Your Implementation

### 1. Install Maestro (if not installed)

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
export PATH="$PATH:$HOME/.maestro/bin"
maestro --version
```

### 2. Run Full CI Flow (Local)

```bash
cd /Users/calton/Coding/Mobile/mobile-core

UDID=$(xcrun simctl list devices available | grep -m 1 -E "iPhone 15 Pro" | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/')

SIMULATOR_UDID=$UDID npm run maestro:ci:ios
```

**Expected output:**

```
📱 Booting simulator C85325D5-B46C-47FC-96EE-F9A05A78BD26
🧠 Starting Metro (dev-client)...
⏳ Waiting for Metro to be ready...
✅ Metro is ready
🏗️ Building iOS...
** BUILD SUCCEEDED **
📲 Installing iOS app...
✅ Installed: MobileCoreDev.app
🧪 Running Maestro...
✅ Maestro passed.
```

### 3. Run Twice to Verify State Isolation

```bash
# First run
SIMULATOR_UDID=$UDID npm run maestro:ci:ios

# Second run (should pass identically)
SIMULATOR_UDID=$UDID npm run maestro:ci:ios
```

**If second run fails:** You have state leakage or race conditions.

---

## Smoke Test Flow (What It Does)

```yaml
# 1. Stop app + clear all state (no contamination from previous runs)
- stopApp: com.calton24.mobilecore.dev
- clearState: com.calton24.mobilecore.dev

# 2. Launch app fresh
- launchApp:
    appId: com.calton24.mobilecore.dev

# 3. Assert: App initialized and React Native bridge is up
- assertVisible:
    id: "app-ready"
    timeout: 30000

# 4. Assert: Tab bar rendered
- assertVisible:
    id: "tab-explore"

# 5. Action: Tap Explore tab
- tapOn:
    id: "tab-explore"

# 6. Assert: Explore screen loaded
- assertVisible:
    id: "screen-explore"
    timeout: 10000
```

---

## Why This Approach

### ❌ **Old (Bad) Smoke Test:**

```yaml
- assertVisible: ".*" # Matches ANY text (even error messages)
- tapOn:
    id: "explore-tab"
    optional: true # Doesn't fail if missing - useless
```

**Problems:**

- `".*"` regex matches error screens, loading spinners, empty states
- `optional: true` means test passes even if navigation is broken
- No state clearing - previous runs contaminate results
- No real verification of app functionality

### ✅ **New (Good) Smoke Test:**

```yaml
- clearState: com.calton24.mobilecore
- assertVisible:
    id: "app-ready" # Controlled sentinel, only true when app is ready
    timeout: 30000
- tapOn:
    id: "tab-explore" # REQUIRED tap, fails if missing
```

**Benefits:**

- Clean state every run (deterministic)
- Specific assertions on controlled sentinels
- Fails loudly when something is wrong
- Tests actual navigation flow

---

## Troubleshooting

### Maestro can't find testID

**Check in debug mode:**

```bash
maestro test --debug maestro/flows/smoke-test.yaml
```

Maestro will show you the view hierarchy and what IDs it can see.

### App doesn't have dev client

If you see errors about dev client not running:

```bash
npx expo run:ios  # Builds dev client
npm run start:dev-client  # Starts Metro
```

### Simulator state is dirty

Manually reset:

```bash
xcrun simctl erase all
```

Or in smoke test (already included):

```yaml
- clearState: com.calton24.mobilecore
```

---

## Next Steps

1. ✅ Add three testIDs to your app code
2. ✅ Install Maestro CLI locally
3. ✅ Run `maestro:ci:ios` twice successfully
4. ✅ Set up self-hosted GitHub Actions runner (see main docs)
5. ✅ Add E2E job to `.github/workflows/ci.yml`

Once local flow passes twice in a row, you have a **deterministic, repeatable** smoke test ready for CI.
