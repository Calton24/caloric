# Feature Flags

This directory contains feature flags for controlling development features.

## Usage

```typescript
import { FeatureFlags } from '@/config/features';

// Use in components
if (FeatureFlags.SHOW_PLAYGROUND) {
  // Show playground-related feature
}
```

## Available Flags

### `SHOW_PLAYGROUND`
**Type:** `boolean`  
**Default:** `true`

Controls whether the Playground tab is visible in the app. 

- Set to `true` during development to test components
- Set to `false` in production builds to hide internal testing features

**Example:**
```typescript
// In app/(tabs)/_layout.tsx
{FeatureFlags.SHOW_PLAYGROUND && (
  <NativeTabs.Trigger name="playground">
    <Icon sf={"sparkles"} />
    <Label>Playground</Label>
  </NativeTabs.Trigger>
)}
```

## Adding New Flags

1. Open `config/features.ts`
2. Add your new flag to the `FeatureFlags` object with a JSDoc comment
3. Document it in this README

```typescript
export const FeatureFlags = {
  SHOW_PLAYGROUND: true,
  YOUR_NEW_FLAG: false, // Add description
} as const;
```
