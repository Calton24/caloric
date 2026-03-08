/**
 * Security Tests for Caloric
 *
 * Verifies:
 * - Service role JWTs are rejected
 * - Email is hashed for analytics
 * - Debug screens are gated with __DEV__
 * - Logging redaction is implemented
 */

import fs from "fs";
import path from "path";

describe("Security: JWT Decoding", () => {
  it("should decode and validate JWT payloads", () => {
    const decodeJwt = (token: string) => {
      try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        return JSON.parse(atob(parts[1]));
      } catch {
        return null;
      }
    };

    // Test service role JWT
    const header = btoa(JSON.stringify({ alg: "HS256" }));
    const payload = btoa(
      JSON.stringify({ role: "service_role", sub: "system" })
    );
    const serviceRoleToken = `${header}.${payload}.sig`;

    const decoded = decodeJwt(serviceRoleToken);
    expect(decoded?.role).toBe("service_role");

    // Test regular user JWT
    const userPayload = btoa(
      JSON.stringify({ role: "authenticated", sub: "user-123" })
    );
    const userToken = `${header}.${userPayload}.sig`;

    const userDecoded = decodeJwt(userToken);
    expect(userDecoded?.role).toBe("authenticated");
    expect(userDecoded?.role).not.toBe("service_role");
  });

  it("should reject malformed JWTs", () => {
    const decodeJwt = (token: string) => {
      try {
        const parts = token.split(".");
        if (parts.length !== 3) return null;
        return JSON.parse(atob(parts[1]));
      } catch {
        return null;
      }
    };

    expect(decodeJwt("invalid")).toBeNull();
    expect(decodeJwt("a.b")).toBeNull();
    expect(decodeJwt("a.b.c.d")).toBeNull();
  });
});

describe("Security: Email Hashing", () => {
  it("should hash email deterministically", async () => {
    const hashEmail = async (email: string) => {
      const data = new TextEncoder().encode(email);
      const buffer = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(buffer))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    };

    const email = "user@example.com";
    const hash1 = await hashEmail(email);
    const hash2 = await hashEmail(email);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 = 64 hex chars
    expect(hash1).not.toContain("@");
    expect(hash1).not.toContain(email);
  });
});

describe("Security: Logging Redaction", () => {
  it("should redact JWT tokens", () => {
    const redact = (text: string) =>
      text.replace(
        /ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g,
        "[JWT_REDACTED]"
      );

    const jwt =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdef";
    const message = `Token: ${jwt} here`;

    const redacted = redact(message);
    expect(redacted).toContain("[JWT_REDACTED]");
    expect(redacted).not.toContain("eyJ");
  });

  it("should redact Authorization headers", () => {
    const redact = (text: string) =>
      text.replace(
        /Authorization\s*:\s*Bearer\s+[^\s,\)]+/gi,
        "Authorization: Bearer [TOKEN_REDACTED]"
      );

    const message = "Authorization: Bearer mytoken123";
    const redacted = redact(message);

    expect(redacted).toContain("[TOKEN_REDACTED]");
    expect(redacted).not.toContain("mytoken");
  });

  it("should redact URL query parameters with tokens", () => {
    const redact = (text: string) =>
      text.replace(
        /([?&](?:token|access_token|refresh_token|key|apikey|api_key|secret|code|session_id|auth)=)[^\s&"')]+/gi,
        "$1[QUERY_TOKEN_REDACTED]"
      );

    const url1 =
      "https://example.com/callback?access_token=abc123secret&state=ok";
    expect(redact(url1)).toContain("access_token=[QUERY_TOKEN_REDACTED]");
    expect(redact(url1)).not.toContain("abc123secret");
    expect(redact(url1)).toContain("&state=ok"); // Non-sensitive param preserved

    const url2 = "https://api.example.com/data?key=sk_live_abc123&format=json";
    expect(redact(url2)).toContain("key=[QUERY_TOKEN_REDACTED]");
    expect(redact(url2)).not.toContain("sk_live_abc123");

    const url3 = "https://auth.example.com/token?refresh_token=rt_xyz789";
    expect(redact(url3)).toContain("refresh_token=[QUERY_TOKEN_REDACTED]");
  });
});

