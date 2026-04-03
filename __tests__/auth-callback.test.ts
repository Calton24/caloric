/**
 * Auth Callback Flow Tests
 *
 * Tests the callback decision logic end-to-end:
 *   - error params → error
 *   - missing code → error
 *   - valid code → exchange action
 *   - recovery destination from isRecovery flag
 *   - non-recovery → tabs
 *   - index.tsx does NOT handle deep links
 *   - reset-password.tsx does NOT exchange codes
 *
 * Architecture contract:
 *   /auth/callback  → parse + exchange + route (destination from SDK, not URL)
 *   /auth/reset-password → pure password form
 *   /index → auth-based routing only (no Linking)
 */

import {
    CallbackParams,
    resolveCallbackAction,
    resolveDestination,
} from "../src/features/auth/callback-logic";

// ── Decision Logic ──────────────────────────────────────────────────────────

describe("Auth Callback: resolveCallbackAction", () => {
  it("returns exchange action with code when code present", () => {
    const params: CallbackParams = { code: "abc123" };
    const result = resolveCallbackAction(params);

    expect(result).toEqual({
      action: "exchange",
      code: "abc123",
    });
  });

  it("returns exchange action regardless of type param", () => {
    const params: CallbackParams = { code: "abc123", type: "recovery" };
    const result = resolveCallbackAction(params);

    expect(result).toEqual({
      action: "exchange",
      code: "abc123",
    });
  });

  it("returns error when code is missing", () => {
    const params: CallbackParams = {};
    const result = resolveCallbackAction(params);

    expect(result.action).toBe("error");
  });

  it("returns error with Supabase error_description", () => {
    const params: CallbackParams = {
      error_code: "otp_expired",
      error_description: "Email link is invalid or has expired",
    };
    const result = resolveCallbackAction(params);

    expect(result).toEqual({
      action: "error",
      message: "Email link is invalid or has expired",
    });
  });

  it("returns error with fallback message when only error_code present", () => {
    const params: CallbackParams = { error_code: "access_denied" };
    const result = resolveCallbackAction(params);

    expect(result).toEqual({
      action: "error",
      message: "Invalid or expired link",
    });
  });

  it("error params take priority over code", () => {
    const params: CallbackParams = {
      code: "abc123",
      error_code: "otp_expired",
      error_description: "Link expired",
    };
    const result = resolveCallbackAction(params);

    expect(result.action).toBe("error");
    expect((result as any).message).toBe("Link expired");
  });

  it("preserves the exact code string for exchange", () => {
    const params: CallbackParams = {
      code: "pkce_verifier_abc_123_xyz",
    };
    const result = resolveCallbackAction(params);

    expect(result.action).toBe("exchange");
    expect((result as any).code).toBe("pkce_verifier_abc_123_xyz");
  });
});

// ── Destination Logic ───────────────────────────────────────────────────────

describe("Auth Callback: resolveDestination", () => {
  it("routes to /auth/reset-password when isRecovery is true", () => {
    expect(resolveDestination(true)).toBe("/auth/reset-password");
  });

  it("routes to /(tabs) when isRecovery is false", () => {
    expect(resolveDestination(false)).toBe("/(tabs)");
  });
});

// ── Architecture Contract Tests ─────────────────────────────────────────────

describe("Auth Architecture: index.tsx", () => {
  it("should NOT contain any Linking imports", () => {
    const fs = require("fs");
    const source = fs.readFileSync("app/index.tsx", "utf8");

    expect(source).not.toContain("expo-linking");
    expect(source).not.toContain("Linking.getInitialURL");
    expect(source).not.toContain("Linking.addEventListener");
    expect(source).not.toContain("parseDeepLink");
  });

  it("should NOT contain useEffect for URL handling", () => {
    const fs = require("fs");
    const source = fs.readFileSync("app/index.tsx", "utf8");

    expect(source).not.toContain("useEffect");
    expect(source).not.toContain("getInitialURL");
  });

  it("should only use declarative Redirect for routing", () => {
    const fs = require("fs");
    const source = fs.readFileSync("app/index.tsx", "utf8");

    expect(source).toContain("Redirect");
    expect(source).not.toContain("router.replace");
    expect(source).not.toContain("router.push");
  });
});

describe("Auth Architecture: reset-password.tsx", () => {
  it("should parse token_hash from route params", () => {
    const fs = require("fs");
    const source = fs.readFileSync("app/auth/reset-password.tsx", "utf8");

    expect(source).toContain("useLocalSearchParams");
    expect(source).toContain("token_hash");
  });

  it("should verify token before showing form", () => {
    const fs = require("fs");
    const source = fs.readFileSync("app/auth/reset-password.tsx", "utf8");

    expect(source).toContain("verifyRecoveryToken");
  });

  it("should call updatePassword for form submission", () => {
    const fs = require("fs");
    const source = fs.readFileSync("app/auth/reset-password.tsx", "utf8");

    expect(source).toContain("updatePassword");
  });
});

describe("Auth Architecture: callback.tsx", () => {
  it("should exist and handle code exchange", () => {
    const fs = require("fs");
    const source = fs.readFileSync("app/auth/callback.tsx", "utf8");

    expect(source).toContain("exchangeCodeForSession");
    expect(source).toContain("useLocalSearchParams");
  });

  it("should use resolveDestination with isRecovery from SDK", () => {
    const fs = require("fs");
    const source = fs.readFileSync("app/auth/callback.tsx", "utf8");

    expect(source).toContain("resolveDestination");
    expect(source).toContain("isRecovery");
  });

  it("should be registered in the root layout", () => {
    const fs = require("fs");
    const source = fs.readFileSync("app/_layout.tsx", "utf8");

    expect(source).toContain('"auth/callback"');
  });

  it("should use resolveCallbackAction for decision logic", () => {
    const fs = require("fs");
    const source = fs.readFileSync("app/auth/callback.tsx", "utf8");

    expect(source).toContain("resolveCallbackAction");
  });
});

describe("Auth Architecture: supabase provider", () => {
  it("resetPasswordForEmail should redirect to auth/reset-password", () => {
    const fs = require("fs");
    const source = fs.readFileSync(
      "src/features/auth/providers/supabase.ts",
      "utf8"
    );

    // Extract only the resetPasswordForEmail method body
    const methodStart = source.indexOf("async resetPasswordForEmail");
    const methodEnd = source.indexOf("async updatePassword", methodStart);
    const methodBody = source.slice(methodStart, methodEnd);

    expect(methodBody).toContain("://auth/reset-password");
  });

  it("exchangeCodeForSession should return isRecovery", () => {
    const fs = require("fs");
    const source = fs.readFileSync(
      "src/features/auth/providers/supabase.ts",
      "utf8"
    );

    expect(source).toContain("isRecovery");
    expect(source).toContain("PASSWORD_RECOVERY");
  });
});
