# Security Done Gate

> **What must be green before any fork of `mobile-core` ships.**

This document defines the non-negotiable security gates that every fork must
pass before merging to `main` or shipping to production. It is not aspirational.
If a gate is red, the build does not ship.

---

## Merge Gate Command

```bash
npm run mobile-core:verify:security
```

Every fork repository **must** run this as a required CI check on every pull
request targeting the default branch. The command runs the security audit script,
type checking, linting, and tests — exit non-zero on any failure.

Add to your CI (GitHub Actions example):

```yaml
- name: Security gate
  run: npm run mobile-core:verify:security
```

If this step fails, the PR cannot merge. No exceptions.

---

## Gate Checklist

### A) No Hardcoded Secrets

Scans `src/`, `config/`, and root config files for patterns that match API keys,
service-role JWTs, Stripe secret keys, AWS credentials, and private keys.

**Policy:** `fail` — zero tolerance.

### B) Service Role JWT Detection

Verifies that the codebase has an active `isServiceRoleJwt()` check and that no
service-role JWT (role claim = `service_role`) is embedded in client code.

**Policy:** `fail` if the check is missing or a service-role JWT is found.

### C) Debug Screen Production Gating

Every screen under `app/(tabs)/mobile-core/` must be wrapped in a `__DEV__`
guard or equivalent feature flag that prevents it from rendering in production
builds.

**Policy:** `fail` if any debug screen is unguarded.

### D) Logging Redaction

The logging layer must:

- Redact JWT tokens (Bearer + raw `eyJ...`)
- Redact Authorization headers
- Redact URL query parameter tokens (`?token=`, `?key=`, `?apiKey=`, etc.)
- Export `redactSensitive` from the logger module

**Policy:** `fail` if the redactor or its patterns are missing.

### E) Banned Imports

No direct imports of `dotenv`, `@supabase/supabase-js/dist/module/lib/fetch`,
or other banned modules in production source.

**Policy:** `fail` on any match.

### F) Dependency Audit

| Finding type                                      | Policy | Justification                                                                                                                                                          |
| ------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-release deps                                  | `warn` | Expo ecosystem ships `@expo/ui` etc. as pre-release                                                                                                                    |
| npm audit — **build-time-only CLI** high/critical | `warn` | `fast-xml-parser` (via `@react-native-community/cli`) and `minimatch` (via `@expo/cli`, `eslint`) are never bundled by Metro into the JS runtime. Proven via `npm ls`. |
| npm audit — **runtime** high/critical             | `fail` | Any vulnerability in a package Metro actually bundles is a shipping blocker.                                                                                           |

**How to triage a new npm audit finding:**

1. Run `npm ls <package>` to find the dependency chain.
2. Determine if it's build-time (Expo CLI, ESLint, Detox) or runtime.
3. If runtime: fix or pin before shipping.
4. If build-time: document in the script comment and keep as `warn`.

### G) Console.log Enforcement

No unguarded `console.log`, `console.warn`, `console.error`, `console.debug`,
or `console.info` in `src/infrastructure/` or `src/lib/`.

**Exceptions (auto-excluded by the scanner):**

- Calls inside `__DEV__` blocks
- Calls inside `catch` blocks (last-resort fallback)
- `src/logging/logger.ts` itself (it IS the logger)

All other logging must go through `import { logger } from "../../logging/logger"`.

**Policy:** `fail` — prevents accidental data exfiltration and debug leakage.

### H) Build Artifact Scanning

Checks `dist/`, `build/`, and `ios/build/` for `.env` files, secret patterns,
or credentials left in build output.

**Policy:** `fail` if found.

### I) gitleaks History Scan

Runs `gitleaks detect` on the full git history. False positives are tracked in
`.gitleaksignore` (currently 9 fingerprints from historical placeholder JWTs).

**Policy:** `fail` if gitleaks finds new secrets. `pass` if gitleaks is not
installed (optional dependency).

---

## SecureStore Policy

On **native** (iOS/Android), auth tokens are stored via `expo-secure-store`
(Keychain / Android Keystore). If SecureStore fails:

- `getItem` returns `null` → Supabase treats the user as logged out → forces
  re-auth.
- `setItem` / `removeItem` are no-ops → token is silently not stored → next
  cold start triggers re-auth.

**There is no fallback to AsyncStorage on native.** This is a deliberate
security decision: a broken Keychain is not a reason to dump tokens to plaintext
storage.

On **web**, AsyncStorage is used (acceptable: origin-scoped, same-origin policy
protects it).

---

## Growth Ingestion Risk

`SupabaseGrowthClient` currently inserts feature requests directly into
Supabase. This is acceptable for internal/beta but carries known risks:

| Risk                                 | Status     | Mitigation                                                    |
| ------------------------------------ | ---------- | ------------------------------------------------------------- |
| No server-side rate limiting         | Open       | Document in `SECURITY.md`                                     |
| No payload validation on server      | Open       | Supabase RLS provides row-level auth but not field validation |
| Recommended fix: Edge Function proxy | Documented | See `SupabaseGrowthClient.ts` header comment                  |

**Before any fork ships with growth enabled to public users**, an Edge Function
must be wired as the ingestion endpoint to enforce rate limits and payload
validation server-side.

---

## Known Remaining Risks (Honest Statement)

1. **npm audit vulns are build-time only** — proven via `npm ls`, but must be
   re-verified after every `npm install`.
2. **Growth direct insert** — see above.
3. **Superwall SDK** — wraps native StoreKit/BillingClient; IAP receipt
   validation happens server-side in Superwall's infra, not ours.
4. **No CSP headers** — web exports don't set Content-Security-Policy. Fork
   owners deploying to web must add their own.
5. **AsyncStorage on web** — tokens are in JS-accessible storage. Acceptable for
   mobile-first apps; web forks should evaluate IndexedDB encryption.

---

## How to Add a New Gate

1. Add a check section to `scripts/security-audit.js` with `pass()` / `fail()`.
2. Document it in this file with its policy level.
3. The `verify:security` npm script will automatically include it.

---

_Last updated: security audit v2, 21 checks passing._
