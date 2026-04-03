# Fail-First Test Matrix — Token-Hash Recovery Migration

**Purpose:** Define every test that must be written **before** any production
code changes. Each test starts RED (failing against current code), and the
migration is complete when all are GREEN.

**Prerequisite:** Transport proof (docs/TRANSPORT-PROOF-SPEC.md) must pass
before these tests are written into the codebase.

---

## File Layout

| File                                       | Purpose                                                       | New or Modified |
| ------------------------------------------ | ------------------------------------------------------------- | --------------- |
| `__tests__/reset-password-flow.test.ts`    | Screen-level contract tests for the new token-hash reset flow | **New**         |
| `__tests__/supabase-auth-recovery.test.ts` | Provider-level tests for `verifyOtp` with token_hash          | **New**         |
| `__tests__/auth-callback.test.ts`          | Invert/delete recovery-via-callback assertions                | **Modified**    |

---

## File 1: `__tests__/reset-password-flow.test.ts`

Uses source-shape assertions (matching the repo's existing pattern in
`auth-callback.test.ts`) plus module-mock tests (matching the pattern in
`cloud-vision.test.ts`).

### Tests — Red First, Green After Migration

#### Group A: Source-shape contract (reset-password.tsx owns recovery)

```
A1  "reset-password.tsx SHOULD import useLocalSearchParams"
    → fs.readFileSync('app/auth/reset-password.tsx')
    → expect(source).toContain('useLocalSearchParams')
    → RED now (current file does NOT import it)
    → GREEN after: add useLocalSearchParams to parse token_hash & type

A2  "reset-password.tsx SHOULD call verifyOtp or verifyRecoveryToken"
    → expect(source).toContain('verifyOtp') OR .toContain('verifyRecoveryToken')
    → RED now (no verification in current file)
    → GREEN after: add mount-time verification call

A3  "reset-password.tsx SHOULD have a 'verifying' screen state"
    → expect(source).toContain('"verifying"')
    → RED now (states are only "form" | "success")
    → GREEN after: add verifying + invalid-link states

A4  "reset-password.tsx SHOULD have an 'invalid-link' screen state"
    → expect(source).toContain('"invalid-link"')
    → RED now
    → GREEN after: add error state for bad/missing/expired tokens

A5  "reset-password.tsx SHOULD NOT assume session exists"
    → expect(source).not.toContain('Session exchange is handled by auth/callback')
    → RED now (that exact comment is on line 4)
    → GREEN after: rewrite the file header comment
```

#### Group B: Source-shape contract (provider exposes verifyOtp)

```
B1  "authClient.ts SHOULD declare verifyRecoveryToken in AuthClient interface"
    → fs.readFileSync('src/features/auth/authClient.ts')
    → expect(source).toContain('verifyRecoveryToken')
    → RED now (interface has no such method)
    → GREEN after: add method to AuthClient interface

B2  "supabase.ts provider SHOULD implement verifyRecoveryToken"
    → fs.readFileSync('src/features/auth/providers/supabase.ts')
    → expect(source).toContain('verifyRecoveryToken')
    → RED now
    → GREEN after: implement using supabase.auth.verifyOtp

B3  "supabase.ts provider SHOULD call verifyOtp with type recovery"
    → expect(source).toContain("type: 'recovery'")
    → OR expect(source).toContain('type: "recovery"')
    → RED now
    → GREEN after: implement verifyRecoveryToken
```

#### Group C: Source-shape contract (callback no longer owns recovery destination)

```
C1  "supabase.ts resetPasswordForEmail SHOULD redirect to auth/reset-password"
    → fs.readFileSync('src/features/auth/providers/supabase.ts')
    → expect(source).toContain('://auth/reset-password')
    → RED now (currently points to ://auth/callback)
    → GREEN after: change redirectTo in resetPasswordForEmail

C2  "supabase.ts resetPasswordForEmail SHOULD NOT redirect to auth/callback"
    *** This INVERTS the existing test in auth-callback.test.ts ***
    → expect(source).not.toContain('://auth/callback')
    → RED now (current code has ://auth/callback)
    → GREEN after: change redirectTo
    → NOTE: will fail initially because OAuth may still use callback.
            Narrow assertion: check only within resetPasswordForEmail scope,
            not the whole file. Use regex or extract the function body.
```

#### Group D: Behavior tests (module mocks, following cloud-vision.test.ts pattern)

Mock setup (shared across Group D):

```ts
jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(() => ({
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

jest.mock("../src/features/auth/useAuth", () => ({
  useAuth: jest.fn(),
}));
```

