# Caloric UI

A simple, theme-aware UI layer for React Native with glass morphism effects.

## Features

- **Theme System**: Dynamic color palette generation from brand hue + light/dark mode
- **Glass Components**: Blur effects on iOS, translucent fallback on Android
- **Bottom Sheets**: Modal-based sheet system with animations
- **Primitives**: Themed text, buttons, inputs, spacing, etc.
- **Auth System**: Complete authentication flow with mock client
- **Dev Screens**: Interactive demos of all components

## Installation

Already included! Just one dependency was added:

- `expo-blur` - For glass morphism effects

## Quick Start

### 1. Wrap your app with providers

```tsx
import { CaloricProviders } from "./src";

export default function App() {
  return (
    <CaloricProviders>
      <YourApp />
    </CaloricProviders>
  );
}
```

### 2. Use theme in your components

```tsx
import { useTheme, Screen, TText, TButton } from "./src";

function MyScreen() {
  const { theme } = useTheme();

  return (
    <Screen>
      <TText variant="heading">Hello World</TText>
      <TButton onPress={() => {}}>Click Me</TButton>
    </Screen>
  );
}
```

### 3. Access auth

```tsx
import { useAuth, SignInScreen } from "./src";

function MyAuthFlow() {
  const { user, signIn, signOut } = useAuth();

  if (!user) {
    return <SignInScreen />;
  }

  return <SignedInHomeScreen />;
}
```

### 4. Use bottom sheets

```tsx
import { useBottomSheet, TButton } from "./src";

function MyComponent() {
  const { open } = useBottomSheet();

  const showSheet = () => {
    open(
      <View>
        <TText>Sheet content here</TText>
      </View>,
      { title: "My Sheet", height: 400 }
    );
  };

  return <TButton onPress={showSheet}>Open Sheet</TButton>;
}
```

## Component Reference

### Theme

- `useTheme()` - Access theme, toggle mode, change brand hue
- `ThemeProvider` - Root theme provider
- `spacing`, `radius`, `typography` - Design tokens

### Glass

- `GlassSurface` - Core blur wrapper (iOS) / translucent fallback
- `GlassCard` - Card with glass effect + padding

### Primitives

- `TText` - Themed text with variants (heading, body, caption)
- `TButton` - Button with variants (primary, secondary, outline, ghost)
- `TInput` - Text input with error state
- `TDivider` - Horizontal/vertical divider
- `TSpacer` - Spacing component
- `Screen` - Layout wrapper with safe area

### Forms

- `FormField` - Labeled input with validation
- `useSubmitLock` - Prevent double-submit

### Auth

- `useAuth()` - Access auth state and methods
- `SignInScreen`, `SignUpScreen`, etc. - Pre-built screens
- `authClient` - Mock auth client (replace with Supabase in prod)

### Bottom Sheets

- `useBottomSheet()` - Control sheets globally
- `BottomSheet` - Render component (included in providers)

### Tabs

- `GlassTabBar` - Tab bar with glass effect
- `TabItem` - Individual tab button

## Dev Menu

Access all demos via `DevMenuScreen`:

```tsx
import { DevMenuScreen } from "./src";

// Navigate to this screen to test all components
```

## Architecture

```
src/
├── theme/          # Theme system (tokens, colors, provider)
├── ui/
│   ├── glass/      # Glass components
│   ├── tabs/       # Tab components
│   ├── sheets/     # Bottom sheet system
│   ├── primitives/ # Basic components
│   ├── forms/      # Form components
│   └── layout/     # Layout components
├── features/
│   └── auth/       # Auth system
└── screens/
    └── dev/        # Dev/demo screens
```

## Hard Rules Followed

✅ Plain React Native StyleSheet only
✅ Only added `expo-blur` library
✅ Simple glass implementation (BlurView on iOS, fallback on Android)
✅ No complex animation systems or overengineering
✅ Screens use theme semantic tokens (no hardcoded colors)
✅ Mock auth client interface compatible with Supabase

## Customization

### Change Brand Color

```tsx
const { setBrandHue } = useTheme();
setBrandHue(270); // Purple
```

### Toggle Dark Mode

```tsx
const { toggleMode } = useTheme();
toggleMode();
```

### Replace Mock Auth

In production, swap `authClient` in `src/features/auth/authClient.ts` with your Supabase client while maintaining the same interface.

## Testing

Run the dev menu to manually test all components:

1. Launch app
2. Navigate to `/dev/menu`
3. Test each component interactively

## License

Part of Caloric project.
