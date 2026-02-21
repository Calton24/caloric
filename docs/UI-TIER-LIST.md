# UI Component Tier List

Tiers rank components by ROI: how many screens need them × how painful they are to re-implement per-fork.

---

## Tier A — Ship Now (every app needs these day 1)

| Component | Justification |
|---|---|
| **GlassSurface** | Single glass primitive; every visual layer composes on it. |
| **GlassCard** | Default content container (glass + padding + radius). |
| **Screen** | SafeArea + scroll + theme background — every route needs one. |
| **Header** | Title / subtitle / action row used on virtually every screen. |
| **TButton** | 4 variants × 3 sizes covers every CTA in the app. |
| **TInput** | Text fields with error state — auth, forms, search. |
| **TText** | Enforces typography tokens instead of raw `<Text>`. |
| **TSpacer / TDivider** | Spacing + visual separation; trivial but ubiquitous. |
| **ListItem** | Settings, menus, search results — tappable row with icon + chevron. |
| **BottomSheet (wrapper)** | Modal replacement on mobile; sheets are the primary overlay. |
| **Toast** | Ephemeral feedback (success / error / info / warning). |
| **EmptyState** | Zero-data placeholder — every list screen needs one. |
| **Skeleton** | Loading placeholder; avoids layout shift and perceived slowness. |

**Status:** All Tier A components are implemented and cataloged.

---

## Tier B — Next Sprint (needed by most apps, but not blocking MVP)

| Component | Justification |
|---|---|
| **Avatar** | User profile images with fallback initials; needed once profiles ship. |
| **Badge** | Notification counts, status dots; needed when counts/states appear. |
| **SegmentedControl** | Tab-like toggle within a screen (e.g. "All / Active / Done"). |
| **SearchBar** | Filtered list pattern; needed once any list exceeds ~20 items. |
| **Chip / Tag** | Category labels, filter pills; needed in discovery or tagging flows. |
| **ProgressBar** | Determinate progress for uploads, onboarding steps. |
| **Tooltip** | First-run guidance overlays; helpful but not blocking. |

---

## Tier C — When Needed (feature-specific, implement on demand)

| Component | Justification |
|---|---|
| **Carousel** | Image galleries, onboarding walkthroughs — only if the feature exists. |
| **DatePicker** | Calendar/date selection; most apps need it eventually but not at launch. |
| **Stepper** | Increment/decrement input; niche (quantity selectors, settings). |
| **Accordion** | Expandable FAQ / settings groups; useful but low frequency. |
| **Rating** | Star/heart rating input; review-specific. |
| **Swipeable Row** | Swipe-to-delete, swipe-to-archive; list-specific interaction. |
| **OTP Input** | Code verification fields; only if SMS/email OTP is added. |

---

## Promotion Rules

1. A component moves **up** a tier when ≥ 2 fork apps request it.
2. A component moves **down** (or is removed) if no fork uses it within 2 releases.
3. Tier C components stay feature-flagged until promoted to B.