```
D1  "calls verifyRecoveryToken on mount when token_hash and type=recovery are present"
    → mock useLocalSearchParams → { token_hash: "abc", type: "recovery" }
    → mock useAuth → { verifyRecoveryToken: mockFn, updatePassword: mockFn }
    → render ResetPasswordScreen (or call its mount logic)
    → expect(verifyRecoveryToken).toHaveBeenCalledWith("abc")
    → RED now (screen never calls verifyRecoveryToken)

D2  "does NOT call verifyRecoveryToken when token_hash is missing"
    → mock useLocalSearchParams → { type: "recovery" }  (no token_hash)
    → render
    → expect(verifyRecoveryToken).not.toHaveBeenCalled()
    → RED now (screen has no conditional verification logic at all)
    → GREEN after: add param validation guard

D3  "does NOT call verifyRecoveryToken when type is not recovery"
    → mock useLocalSearchParams → { token_hash: "abc", type: "email" }
    → render
    → expect(verifyRecoveryToken).not.toHaveBeenCalled()
    → RED now
    → GREEN after: type guard in mount effect

D4  "shows invalid-link state when verifyRecoveryToken fails"
    → mock verifyRecoveryToken → resolves { error: new Error("expired") }
    → render, await
    → expect screen text to contain "expired" or "invalid"
    → RED now (no such state exists)

D5  "updatePassword is NOT callable before verifyRecoveryToken succeeds"
    → mock verifyRecoveryToken → resolves { error: new Error("fail") }
    → render, await
    → simulate password entry and submit
    → expect(updatePassword).not.toHaveBeenCalled()
    → RED now (current screen always allows updatePassword)

D6  "updatePassword IS callable after verifyRecoveryToken succeeds"
    → mock verifyRecoveryToken → resolves { error: null, session: {...} }
    → render, await
    → simulate password entry ("NewPass1", "NewPass1") and submit
    → expect(updatePassword).toHaveBeenCalledWith("NewPass1")
    → RED now (mount-time verification doesn't exist yet)

D7  "shows verifying spinner before verification completes"
    → mock verifyRecoveryToken → returns a pending promise (never resolves during test)
    → render
    → expect loading indicator or "Verifying" text to be visible
    → RED now (no verifying state)
```

### Red-to-Green Sequence for File 1

```
Phase    Tests      What makes them green
─────    ──────     ────────────────────────────────
RED      A1–A5      Nothing — current code fails all
RED      B1–B3      Nothing — provider has no verifyRecoveryToken
RED      C1–C2      Nothing — redirect still points to callback
RED      D1–D7      Nothing — no mount verification logic

GREEN-1  B1–B3      Add verifyRecoveryToken to authClient + supabase provider
GREEN-2  A1–A5      Rewrite reset-password.tsx: add param parsing, states, verification
GREEN-3  D1–D7      Same rewrite makes behavior tests pass
GREEN-4  C1–C2      Change resetPasswordForEmail redirectTo
```

---

## File 2: `__tests__/supabase-auth-recovery.test.ts`

Pure provider-level tests. No React rendering, no expo-router.
Mocks only `getSupabaseClient`.

```
P1  "verifyRecoveryToken calls supabase.auth.verifyOtp with token_hash and type recovery"
    → mock getSupabaseClient → { auth: { verifyOtp: jest.fn().mockResolvedValue({ data: { session: {} }, error: null }) } }
    → const provider = new SupabaseAuthClient()
    → await provider.verifyRecoveryToken("abc123")
    → expect(verifyOtp).toHaveBeenCalledWith({ token_hash: "abc123", type: "recovery" })
    → RED now (method doesn't exist)

P2  "verifyRecoveryToken returns error when verifyOtp fails"
    → mock verifyOtp → { data: null, error: { message: "Token expired" } }
    → result = await provider.verifyRecoveryToken("bad_token")
    → expect(result.error).toBeInstanceOf(Error)
    → expect(result.error.message).toBe("Token expired")
    → RED now

P3  "verifyRecoveryToken returns session on success"
    → mock verifyOtp → { data: { session: { user: { id: "u1" } } }, error: null }
    → result = await provider.verifyRecoveryToken("good_token")
    → expect(result.error).toBeNull()
    → expect(result.session).toBeTruthy()
    → RED now

P4  "verifyRecoveryToken never logs or exposes the raw token_hash"
    → spy on console.log, console.warn, console.error
    → await provider.verifyRecoveryToken("secret_xyz_123")
    → for each spy: expect not toHaveBeenCalledWith(expect.stringContaining("secret_xyz_123"))
    → RED/GREEN depends on implementation (write defensively)

P5  "verifyRecoveryToken catches thrown exceptions"
    → mock verifyOtp → throws new Error("network failure")
    → result = await provider.verifyRecoveryToken("abc")
    → expect(result.error.message).toBe("network failure")
    → RED now
```

