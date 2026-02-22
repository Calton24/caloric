# Mobile Core Catalog

The **Mobile Core** tab is a live playground for every UI component in the library. It's structured as a multi-screen catalog so demos stay manageable as the component count grows.

## Architecture

```
app/(tabs)/mobile-core/
├── _layout.tsx        # Stack navigator (headerShown: false)
├── index.tsx          # Category menu — 4 cards linking to sub-screens
├── primitives.tsx     # Core building blocks demos
├── glass.tsx          # Liquid Glass widget demos + knobs
├── patterns.tsx       # Composable layout & navigation patterns
└── widgets.tsx        # Analytics / data-vis widget demos
```

The tab name in `app/(tabs)/_layout.tsx` is `"mobile-core"`, which resolves to the directory automatically via Expo Router.

## Adding a New Demo

### 1. Pick the right screen

| Screen           | What goes here                                                                                                                                                                           |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `primitives.tsx` | Atomic UI elements: buttons, inputs, text, badges, dividers, skeleton loaders, sliders, checkboxes, etc.                                                                                 |
| `glass.tsx`      | Anything using `GlassSurface` / blur: glass buttons, pills, sliders, segmented controls, status chips, mini cards, search bars. Also the Knobs panel.                                    |
| `patterns.tsx`   | Composed layouts that combine multiple primitives: settings lists, list rows, retry states, footer CTAs, tab selectors, hamburger menus, swipe cards, carousels, stories, review sheets. |
| `widgets.tsx`    | Data visualization / analytics cards: charts, rings, counters, trackers.                                                                                                                 |

### 2. Add the demo

1. Open the target screen file.
2. Import your component.
3. Add any required `useState` hooks at the top of the component.
4. Add a new `<GlassCard>` section in the `<ScreenShell>` body with:
   - A `<TText variant="heading">` title.
   - Demo instances showing key variants/props.

### 3. Update the menu count

Open `index.tsx` and increment the `count` in the matching card so the menu stays accurate.

### 4. Example

```tsx
// In primitives.tsx — add after the last section:

<TSpacer size="lg" />

<GlassCard style={s.section}>
  <TText variant="heading">MyNewWidget</TText>
  <TSpacer size="md" />
  <MyNewWidget variant="default" />
  <TSpacer size="sm" />
  <MyNewWidget variant="compact" disabled />
</GlassCard>
```

## Screen Template

Every sub-screen follows the same structure:

```tsx
export default function XScreen() {
  const router = useRouter();
  // ... state hooks

  return (
    <ScreenShell
      header={
        <GlassHeader
          title="Screen Title"
          subtitle="Brief description"
          onBack={() => router.back()}
        />
      }
    >
      {/* Demo sections */}
    </ScreenShell>
  );
}
```

`ScreenShell` provides SafeArea + scroll. `GlassHeader` provides blur-backed navigation with a back button.

## Adding a Brand-New Category

1. Create `app/(tabs)/mobile-core/my-category.tsx`.
2. Add the screen to `_layout.tsx`:
   ```tsx
   <Stack.Screen name="my-category" />
   ```
3. Add a card in `index.tsx` that routes to it:
   ```tsx
   { title: "My Category", subtitle: "Description", icon: "icon-name", count: 0, route: "my-category" }
   ```
