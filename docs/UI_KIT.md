# UI Kit Reference

Complete reference for all **primitives** and **patterns** in caloric. These are zero-business-logic, theme-driven building blocks designed to be forked into any app.

---

## Primitives

Atomic elements. Import from `src/ui/primitives/`.

| Component            | File                   | Purpose                                                                                                                                                |
| -------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **TText**            | `TText.tsx`            | Theme-aware text with `variant` (heading, subheading, body, caption) and `color` (primary, secondary, muted, error).                                   |
| **TButton**          | `TButton.tsx`          | Button with `variant` (primary, secondary, outline, ghost), `size` (sm, md, lg), `disabled`, `loading`.                                                |
| **TInput**           | `TInput.tsx`           | Text input with label, placeholder, `error` message, `secureTextEntry`.                                                                                |
| **TDivider**         | `TDivider.tsx`         | Horizontal rule. Token-driven color and spacing.                                                                                                       |
| **TSpacer**          | `TSpacer.tsx`          | Vertical spacing using theme tokens: `xs` (4), `sm` (8), `md` (16), `lg` (24), `xl` (32), `xxl` (48).                                                  |
| **TBadge**           | `TBadge.tsx`           | Status indicator / count badge. `tone` (primary, secondary, success, warning, error, info, muted), `size` (sm, md, lg), `dot` mode, `outline` variant. |
| **ColorPickerSheet** | `ColorPickerSheet.tsx` | Hue wheel + shade picker for theme customization. Opens in a bottom sheet.                                                                             |

---

## Patterns

Composed layouts built from primitives. Import from `src/ui/patterns/`.

### ScreenShell

Standard screen wrapper that eliminates boilerplate.

```tsx
<ScreenShell
  header={<GlassHeader title="Title" onBack={...} />}
  footer={<StickyFooterCTA label="Save" onPress={...} />}
>
  {/* content */}
</ScreenShell>
```

| Prop       | Type      | Default            | Description                |
| ---------- | --------- | ------------------ | -------------------------- |
| `children` | ReactNode | —                  | Screen content             |
| `header`   | ReactNode | —                  | Fixed header slot          |
| `footer`   | ReactNode | —                  | Fixed footer slot          |
| `scroll`   | boolean   | `true`             | Wrap content in ScrollView |
| `padX`     | number    | `theme.spacing.md` | Horizontal padding         |
| `edges`    | Edge[]    | `["top","bottom"]` | SafeAreaView edges         |

### GlassHeader

Blur-backed header bar with navigation and action slots.

```tsx
<GlassHeader
  title="Settings"
  subtitle="Account preferences"
  onBack={() => router.back()}
  right={<Ionicons name="ellipsis-horizontal" />}
/>
```

| Prop        | Type           | Default    | Description                              |
| ----------- | -------------- | ---------- | ---------------------------------------- |
| `title`     | string         | —          | Header title                             |
| `subtitle`  | string         | —          | Optional subtitle                        |
| `onBack`    | () => void     | —          | Shows back chevron when provided         |
| `left`      | ReactNode      | —          | Custom left slot (overrides back button) |
| `right`     | ReactNode      | —          | Right action slot                        |
| `large`     | boolean        | `false`    | Large title mode                         |
| `intensity` | GlassIntensity | `"medium"` | Blur intensity                           |

### SettingsList

iOS Settings.app-style grouped rows.

```tsx
<SettingsGroup title="Account" footer="Manage your settings.">
  <SettingsRow label="Notifications" icon="notifications-outline"
    iconBg="#FF3B30" type="toggle" value={enabled} onToggle={setEnabled} />
  <SettingsRow label="Language" icon="globe-outline"
    type="navigate" value="English" onPress={...} />
  <SettingsRow label="Log Out" type="action" destructive onPress={...} />
</SettingsGroup>
```

**SettingsRow types:**

- `navigate` — shows chevron, optional `value` text
- `toggle` — shows Switch, requires `value` + `onToggle`
- `action` — plain tap action, supports `destructive`
- `value` — displays read-only value text

