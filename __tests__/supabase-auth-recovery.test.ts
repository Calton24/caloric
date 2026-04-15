/**
 * Supabase Auth Recovery Tests — Fail-First
 *
 * Provider-level tests for verifyRecoveryToken.
 * No React rendering, no expo-router. Mocks only getSupabaseClient.
 *
 * Every test starts RED (method doesn't exist yet) and turns GREEN
 * after implementation.
 */

// Mock getSupabaseClient before importing the provider
import { SupabaseAuthClient } from "../src/features/auth/providers/supabase";

const mockVerifyOtp = jest.fn();

jest.mock("../src/lib/supabase", () => ({
  getSupabaseClient: () => ({
    auth: {
      verifyOtp: mockVerifyOtp,
      // Stubs for other methods the constructor/class might reference
      signInWithPassword: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      exchangeCodeForSession: jest.fn(),
      signInWithOAuth: jest.fn(),
      signInWithIdToken: jest.fn(),
      getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    functions: { invoke: jest.fn() },
  }),
}));

jest.mock("../src/config", () => ({
  getAppConfig: () => ({
    app: { scheme: "caloric" },
  }),
}));

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
}));

jest.mock("expo-apple-authentication", () => ({
  signInAsync: jest.fn(),
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "mock-uuid"),
  digestStringAsync: jest.fn(async () => "mock-hashed-nonce"),
  CryptoDigestAlgorithm: { SHA256: "SHA-256" },
}));

describe("SupabaseAuthClient.verifyRecoveryToken", () => {
  let client: SupabaseAuthClient;

  beforeEach(() => {
    client = new SupabaseAuthClient();
    mockVerifyOtp.mockReset();
  });

  it("P1: calls supabase.auth.verifyOtp with token_hash and type recovery", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });

    await (client as any).verifyRecoveryToken("abc123");

    expect(mockVerifyOtp).toHaveBeenCalledWith({
      token_hash: "abc123",
      type: "recovery",
    });
  });

  it("P2: returns error when verifyOtp fails", async () => {
    mockVerifyOtp.mockResolvedValue({
      data: null,
      error: { message: "Token expired" },
    });

    const result = await (client as any).verifyRecoveryToken("bad_token");

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe("Token expired");
  });

  it("P3: returns session on success", async () => {
    const mockSession = { user: { id: "u1" }, access_token: "tok" };
    mockVerifyOtp.mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });

    const result = await (client as any).verifyRecoveryToken("good_token");

    expect(result.error).toBeNull();
    expect(result.session).toBeTruthy();
  });

  it("P4: never logs the raw token_hash", async () => {
    const logSpy = jest.spyOn(console, "log");
    const warnSpy = jest.spyOn(console, "warn");
    const errorSpy = jest.spyOn(console, "error");

    mockVerifyOtp.mockResolvedValue({
      data: { session: { user: { id: "u1" } } },
      error: null,
    });

    await (client as any).verifyRecoveryToken("secret_xyz_123");

    for (const spy of [logSpy, warnSpy, errorSpy]) {
      for (const call of spy.mock.calls) {
        const joined = call.join(" ");
        expect(joined).not.toContain("secret_xyz_123");
      }
    }
  });

  it("P5: catches thrown exceptions", async () => {
    mockVerifyOtp.mockRejectedValue(new Error("network failure"));

    const result = await (client as any).verifyRecoveryToken("abc");

    expect(result.error).toBeInstanceOf(Error);
    expect(result.error!.message).toBe("network failure");
  });
});
