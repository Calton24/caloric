# UI Constitution

Five non-negotiable rules for every component in `src/ui/`.

---

### 1. Token-Driven — No Magic Numbers

Every color, spacing, radius, font size, and shadow **must** come from `ThemeTokens`.
Hard-coded values (`#fff`, `padding: 12`, `fontSize: 16`) are banned.
If a token doesn't exist yet, add it to `tokens.ts` first — then use it.

### 2. GlassSurface Is the Only Glass Primitive

All glass/blur effects compose through `GlassSurface`.
Never import `BlurView` directly. Never create a second blur abstraction.
Maximum **2 blur layers** visible on any single screen (performance ceiling).

### 3. Accessibility Is Not Optional

- Every interactive element needs `accessibilityRole` and `accessibilityLabel`.
- Touch targets ≥ 44×44pt.
- Text contrast must pass WCAG AA (4.5:1 body, 3:1 large).
- Provide a non-blur fallback for `reduceTransparency` and Android.

### 4. Components Own Layout, Parents Own Position

A component controls its **internal** spacing and structure.
A component never sets its own `margin`, `position`, or `flex` — the parent does that via `style` prop or a `TSpacer`.
This keeps components composable in any context.

### 5. One Import, One Purpose

Each file in `src/ui/` exports **one** component or **one** hook.
Barrel files (`index.ts`) re-export for convenience but never add logic.
If a component needs a provider (e.g., `Toast`), the provider and hook live in the same file but are separate named exports.

---

_Violations should be caught in code review. If a rule blocks legitimate progress, amend this document — don't silently break it._
