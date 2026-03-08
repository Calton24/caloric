# Caloric Constitution (v1)

Five rules. Non-negotiable. Enforced by ESLint + PR review.

---

### Rule 1 — Vendor Isolation

No vendor SDK imports outside `src/lib/**` or `src/infrastructure/**`.

Feature code, UI code, and application code import abstractions, never packages.

_Enforced by: `no-restricted-imports` pattern rule in `eslint.config.js`._

---

### Rule 2 — Dependency Direction

UI may not call vendor wrappers directly.

```
UI → features/application → infrastructure/lib → vendor SDK → nothing
```

Never the other way around.

_Enforced by: code review + Rule 1 lint rule. Layer rules (optional future ESLint scope)._

---

### Rule 3 — Safe by Default

Every optional subsystem must be safe with zero configuration.

No config = no-op. Never crash.

If Sentry isn't configured, error reporting silently no-ops.
If PostHog isn't configured, analytics silently no-ops.
If no flags provider is set, flags return defaults.

_Enforced by: every subsystem ships a Noop implementation as its default._

---

### Rule 4 — One Path for Cross-Cutting Concerns

Logging, analytics, error reporting, feature flags, and storage live under `src/infrastructure/`.

No second logging system. No ad-hoc analytics calls. No scattered storage helpers.

If it's cross-cutting, it goes through the infrastructure layer. Period.

_Enforced by: Rule 1 (vendor isolation) + directory convention._

---

### Rule 5 — Variation Points Are Interfaces

If a capability might differ across apps — backend, billing, analytics, storage, error reporting — it gets:

1. An interface (the contract)
2. A default implementation (ships working out of the box)
3. A factory or setter (swap at bootstrap)

No concrete classes in feature code. No "just this once" direct SDK usage.

_Enforced by: TypeScript compiler + Rule 1 lint rule._

---

## How to Use This

- **PR review:** "Rule N violated. Fix." No debate needed.
- **New subsystem:** Interface + Noop + real provider. Register in factory. Done.
- **New app fork:** Swap providers at bootstrap. Constitution keeps the rest clean.
- **"Can I just quickly...":** No. See Rule 1.
