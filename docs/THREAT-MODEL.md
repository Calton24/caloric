# Threat Model: Mobile Core

> **Purpose:** Define what attackers want, where they can touch the system, and
> what "catastrophic" looks like. This is the reference for prioritizing
> security work.

_Last updated: 2026-02-25_

---

## Attack Surface

| Surface                    | Access              | Notes                                                   |
| -------------------------- | ------------------- | ------------------------------------------------------- |
| Client bundle (JS)         | Public              | Metro bundle is downloadable; assume reverse-engineered |
| AsyncStorage / SecureStore | Device              | Physical access or debugger can dump                    |
| Supabase API (anon key)    | Public              | Row-level security + anon key = visible attack surface  |
| Edge Functions             | Public (via client) | Same as API, but with server logic                      |
| Deep links / URL schemes   | Public              | Universal links, expo-linking                           |
| Push notifications         | Remote trigger      | FCM/APNs tokens are per-device                          |
| CI/CD runners              | Trusted zone        | Compromise = supply chain attack                        |

---

## Threat Catalog

### T1: Token Theft

**What the attacker wants:** Steal a user's JWT to impersonate them.

**Attack vectors:**

- Logs (console.log leaking tokens)
- Insecure storage (AsyncStorage on native)
- Deep link callback sniffing
- Man-in-the-middle (certificate pinning absent)

**Impact:** Full account takeover. Attacker can read/write as the user.

**Mitigations:**
| Control | Status | Owner |
|---------|--------|-------|
| Redacting logger (`redactSensitive`) | ✅ Implemented | Platform |
| SecureStore on native (no fallback) | ✅ Implemented | Platform |
| Certificate pinning | ⬜ Not implemented | Fork owners |
| Deep link state validation | ⬜ Not implemented | Fork owners |

**Residual risk:** Medium — deep links and MITM still open.

---

### T2: Remote Config Abuse

**What the attacker wants:** Manipulate feature flags / maintenance mode to
disrupt the app or unlock paid features.

**Attack vectors:**

- Forge remote config response (if not using HTTPS + pinning)
- Compromise Supabase project (credential leak)
- Modify local config cache

**Impact:** App enters wrong state, features unlocked/locked incorrectly.

**Mitigations:**
| Control | Status | Owner |
|---------|--------|-------|
| HTTPS for remote config | ✅ Default | Platform |
| RLS on remote_config table | ⬜ Fork owners must set up | Fork |
| Local cache validation | ✅ Implemented | Platform |
| Maintenance state signature | ⬜ Not implemented | Future |

**Residual risk:** Low-Medium — depends on fork's RLS setup.

---

### T3: Growth Ingestion Spam

**What the attacker wants:** Flood the `feature_requests` table to:

- Drive up Supabase costs (denial-of-wallet)
- Pollute data with garbage
- Disrupt product team's signal

**Attack vectors:**

- Scripted calls to Supabase insert endpoint
- Replay of valid payloads

**Impact:** Financial (Supabase billing), operational (garbage data).

**Mitigations:**
| Control | Status | Owner |
|---------|--------|-------|
| Client-side cooldown | ✅ Implemented | Platform |
| Client-side dedupe (hash) | ✅ Implemented | Platform |
| Server-side rate limit | ⬜ Requires Edge Function | Fork |
| Edge Function ingestion | ✅ Default (v2) | Platform |
| Opt-in raw insert (`allowUnsafeClientWrites`) | ✅ Implemented | Platform |

**Residual risk:** Low — if Edge Function is used. High if `allowUnsafeClientWrites` is enabled.

---

### T4: Payment State Spoofing

**What the attacker wants:** Trick the app into thinking the user has "pro"
access without paying.

**Attack vectors:**

- Modify local entitlement cache
- Forge Superwall/Stripe webhook (server-side, not client)
- Reverse-engineer client to skip paywall check

**Impact:** Revenue loss. Possible legal (EULA bypass).

**Mitigations:**
| Control | Status | Owner |
|---------|--------|-------|
| Entitlement source-of-truth on server | ✅ Superwall/Stripe DB | Provider |
| Client re-fetches entitlements on cold start | ✅ Implemented | Platform |
| Receipt validation (StoreKit 2 / Play Billing) | ✅ Provider handles | Provider |
| Obfuscation / anti-tamper | ⬜ Not implemented | Fork owners |

**Residual risk:** Low — client cache can be spoofed locally, but backend is authoritative.

---

### T5: Account Takeover

**What the attacker wants:** Gain access to another user's account.

**Attack vectors:**

- Credential stuffing (weak passwords)
- OAuth token hijack (deep link race)
- Magic link interception (email compromise)
- Session fixation (refresh token reuse)

**Impact:** Full account compromise.

**Mitigations:**
| Control | Status | Owner |
|---------|--------|-------|
| Supabase Auth (bcrypt, JWTs, refresh rotation) | ✅ Default | Supabase |
| Magic link expiry (1 hour) | ✅ Default | Supabase |
| OAuth PKCE flow | ✅ Default | Supabase |
| MFA | ⬜ Fork owners must enable | Fork |
| Rate limiting on auth endpoints | ✅ Supabase built-in | Supabase |

**Residual risk:** Low — depends on Supabase configuration.

---

### T6: Data Exfiltration via RLS Misconfiguration

**What the attacker wants:** Read or export data belonging to other users.

**Attack vectors:**

- Missing RLS policies (table exposed to anon)
- Overly broad SELECT policies
- Storage bucket misconfiguration (public URLs)

**Impact:** Data breach. GDPR/legal liability.

**Mitigations:**
| Control | Status | Owner |
|---------|--------|-------|
| RLS enabled by default in templates | ✅ Documented | Platform |
| Security audit script checks for banned imports | ✅ Implemented | Platform |
| Storage bucket policies | ⬜ Fork owners must configure | Fork |
| Automated RLS policy testing | ⬜ Not implemented | Future |

**Residual risk:** Medium — relies on fork owners setting up RLS correctly.

---

## Catastrophic Scenarios

| Scenario                                       | Likelihood      | Impact   | Detection             |
| ---------------------------------------------- | --------------- | -------- | --------------------- |
| JWT leaked in logs → mass account takeover     | Low (mitigated) | Critical | Sentry error spike    |
| Growth spam → $10k+ Supabase bill              | Medium          | High     | Billing alert         |
| RLS misconfiguration → data breach             | Medium          | Critical | Manual audit          |
| Supply chain attack → malicious code in bundle | Low             | Critical | Dependabot + lockfile |
| Auth provider compromise                       | Very Low        | Critical | Supabase status page  |

---

## Owners

| Area                                | Owner                    |
| ----------------------------------- | ------------------------ |
| Platform security (this repo)       | @Calton24                |
| Fork-specific RLS / storage         | Fork maintainers         |
| Supabase infrastructure             | Supabase + project admin |
| Payment provider (Stripe/Superwall) | Provider + project admin |

---

## Review Cadence

- **Monthly:** Review Dependabot PRs, npm audit output
- **Quarterly:** Re-assess threat catalog, update residual risk ratings
- **Per-release:** Run `npm run mobile-core:verify:security` (blocking)

---

## References

- [SECURITY-DONE-GATE.md](./SECURITY-DONE-GATE.md) — CI gate checklist
- [SECURITY.md](./SECURITY.md) — Implementation details
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
