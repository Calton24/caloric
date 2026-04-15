# Contributing to Caloric

## Getting Started

```bash
git clone <repo>
cd caloric
npm install --legacy-peer-deps
npx expo start
```

## Pre-Push Checks

The repo enforces typecheck + tests on push. Run locally before pushing:

```bash
npx tsc --noEmit          # Type check
npx jest                  # Unit tests
npx expo lint             # ESLint
```

---

## Analytics Rules

1. **Import only `analytics` from `src/infrastructure/analytics`** — never import a vendor SDK (`posthog-react-native`, `@amplitude/*`, etc.) outside infrastructure code. ESLint will block you.
2. **All analytics calls go through the singleton** — `analytics.track()`, `analytics.identify()`, `analytics.screen()`, `analytics.reset()`. No second client, no ad-hoc wrappers.
3. **New providers are classes in `src/infrastructure/analytics/`** — implement `AnalyticsClient`, register in `factory.ts`. That's it.
4. **Analytics must never crash the app** — every provider method guards with try/catch. If it throws, log and move on.
5. **No analytics in UI primitives** — tracking belongs in features/screens, not in `TButton`, `GlassCard`, or any component under `src/ui/`.

---

## Architecture Quick Reference

| Layer                   | May import                                  | Must NOT import                   |
| ----------------------- | ------------------------------------------- | --------------------------------- |
| `src/ui/**`             | Theme, other UI                             | Features, infrastructure, vendors |
| `src/features/**`       | Infrastructure abstractions, UI             | Vendor SDKs directly              |
| `src/infrastructure/**` | Vendor SDKs, config                         | UI, features                      |
| `src/lib/**`            | Vendor SDKs                                 | UI, features                      |
| `app/**`                | Features, UI, infrastructure barrel exports | Vendor SDKs directly              |

See [CONSTITUTION.md](CONSTITUTION.md) for the 5 non-negotiable rules.
