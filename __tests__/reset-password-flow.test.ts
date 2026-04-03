/**
 * Reset Password Flow Tests — Fail-First
 *
 * These tests define the contract for the token-hash native recovery flow.
 * Every test starts RED (failing against current code) and turns GREEN
 * as the migration is implemented.
 *
 * Groups:
 *   A: Source-shape — reset-password.tsx owns recovery
 *   B: Source-shape — provider exposes verifyRecoveryToken
 *   C: Source-shape — callback no longer owns recovery destination
 *   D: Behavior — module mocks for screen logic
 */

import * as fs from "fs";
import * as path from "path";

// ── Helpers ──────────────────────────────────────────────────────────────────

const readSource = (relativePath: string) =>
  fs.readFileSync(path.resolve(relativePath), "utf8");

// ── Group A: reset-password.tsx owns recovery ────────────────────────────────

describe("Token-hash recovery: reset-password.tsx contract", () => {
  const getSource = () => readSource("app/auth/reset-password.tsx");

  it("A1: should import useLocalSearchParams", () => {
    expect(getSource()).toContain("useLocalSearchParams");
  });

  it("A2: should call verifyRecoveryToken", () => {
    const source = getSource();
    const hasVerify =
      source.includes("verifyRecoveryToken") || source.includes("verifyOtp");
    expect(hasVerify).toBe(true);
  });

  it("A3: should have a 'verifying' screen state", () => {
    expect(getSource()).toContain('"verifying"');
  });

  it("A4: should have an 'invalid-link' screen state", () => {
    expect(getSource()).toContain('"invalid-link"');
  });

  it("A5: should NOT assume session is pre-established by callback", () => {
    expect(getSource()).not.toContain(
      "Session exchange is handled by auth/callback"
    );
  });
});

// ── Group B: provider exposes verifyRecoveryToken ────────────────────────────

describe("Token-hash recovery: provider contract", () => {
  it("B1: authClient.ts should declare verifyRecoveryToken", () => {
    const source = readSource("src/features/auth/authClient.ts");
    expect(source).toContain("verifyRecoveryToken");
  });

  it("B2: supabase.ts should implement verifyRecoveryToken", () => {
    const source = readSource("src/features/auth/providers/supabase.ts");
    expect(source).toContain("verifyRecoveryToken");
  });

  it("B3: supabase.ts should call verifyOtp with type recovery", () => {
    const source = readSource("src/features/auth/providers/supabase.ts");
    const hasRecoveryType =
      source.includes("type: 'recovery'") ||
      source.includes('type: "recovery"');
    expect(hasRecoveryType).toBe(true);
  });
});

// ── Group C: callback no longer owns recovery destination ────────────────────

describe("Token-hash recovery: redirect contract", () => {
  it("C1: resetPasswordForEmail should redirect to auth/reset-password", () => {
    const source = readSource("src/features/auth/providers/supabase.ts");
    // Extract only the resetPasswordForEmail method body to avoid false
    // positives from OAuth code that still uses auth/callback.
    const methodStart = source.indexOf("async resetPasswordForEmail");
    const methodEnd = source.indexOf("async updatePassword", methodStart);
    const methodBody = source.slice(methodStart, methodEnd);
    expect(methodBody).toContain("://auth/reset-password");
  });

  it("C2: resetPasswordForEmail should NOT redirect to auth/callback", () => {
    const source = readSource("src/features/auth/providers/supabase.ts");
    const methodStart = source.indexOf("async resetPasswordForEmail");
    const methodEnd = source.indexOf("async updatePassword", methodStart);
    const methodBody = source.slice(methodStart, methodEnd);
    expect(methodBody).not.toContain("://auth/callback");
  });
});
