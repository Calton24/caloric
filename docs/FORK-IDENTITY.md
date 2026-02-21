# Fork Identity Guide

How a fork app keeps its own brand identity while inheriting every component from `mobile-core`.

---

## The Rule

> **Override tokens, never override components.**

A fork customizes its look-and-feel entirely through the theme layer.
Components read from `ThemeTokens` — so changing tokens changes the whole app.

---

## What to Override

### 1. Brand Hue

In your fork's `ThemeProvider` setup, pass a different `brandHue` value:

```ts
// mobile-core default
const BRAND_HUE = 220; // blue

// your fork
const BRAND_HUE = 350; // rose
```

The `generatePalette(brandHue, mode)` function in `src/theme/colors.ts` derives the entire color palette from this single number.

### 2. Typography

Override `TypographyTokens` in your fork's theme config:

```ts
const typography: TypographyTokens = {
  fontSize: { xs: 11, sm: 13, md: 15, lg: 19, xl: 24, xxl: 30, xxxl: 36 },
  fontWeight: { regular: "400", medium: "500", semibold: "600", bold: "700" },
  lineHeight: { tight: 1.2, normal: 1.5, relaxed: 1.75 },
};
```

### 3. Spacing & Radius

Adjust `SpacingTokens` and `RadiusTokens` for a tighter or looser feel:

```ts
const spacing: SpacingTokens = {
  xs: 2, sm: 4, md: 8, lg: 16, xl: 24, xxl: 32,
};

const radius: RadiusTokens = {
  sm: 2, md: 6, lg: 12, xl: 20, full: 9999,
};
```

### 4. Glass Intensity (optional)

If your fork prefers a more subtle or stronger glass effect, override `glassIntensity` in `src/ui/glass/glassStyles.ts`:

```ts
export const glassIntensity = {
  light: 30,   // subtler
  medium: 60,
  strong: 90,
};
```

---

## What NOT to Override

| Don't do this | Do this instead |
|---|---|
| Copy `TButton.tsx` into your fork and edit it | Change `theme.colors.primary` via `brandHue` |
| Add a second `BlurView` wrapper | Adjust `glassIntensity` values |
| Hard-code colors in fork screens | Use `useTheme()` and token keys |
| Create fork-specific layout components | Use `Screen`, `Header`, `TSpacer` with different tokens |

---

## Verification

After changing tokens, open the **Mobile Core** catalog tab to visually verify that all components render correctly with your fork's identity.
Every Tier A component is showcased there with interactive knobs.

---

## Example: Minimal Fork Setup

```ts
// app/_layout.tsx in your fork
import { ThemeProvider } from "mobile-core/src/theme/ThemeProvider";

export default function RootLayout() {
  return (
    <ThemeProvider brandHue={160} defaultMode="dark">
      {/* your fork's routes */}
    </ThemeProvider>
  );
}
```

That's it. One number changes your entire palette. Everything else inherits.