### Red-to-Green Sequence for File 2

```
Phase    Tests    What makes them green
─────    ─────   ────────────────────────
RED      P1–P5   Method doesn't exist on provider
GREEN    P1–P5   Implement verifyRecoveryToken in supabase.ts
```

---

## File 3: `__tests__/auth-callback.test.ts` — Modifications

### Tests to DELETE (they encode the old architecture)

```
DELETE-1  "Auth Architecture: reset-password.tsx → should NOT exchange codes itself"
          (lines ~144-151)
          Reason: after migration, reset-password WILL use useLocalSearchParams

DELETE-2  "Auth Architecture: reset-password.tsx → should NOT have exchanging/error screen states"
          (lines ~153-159)
          Reason: reset-password WILL have verifying/invalid-link states

DELETE-3  "Auth Architecture: supabase provider → redirectTo should point to /auth/callback"
          (lines ~202-212) — specifically the assertion:
            expect(source).toContain('://auth/callback')
            expect(source).not.toContain('://auth/reset-password')
          Reason: after migration, redirectTo points to reset-password
```

### Tests to KEEP (still valid)

```
KEEP  "resolveCallbackAction" — all 6 tests (lines ~28-97)
      Reason: callback still exists for OAuth, decision logic unchanged

KEEP  "resolveDestination" — both tests (lines ~101-108)
      Reason: if callback receives a recovery code somehow, routing still works as fallback
      (or delete if callback is fully stripped of recovery logic — decide during implementation)

KEEP  "Auth Architecture: index.tsx" — all 3 tests (lines ~112-140)
      Reason: index.tsx is unchanged

KEEP  "Auth Architecture: callback.tsx → should exist and handle code exchange" (line ~170)
      Reason: callback still exists for OAuth

KEEP  "Auth Architecture: callback.tsx → should be registered in root layout" (line ~184)
      Reason: still true

KEEP  "reset-password.tsx → should call updatePassword" (line ~161)
      Reason: still true after migration

KEEP  "supabase provider → exchangeCodeForSession should return isRecovery" (line ~218)
      Reason: still true for OAuth-initiated recovery edge case
```

### Tests to ADD (new contract assertions)

```
ADD-1  "Auth Architecture: reset-password.tsx → should parse token_hash from route params"
       → Same source-shape style
       → expect(source).toContain('useLocalSearchParams')
       → expect(source).toContain('token_hash')
       → This replaces DELETE-1

ADD-2  "Auth Architecture: reset-password.tsx → should verify token before showing form"
       → expect(source).toContain('verifyRecoveryToken')

ADD-3  "Auth Architecture: supabase provider → resetPasswordForEmail should redirect to reset-password"
       → expect(source).toContain('://auth/reset-password')
       → This replaces part of DELETE-3
```

---

## Overall Red-to-Green Sequence

```
Step  Action                                                    Tests affected
────  ──────                                                    ──────────────
 0    Write all tests in files 1 and 2                          All RED
 1    Run tests, confirm all new tests FAIL                     All RED ✓
 2    Implement verifyRecoveryToken in authClient + provider    B1-B3, P1-P5 → GREEN
 3    Rewrite reset-password.tsx with token parsing + gating    A1-A5, D1-D7 → GREEN
 4    Change resetPasswordForEmail redirectTo                   C1-C2 → GREEN
 5    Modify auth-callback.test.ts (delete/add per above)       DELETE-1/2/3, ADD-1/2/3
 6    Run full test suite                                       All GREEN
 7    Manual device verification per transport proof spec       Conditions 1-7
```

---

## Token Safety in Tests

- Test fixtures use obviously-fake tokens: `"PROBE_abc123"`, `"test_token"`, `"bad_token"`
- No real Supabase tokens appear in any test file
- P4 explicitly asserts that `verifyRecoveryToken` does not leak the token to console
- No test asserts on the full token value in log output

---

## Abort Condition

If at **step 1** any of the new tests accidentally PASS against the current
codebase, that test is wrong — it does not encode the new contract correctly.
Fix the test before proceeding.

If at **step 6** any old test that was marked KEEP now fails, the migration
broke an unrelated contract. Fix before shipping.