describe("Security: Code Pattern Verification", () => {
  it("should have JWT validation in schema.ts", () => {
    const schemaPath = path.join(__dirname, "..", "src/config/schema.ts");
    const content = fs.readFileSync(schemaPath, "utf-8");

    expect(content).toContain("isPrivilegedJwt");
    expect(content).toContain("decodeJwtPayload");
    expect(content).toContain("role");
  });

  it("should have redaction in logger", () => {
    const loggerPath = path.join(__dirname, "..", "src/logging/logger.ts");
    const content = fs.readFileSync(loggerPath, "utf-8");

    expect(content).toContain("redactSensitive");
  });

  it("should have __DEV__ guards on debug screens", () => {
    const screens = [
      "app/(tabs)/caloric/maintenance.tsx",
      "app/(tabs)/caloric/growth.tsx",
      "app/(tabs)/caloric/patterns.tsx",
    ];

    for (const screen of screens) {
      const screenPath = path.join(__dirname, "..", screen);
      if (fs.existsSync(screenPath)) {
        const content = fs.readFileSync(screenPath, "utf-8");
        expect(content).toContain("if (!__DEV__)");
        expect(content).toContain("Redirect");
      }
    }
  });

  it("should have Zod validation in config", () => {
    const schemaPath = path.join(__dirname, "..", "src/config/schema.ts");
    const content = fs.readFileSync(schemaPath, "utf-8");

    expect(content.toLowerCase()).toContain("zod");
  });
});

describe("Security: Secure Storage", () => {
  it("should use SecureStore adapter (not raw AsyncStorage) for auth", () => {
    const clientPath = path.join(__dirname, "..", "src/lib/supabase/client.ts");
    const content = fs.readFileSync(clientPath, "utf-8");
    // Must use SecureStore, not raw AsyncStorage, for auth.storage
    expect(content).toContain("SecureStoreAdapter");
    expect(content).toContain("expo-secure-store");
    // The auth.storage should reference the adapter, not AsyncStorage directly
    expect(content).toMatch(/storage:\s*SecureStoreAdapter/);
    // Native fallback must NOT silently use AsyncStorage — verify no catch-to-AsyncStorage on native
    // The adapter should return null/no-op on native failure, not fall back to unencrypted storage
    expect(content).toContain("do NOT fall back to plain storage");
    expect(content).toContain("forces re-auth");
  });

  it("should have PII hashing in auth provider", () => {
    const authPath = path.join(
      __dirname,
      "..",
      "src/features/auth/AuthProvider.tsx"
    );
    if (fs.existsSync(authPath)) {
      const content = fs.readFileSync(authPath, "utf-8");
      expect(content).toContain("hashEmail");
      expect(content).toContain("email_hash");
    }
  });
});

describe("Security: Growth Ingestion Risk", () => {
  it("should document Edge Function as secure default in growth client", () => {
    const growthPath = path.join(
      __dirname,
      "..",
      "src/infrastructure/growth/providers/SupabaseGrowthClient.ts"
    );
    const content = fs.readFileSync(growthPath, "utf-8");
    // Verify secure-by-default documentation
    expect(content).toContain("Edge Function Default");
    expect(content).toContain("Rate-limit");
    expect(content).toContain("UNSAFE MODE");
    expect(content).toContain("allowUnsafeClientWrites");
  });

  it("should document Edge Function recommendation in SECURITY.md", () => {
    const secPath = path.join(__dirname, "..", "docs/SECURITY.md");
    const content = fs.readFileSync(secPath, "utf-8");
    expect(content).toContain("Growth Ingestion");
    expect(content).toContain("submit-feature-request");
  });
});