### ListRow

Composable list row with leading icon, title/subtitle, trailing slot, and auto-chevron.

```tsx
<ListRow
  title="Storage"
  icon="cloud-outline"
  subtitle="2.4 GB used"
  accessory={<TBadge label="80%" tone="warning" size="sm" />}
  onPress={...}
/>
```

| Prop          | Type         | Description                             |
| ------------- | ------------ | --------------------------------------- |
| `title`       | string       | Row title                               |
| `subtitle`    | string       | Secondary text below title              |
| `icon`        | IoniconsName | Leading icon                            |
| `leading`     | ReactNode    | Custom leading element (overrides icon) |
| `trailing`    | ReactNode    | Right-side content                      |
| `accessory`   | ReactNode    | Between title area and trailing         |
| `showChevron` | boolean      | Force chevron visibility                |
| `compact`     | boolean      | Reduced padding                         |
| `disabled`    | boolean      | Greyed out, non-interactive             |

### RetryState

Error/failure state with retry action and animated loading.

```tsx
<RetryState
  title="Failed to load"
  subtitle="Check your connection and try again."
  loading={isRetrying}
  onRetry={handleRetry}
/>
```

| Prop         | Type         | Default                   | Description              |
| ------------ | ------------ | ------------------------- | ------------------------ |
| `title`      | string       | `"Something went wrong"`  | Error heading            |
| `subtitle`   | string       | —                         | Explanation text         |
| `icon`       | IoniconsName | `"cloud-offline-outline"` | Large central icon       |
| `retryLabel` | string       | `"Try Again"`             | Button text              |
| `loading`    | boolean      | `false`                   | Shows spinning sync icon |
| `onRetry`    | () => void   | —                         | Retry handler            |

### StickyFooterCTA

Pinned bottom bar with primary/secondary actions.

```tsx
<StickyFooterCTA
  label="Save Changes"
  onPress={handleSave}
  secondaryLabel="Discard"
  onSecondaryPress={handleDiscard}
  helperText="Changes save to cloud."
  layout="stacked" // or "inline"
/>
```

| Prop               | Type                    | Default     | Description              |
| ------------------ | ----------------------- | ----------- | ------------------------ |
| `label`            | string                  | —           | Primary button text      |
| `onPress`          | () => void              | —           | Primary action           |
| `secondaryLabel`   | string                  | —           | Ghost button text        |
| `onSecondaryPress` | () => void              | —           | Secondary action         |
| `helperText`       | string                  | —           | Small text above buttons |
| `layout`           | `"stacked" \| "inline"` | `"stacked"` | Button arrangement       |
| `disabled`         | boolean                 | `false`     | Disables primary button  |
| `loading`          | boolean                 | `false`     | Shows loading state      |

---

## When to Use What

| Need                                       | Use                             |
| ------------------------------------------ | ------------------------------- |
| Wrap a full screen with scroll + safe area | `ScreenShell`                   |
| Blur header with back button               | `GlassHeader`                   |
| iOS-style grouped settings                 | `SettingsGroup` + `SettingsRow` |
| Generic list items with icons              | `ListRow`                       |
| Error state with retry                     | `RetryState`                    |
| Pinned bottom action bar                   | `StickyFooterCTA`               |
| Small status label or count                | `TBadge`                        |
| Vertical spacing                           | `TSpacer`                       |
| Section divider                            | `TDivider`                      |

---

## Design Principles

1. **Theme-driven** — All colors, spacing, radii come from `useTheme()` tokens. Never hardcode hex values.
2. **Zero business logic** — Components accept data via props; no API calls, no auth checks, no state management libs.
3. **Composable** — Patterns combine primitives. `ScreenShell` wraps `GlassHeader` + `StickyFooterCTA`. `SettingsGroup` wraps `SettingsRow`. Build screens by composing these.
4. **Fork-friendly** — Change the theme tokens and all components update. No component references app-specific constants.
