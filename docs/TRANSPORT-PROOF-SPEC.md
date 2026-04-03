# Transport Proof Spec — Token-Hash Param Delivery

**Purpose:** Prove that Expo Router delivers deep-link query params to
`app/auth/reset-password.tsx` before any production code is changed.
This is the go/no-go gate for Option B (native token-hash recovery).

**Rollback condition:** If any of the 7 conditions below fails on-device
in the warm-app case, **abandon Option B immediately** and do not proceed
with migration. Do not partially implement.

---

## What is being proved

A deep link of the form

```
caloric://auth/reset-password?token_hash=PROBE_abc123&type=recovery
```

must reach the `ResetPasswordScreen` component with both params intact,
**without** transiting through `auth/callback`, **without** triggering the
`(tabs)` auth-guard redirect to landing, and **without** any intermediate
route rendering first.

---

## 7 Required Conditions

Every condition must pass. One failure = stop.

| #   | Condition                                           | How it is checked                                                                                            |
| --- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | App is already warm/open (foreground or background) | Tester opens the app, then taps the link from a mail client or `xcrun simctl openurl` / `adb shell am start` |
| 2   | Link opens native `auth/reset-password` route       | Proof log prints `[TransportProof] route=auth/reset-password`                                                |
| 3   | `token_hash` param exists and is non-empty          | Proof log prints `[TransportProof] token_hash=PROBE_` (first 6 chars only)                                   |
| 4   | `type` param equals `"recovery"`                    | Proof log prints `[TransportProof] type=recovery`                                                            |
| 5   | Route does NOT bounce through landing               | No `[TransportProof] UNEXPECTED_ROUTE` log from the landing screen guard                                     |
| 6   | No `auth/callback` route is involved                | No `[AuthCallback]` log fires during the flow                                                                |
| 7   | No protected-route redirect fires first             | No `Redirect` component renders before `ResetPasswordScreen` mounts (verified by mount-order log)            |

---

## Redaction Rules

All temporary proof logs **must** redact token values:

```
✅  [TransportProof] token_hash=PROBE_ (6 chars shown)
✅  [TransportProof] token_hash=[REDACTED]
❌  [TransportProof] token_hash=PROBE_abc123
```

Implementation: truncate any param value to its first 6 characters before
logging, or replace entirely with `[REDACTED]`. Never log the full value.

```ts
const redact = (v: string | undefined) =>
  v ? v.slice(0, 6) + "…" : "[absent]";
```

---

## Instrumentation Code

All code below is **temporary** and **must be removed** before any PR
ships to production. Mark every addition with:

```ts
// ── TRANSPORT PROOF — DELETE BEFORE MERGE ──
```

### 1. Proof hook in `app/auth/reset-password.tsx`

Add at the top of `ResetPasswordScreen`, before any other logic:

```ts
// ── TRANSPORT PROOF — DELETE BEFORE MERGE ──
import { useLocalSearchParams } from "expo-router";

// Inside the component:
const probeParams = useLocalSearchParams<{
  token_hash?: string;
  type?: string;
}>();

if (__DEV__) {
  const redact = (v: string | undefined) =>
    v ? v.slice(0, 6) + "…" : "[absent]";
  console.log(
    "[TransportProof] route=auth/reset-password",
    "token_hash=" + redact(probeParams.token_hash),
    "type=" + (probeParams.type ?? "[absent]")
  );
}
// ── END TRANSPORT PROOF ──
```

### 2. Sentinel in `app/(tabs)/_layout.tsx`

Add inside the auth-guard branch that redirects to landing:

```ts
// ── TRANSPORT PROOF — DELETE BEFORE MERGE ──
if (__DEV__) {
  console.warn(
    "[TransportProof] UNEXPECTED_ROUTE: tabs auth-guard fired → landing redirect"
  );
}
// ── END TRANSPORT PROOF ──
```

### 3. Sentinel in `app/(onboarding)/_layout.tsx`

Same pattern if there is a redirect guard:

```ts
// ── TRANSPORT PROOF — DELETE BEFORE MERGE ──
if (__DEV__) {
  console.warn("[TransportProof] UNEXPECTED_ROUTE: onboarding guard redirect");
}
// ── END TRANSPORT PROOF ──
```

### 4. Existing callback log is sufficient

`app/auth/callback.tsx` already logs `[AuthCallback] params:` in `__DEV__`.
If this log fires during the proof, condition 6 fails. No new code needed.

---

## Test Procedure

### Warm-app test (primary — this is the go/no-go)

1. Build a development client: `npx expo run:ios` or `npx expo run:android`
2. Open the app and sign in (or stay on any authenticated screen)
3. Keep the app in the foreground
4. From a **separate terminal**, fire the deep link:

   **iOS Simulator:**

   ```bash
   xcrun simctl openurl booted "caloric://auth/reset-password?token_hash=PROBE_abc123&type=recovery"
   ```

   **Android Emulator:**

   ```bash
   adb shell am start -a android.intent.action.VIEW \
     -d "caloric://auth/reset-password?token_hash=PROBE_abc123&type=recovery" \
     com.calton24.caloric
   ```

5. Check Metro logs for:
   ```
   [TransportProof] route=auth/reset-password token_hash=PROBE_… type=recovery
   ```
6. Confirm **none** of these appear:
   ```
   [TransportProof] UNEXPECTED_ROUTE: ...
   [AuthCallback] params: ...
   ```

### Cold-start test (secondary)

1. Kill the app completely
2. Fire the deep link from terminal
3. Same log checks as above

### Background test (secondary)

1. Open the app, press Home to background it
2. Fire the deep link from terminal
3. Same log checks as above

---

## Pass / Fail Decision

| Result                            | Action                                                                               |
| --------------------------------- | ------------------------------------------------------------------------------------ |
| All 7 conditions pass on warm-app | **PROCEED** — move to fail-first tests                                               |
| Any condition fails on warm-app   | **STOP** — abandon Option B, file findings                                           |
| Warm passes but cold-start fails  | **PROCEED with caution** — investigate cold-start separately, do not block migration |

---

## Cleanup Checklist

Before any PR ships:

- [ ] Remove `useLocalSearchParams` import and probe logging from `reset-password.tsx`
- [ ] Remove `UNEXPECTED_ROUTE` sentinel from `(tabs)/_layout.tsx`
- [ ] Remove `UNEXPECTED_ROUTE` sentinel from `(onboarding)/_layout.tsx`
- [ ] Search codebase for `TRANSPORT PROOF` — zero results
- [ ] Search codebase for `TransportProof` — zero results
