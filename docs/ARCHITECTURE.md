# Mobile Core Architecture

Comprehensive architecture documentation for Mobile Core's infrastructure patterns, data flow, and component organization.

---

## Table of Contents

- [Provider Tree](#provider-tree)
- [Infrastructure Abstractions](#infrastructure-abstractions)
- [Data Flow Patterns](#data-flow-patterns)
- [Realtime Architecture](#realtime-architecture)
- [Authentication Flow](#authentication-flow)
- [Theme System](#theme-system)
- [Bottom Sheet System](#bottom-sheet-system)
- [Configuration System](#configuration-system)
- [File Organization](#file-organization)

---

## Provider Tree

### Complete Nesting Order

```
GestureHandlerRootView (react-native-gesture-handler)
└── SafeAreaProvider (@react-navigation/native)
    └── ThemeProvider (Mobile Core custom)
        └── AuthProvider (Mobile Core custom)
            └── BottomSheetModalProvider (@gorhom/bottom-sheet)
                └── BottomSheetProvider (Mobile Core custom)
                    └── {children} (Expo Router)
```

**Location:** `src/MobileCoreProviders.tsx`

**Why This Order:**

1. **GestureHandlerRootView** - Must be at root for gesture-based interactions (bottom sheets, swipes)
2. **SafeAreaProvider** - Detects safe areas (notch, home indicator) before layout
3. **ThemeProvider** - Provides theme context to all components below
4. **AuthProvider** - Auth state available to authenticated features
5. **BottomSheetModalProvider** - Required by @gorhom/bottom-sheet library
6. **BottomSheetProvider** - Custom wrapper for simplified bottom sheet management

**Usage:**

```tsx
// app/_layout.tsx
import { MobileCoreProviders } from "@/src/MobileCoreProviders";

export default function RootLayout() {
  return (
    <MobileCoreProviders>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </MobileCoreProviders>
  );
}
```

---

## Infrastructure Abstractions

Mobile Core uses **swappable abstractions** for cross-cutting concerns. All follow the same pattern:

### Pattern: Interface + Default + Swapper

```typescript
// 1. Define interface
export interface XClient {
  someMethod(): Promise<void>;
}

// 2. Provide default implementation
class DefaultXClient implements XClient {
  async someMethod() {
    /* ... */
  }
}

// 3. Create swappable singleton
let client: XClient = new DefaultXClient();

export function setXClient(newClient: XClient): void {
  client = newClient;
}

// 4. Export proxy
export const xClient: XClient = {
  someMethod: (...args) => client.someMethod(...args),
};
```

### Analytics

**Location:** `src/analytics/`

**Interface:** `AnalyticsClient`

- `track(event, properties)`
- `identify(userId, traits)`
- `screen(name, properties)`

**Implementations:**

- `NoopAnalyticsClient` - Default (does nothing)
- `PostHogClient` - PostHog adapter (ready to use)

**Usage:**

```typescript
import { analytics } from "@/src/analytics/analytics";

analytics.track("button_clicked", { button_id: "submit" });
```

**Swap Implementation:**

```typescript
import { setAnalyticsClient, PostHogClient } from "@/src/analytics";

setAnalyticsClient(new PostHogClient("your-api-key"));
```

### Logger

**Location:** `src/logging/`

**Interface:** `Logger`

- `log(message, context)`
- `error(message, context)`
- `warn(message, context)`
- `info(message, context)`

**Implementations:**

- `ConsoleLogger` - Default (console.log/error/warn)
- Custom loggers (Sentry, LogRocket, etc.) - bring your own

**Usage:**

```typescript
import { logger } from "@/src/logging/logger";

logger.error("[MyComponent] Failed to load data", {
  error: error.message,
  userId: user.id,
});
```

**ErrorBoundary:**

```tsx
import { ErrorBoundary } from "@/src/logging/ErrorBoundary";

export function MyScreen() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### Feature Flags

**Location:** `src/flags/`

**Interface:** `FeatureFlagClient`

- `isEnabled(flag, defaultValue)`
- `getFlags()`
- `refresh()`

**Implementations:**

- `NoopFlagClient` - Default (uses defaults)
- `RemoteConfigClient` - Fetches from Supabase (optional)

**Usage:**

```typescript
import { flags } from "@/src/flags/flags";

const canCreateNotes = flags.isEnabled("notes.create", true);

if (canCreateNotes) {
  // Show create button
}
```

### Authentication

**Location:** `src/features/auth/`

**Interface:** `AuthClient`

- `signIn(email, password)`
- `signUp(email, password)`
- `signOut()`
- `getSession()`
- `onAuthStateChange(callback)`

**Implementations:**

- **`SupabaseAuthClient`** - Production (uses real Supabase)
- `MockAuthClient` - Testing (in-memory fake auth)

**Usage:**

```tsx
import { useAuth } from "@/src/features/auth/useAuth";

function MyComponent() {
  const { user, signIn, signOut } = useAuth();

  if (!user) {
    return <LoginForm onSubmit={signIn} />;
  }

  return (
    <View>
      <Text>Welcome {user.email}</Text>
      <Button onPress={signOut}>Sign Out</Button>
    </View>
  );
}
```

**Swap to Mock (for testing):**

```typescript
import { setAuthClient, MockAuthClient } from "@/src/features/auth/authClient";

setAuthClient(new MockAuthClient());
```

---

## Data Flow Patterns

### Rule: UI → Service → Supabase

**Never call Supabase directly from UI components.** Always use a service layer.

#### ❌ BAD (Direct Supabase in UI)

```tsx
function MyComponent() {
  const supabase = getSupabaseClient();

  const handleCreate = async () => {
    const { data } = await supabase.from("notes").insert({ content });
    // ...
  };
}
```

#### ✅ GOOD (Service Layer)

```typescript
// notes.service.ts
export async function createNote(content: string, userId: string) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("notes")
    .insert({ content, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}
```

```tsx
// NotesScreen.tsx
import { createNote } from "./notes.service";

function NotesScreen() {
  const handleCreate = async () => {
    try {
      await createNote(content, userId);
      analytics.track("note_created");
    } catch (error) {
      logger.error("[NotesScreen] Create failed", { error });
    }
  };
}
```

**Benefits:**

- Centralized error handling
- Easier testing (mock service, not Supabase)
- Analytics/logging at service boundary
- Type transformations in one place
- Reusable across components

---

## Realtime Architecture

Mobile Core uses **Supabase Broadcast Channels** for realtime updates.

### Pattern: Broadcast (NOT Postgres Changes)

**Why Broadcast > Postgres Changes:**

- Faster (no DB roundtrip)
- More control over what's sent
- Works for non-DB updates (e.g., typing indicators)
- Can batch multiple events

### Implementation

```typescript
// Subscribe to channel
let channel: RealtimeChannel | null = null;

export function subscribeToNotes(onInsert: (note: Note) => void): void {
  const supabase = getSupabaseClient();

  channel = supabase.channel("notes"); // Create channel

  channel
    .on("broadcast", { event: "note_inserted" }, ({ payload }) => {
      onInsert(payload as Note);
    })
    .subscribe();
}

// Cleanup
export async function unsubscribeFromNotes(): Promise<void> {
  if (channel) {
    await channel.unsubscribe();
    channel = null;
  }
}
```

### Component Usage

```tsx
function NotesScreen() {
  useEffect(() => {
    if (!userId) return;

    // Subscribe
    subscribeToNotes((newNote) => {
      setNotes((prev) => [newNote, ...prev]);
    });

    // Cleanup on unmount
    return () => {
      unsubscribeFromNotes();
    };
  }, [userId]);
}
```

### Broadcast on Insert

```typescript
export async function createNote(content: string, userId: string) {
  const supabase = getSupabaseClient();

  // Insert into DB
  const { data, error } = await supabase
    .from("notes")
    .insert({ content, user_id: userId })
    .select()
    .single();

  if (error) throw new Error(error.message);

  // Broadcast to all subscribers
  const channel = supabase.channel("notes");
  await channel.send({
    type: "broadcast",
    event: "note_inserted",
    payload: data,
  });

  return data;
}
```

**Flow:**

1. User creates note
2. Service inserts to DB (with RLS)
3. Service broadcasts to channel
4. All subscribed clients receive update
5. UI updates immediately

---

## Authentication Flow

### Complete Flow Diagram

```
User enters email/password
    ↓
UI calls signUp(email, password)
    ↓
authClient.signUp() (SupabaseAuthClient)
    ↓
getSupabaseClient() returns singleton
    ↓
supabase.auth.signUp({ email, password })
    ↓
Supabase creates user in auth.users
    ↓
(Optional) Email confirmation sent
    ↓
Transform Supabase types → Internal User/Session types
    ↓
Return { user, session, error }
    ↓
AuthProvider receives session
    ↓
onAuthStateChange triggers
    ↓
All useAuth() hooks receive updated user
    ↓
UI rerenders (signed in state)
```

### Session Persistence

**Storage:** AsyncStorage (React Native key-value store)

**Configuration:**

```typescript
// src/lib/supabase/client.ts
createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage, // Persist session
    autoRefreshToken: true, // Refresh before expiry
    persistSession: true, // Save to storage
    detectSessionInUrl: false, // Mobile app (no URL params)
  },
});
```

**Flow:**

1. User signs in → Session saved to AsyncStorage
2. App closes
3. App reopens → Supabase loads session from AsyncStorage
4. Token still valid → User stays signed in
5. Token expired → Auto-refresh (if refresh token valid)
6. Refresh failed → User signed out

### RLS (Row Level Security)

All database access is scoped to authenticated user:

```sql
-- Enable RLS
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notes
CREATE POLICY "Users can view their own notes"
  ON notes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert notes for themselves
CREATE POLICY "Users can insert their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

**How it works:**

1. User signs in → Supabase issues JWT with `sub` (user ID)
2. Client sends JWT with every request (via Authorization header)
3. Supabase validates JWT
4. `auth.uid()` returns user ID from JWT
5. RLS policies filter queries automatically

---

## Theme System

### Architecture

```
ThemeProvider
    ↓
Reads persisted preferences from AsyncStorage (async, non-blocking)
    ↓
Generates palette from brandHue + mode
    ↓
Provides theme context: { colors, spacing, radius, mode, brandHue }
    ↓
useTheme() hook accesses context
    ↓
Components consume theme.colors.* (zero hardcoded colors)
    ↓
setBrandHue() updates hue → regenerates palette → rerenders all components
```

### Zero Hardcoded Colors Rule

**❌ NEVER:**

```tsx
<Text style={{ color: "#000000" }}>  // Hardcoded!
<View style={{ backgroundColor: "white" }}>  // Hardcoded!
```

**✅ ALWAYS:**

```tsx
const { theme } = useTheme();
<Text style={{ color: theme.colors.textPrimary }}>
<View style={{ backgroundColor: theme.colors.background }}>
```

### Dynamic Palette Generation

```typescript
// theme/colors.ts
export function generatePalette(
  brandHue: number,
  mode: ColorMode
): ThemeTokens {
  const base = oklch(brandHue); // Generate from hue

  return {
    // Primary from brandHue
    primary: base,
    primaryHover: lighten(base, 0.1),

    // Semantic colors adapt to mode
    background: mode === "light" ? "#FFFFFF" : "#000000",
    textPrimary: mode === "light" ? "#000000" : "#FFFFFF",

    // Glass colors (semi-transparent)
    glassBackground:
      mode === "light" ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.7)",
  };
}
```

**When brandHue changes:**

1. `setBrandHue(210)` called
2. Theme provider regenerates palette
3. All components using `useTheme()` rerender
4. New preference saved to AsyncStorage

---

## Bottom Sheet System

### Architecture

```
BottomSheetProvider (custom wrapper)
    ↓
Manages single BottomSheetModal instance
    ↓
Exposes { open, close } via context
    ↓
useBottomSheet() hook accesses context
    ↓
Components call open(content, options)
    ↓
Provider sets content, snapPoints, forces remount
    ↓
BottomSheetModal presents with glass background
    ↓
User swipes down or taps backdrop → close()
```

### Glass Background Implementation

```tsx
const renderBackground = useCallback(
  ({ style }: any) => (
    <BlurView
      intensity={100}
      tint={theme.mode === "light" ? "extraLight" : "dark"}
      style={[
        {
          borderTopLeftRadius: theme.radius.lg,
          borderTopRightRadius: theme.radius.lg,
          overflow: "hidden",
        },
        style,
      ]}
    />
  ),
  [theme.mode, theme.radius.lg]
);
```

**Key Features:**

- BlurView from expo-blur
- Adapts to light/dark mode
- Rounded top corners
- Positioned absolutely to cover modal

### Remount Pattern (Prevents Snap Point Bugs)

```tsx
const [modalKey, setModalKey] = useState(0);

const open = (content, options) => {
  setModalKey((prev) => prev + 1); // Force remount
  setContent(content);
  setSnapPoints(options?.snapPoints || ["50%"]);

  setTimeout(() => {
    bottomSheetRef.current?.present();
  }, 100);
};
```

**Why remount:**

- `@gorhom/bottom-sheet` caches snap points on mount
- Changing snap points without remount can cause stuck positions
- Force remount ensures fresh snap point calculation

---

## Configuration System

### Multi-App Architecture

Mobile Core supports multiple apps from one codebase:

```
Single codebase
    ↓
Environment variables select profile + environment
    ↓
EXPO_PUBLIC_APP_PROFILE=intake, EXPO_PUBLIC_APP_ENV=dev
    ↓
Config loader merges base + env overrides
    ↓
getAppConfig() returns merged config
    ↓
Supabase/Firebase/Billing initialized with config values
```

### Config Loading Flow

```typescript
// 1. Load profile
const profile = process.env.EXPO_PUBLIC_APP_PROFILE || "default";
const profileConfig = APP_PROFILES[profile]; // intake, proxi, default

// 2. Load environment
const env = process.env.EXPO_PUBLIC_APP_ENV || "dev"; // dev, staging, prod
const envOverrides = profileConfig.environments?.[env] || {};

// 3. Deep merge
const merged = {
  supabase: {
    ...profileConfig.supabase,
    ...envOverrides.supabase,
  },
  app: {
    ...profileConfig.app,
    ...envOverrides.app,
  },
  features: {
    ...profileConfig.features,
    ...envOverrides.features,
  },
};

// 4. Validate with Zod
return AppConfigSchema.parse(merged);
```

### Profile Structure

```typescript
// src/config/profiles/intake.ts
export const intakeConfig: AppProfileConfig = {
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://fallback.supabase.co",
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "fallback",
  },

  features: {
    vision: true, // Enable vision AI
    water: true, // Enable water tracking
    habit: false, // Disable habits
  },

  app: {
    name: "Intake",
    bundleIdentifier: "com.yourcompany.intake",
  },

  environments: {
    dev: {
      features: {
        billing: false, // Disable billing in dev
      },
      app: {
        name: "Intake Dev",
        bundleIdentifier: "com.yourcompany.intake.dev",
      },
    },
  },
};
```

**Usage:**

```typescript
import { getAppConfig } from "@/src/config";

const config = getAppConfig();
console.log(config.app.name); // "Intake Dev" (in dev env)
console.log(config.features.vision); // true
```

---

## File Organization

### Principles

1. **Feature-based** - Group by feature, not by file type
2. **Colocation** - Keep related files together
3. **Public API** - Export via `index.ts`
4. **Abstraction layers** - UI → Service → Client

### Feature Structure

```
src/features/notes/
├── index.ts              # Public API exports
├── notes.types.ts        # TypeScript interfaces
├── notes.service.ts      # Business logic + Supabase calls
├── NotesScreen.tsx       # Main UI
└── CreateNoteSheet.tsx   # Sub-component
```

**Public API:**

```typescript
// src/features/notes/index.ts
export { NotesScreen } from "./NotesScreen";
export { createNote, subscribeToNotes } from "./notes.service";
export type { Note } from "./notes.types";

// Consumers import from feature root:
import { NotesScreen, type Note } from "@/src/features/notes";
```

### UI Component Structure

```
src/ui/
├── primitives/    # Base components (TText, TButton)
├── glass/         # Glass effect components
├── sheets/        # Bottom sheet system
├── forms/         # Form components
├── layout/        # Layout helpers
└── dev/           # Dev-only components
```

**Rules:**

- Primitives depend on theme only
- Composed components use primitives
- Dev components gated by `__DEV__`

---

## Summary

**Core Principles:**

1. **Swappable Abstractions** - Analytics, logger, flags, auth
2. **Service Layer** - Never call Supabase directly from UI
3. **Provider Nesting** - Correct order for gestures, theme, auth
4. **Zero Hardcoded Values** - Use theme.colors._, theme.spacing._, etc.
5. **Realtime via Broadcast** - Faster than postgres changes
6. **Config-Driven** - Multi-app support via profiles
7. **Dev-Only Features** - Gate validation harnesses with `__DEV__`

**Validation:** See [VALIDATION.md](./VALIDATION.md) for step-by-step testing checklist.
