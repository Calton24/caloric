# Liquid Glass Widget Kit

Reusable iOS Control Center–style glass components for `mobile-core`.

---

## Components

| Component | Variant | Description |
|---|---|---|
| **GlassSurface** | `card` / `pill` / `circle` / `overlay` | Foundation blur/fallback wrapper. All other glass components compose on this. |
| **GlassIconButton** | – | Circular quick-action button (flashlight, camera, timer). |
| **GlassTogglePill** | – | Large pill control — toggle, menu, or mixed mode (like iOS "Focus"). |
| **GlassSliderVertical** | – | Vertical brightness/volume slider with animated fill track. |
| **GlassSegmentedControl** | – | 2–5 segment picker with active highlight. |
| **GlassStatusChip** | – | Small pill with icon + text in neutral/success/warning/danger tones. |
| **GlassMiniCard** | – | Dashboard stat card: title, value, delta, icon. |
| **GlassCard** | – | Pre-existing card that composes GlassSurface with padding. |

---

## Quick Start

```tsx
import {
  GlassSurface,
  GlassIconButton,
  GlassTogglePill,
  GlassSliderVertical,
  GlassSegmentedControl,
  GlassStatusChip,
  GlassMiniCard,
} from "@/src/ui/glass";
```

All components accept these shared props for catalog/testing knobs:

| Prop | Type | Default | Purpose |
|---|---|---|---|
| `blurEnabled` | `boolean` | `true` | Set `false` to force solid fallback (perf budget). |
| `reduceTransparency` | `boolean` | `false` | Simulates iOS Reduce Transparency accessibility setting. |
| `intensity` | `number` | `80` | Raw BlurView intensity (0–100). |
| `tint` | `"light" \| "dark" \| "default"` | `"default"` | Blur tint style. |

---

## Performance Rules

1. **Max 1–2 BlurViews per screen.** Each `GlassSurface` with `blurEnabled=true` on iOS creates a `BlurView`. Budget carefully.
2. **Never use GlassSurface inside FlatList/FlashList items.** Use `blurEnabled={false}` for list items — the solid fallback is visually close and costs nothing.
3. **reduceTransparency fallback is mandatory.** When the user enables Reduce Transparency in iOS Settings, or on lower-end Android, glass components automatically render as tinted solid `View`s.
4. **Reanimated is used only for lightweight animations** — press scale, slider fill height. No layout animations, no Skia.

---

## Accessibility

- All interactive components set `accessibilityRole`, `accessibilityLabel`, and `accessibilityState`.
- `GlassSliderVertical` uses `accessibilityRole="adjustable"` with `accessibilityValue`.
- `GlassSegmentedControl` uses `accessibilityRole="tablist"` / `"tab"` pattern.
- Touch targets meet 44×44pt minimum.
- When `reduceTransparency` is true (either via prop or system setting), blur is replaced with an opaque tinted View — no visual information is lost.

---

## Theming

Glass tokens added to `ThemeTokens`:

```
glassTintLight    - rgba overlay for light glass depth
glassTintDark     - rgba overlay for dark glass depth  
glassBorderHighlight - inner highlight border color
glassShadow       - shadow color for glass containers
glassActiveRing   - ring color for active/toggled states
```

All values are derived from the existing palette generator (`generatePalette`). Forks override by changing `brandHue` — the active ring color automatically follows.

---

## Catalog

The **Mobile Core** tab includes a full interactive catalog with knobs:
- Glass on/off toggle
- Blur intensity picker (named + numeric)
- Reduce Transparency simulation toggle
- Tint selector (segmented control — itself a glass widget)

This is gated behind `FeatureFlags.SHOW_MOBILE_CORE` (dev-only).

---

## File Structure

```
src/ui/glass/
├── index.ts                  # Barrel export
├── GlassSurface.tsx          # Foundation (enhanced)
├── GlassCard.tsx             # Card composition
├── glassStyles.ts            # Shared constants
├── GlassIconButton.tsx       # Circular quick action
├── GlassTogglePill.tsx       # Toggle/menu pill
├── GlassSliderVertical.tsx   # Vertical slider
├── GlassSegmentedControl.tsx # Segmented control
├── GlassStatusChip.tsx       # Status pill
└── GlassMiniCard.tsx         # Dashboard card
```
