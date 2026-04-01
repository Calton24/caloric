/**
 * Auth Client — Types, Factory & Singleton
 *
 * Types live here. Implementations live in providers/.
 * Feature code imports from this file. Never from providers directly.
 */

import { maintenance } from "../../infrastructure/maintenance";
import { MockAuthClient } from "./providers/mock";
import { SupabaseAuthClient } from "./providers/supabase";

// ── Types ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Session {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User | null;
  session: Session | null;
  error: Error | null;
}

export type OAuthProvider = "google" | "apple";

export interface OAuthResponse {
  /** URL to open in a browser/auth session. null if the provider returned nothing. */
  url: string | null;
  error: Error | null;
}

export interface AuthClient {
  signIn(email: string, password: string): Promise<AuthResponse>;
  signUp(email: string, password: string): Promise<AuthResponse>;
  signOut(): Promise<{ error: Error | null }>;
  deleteAccount(): Promise<{ error: Error | null }>;
  resetPasswordForEmail(email: string): Promise<{ error: Error | null }>;
  updatePassword(newPassword: string): Promise<{ error: Error | null }>;
  signInWithOAuth(provider: OAuthProvider): Promise<OAuthResponse>;
  signInWithAppleNative(): Promise<AuthResponse>;
  exchangeCodeForSession(code: string): Promise<{ error: Error | null }>;
  getSession(): Promise<{ session: Session | null; error: Error | null }>;
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}

// ── Factory ──────────────────────────────────────────────────────────────────

export type AuthProviderType = "supabase" | "mock";

/**
 * Create an AuthClient for the given provider.
 * Default: "supabase".
 *
 * @example
 *   const auth = createAuthClient();            // Supabase (production)
 *   const auth = createAuthClient("mock");      // Mock (tests / offline dev)
 */
export function createAuthClient(
  provider: AuthProviderType = "supabase"
): AuthClient {
  switch (provider) {
    case "supabase":
      return new SupabaseAuthClient();
    case "mock":
      return new MockAuthClient();
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Unknown auth provider: ${_exhaustive}`);
    }
  }
}

// ── Maintenance guard ────────────────────────────────────────────────────────

const SERVICE_UNAVAILABLE_ERROR = new Error(
  "Service temporarily unavailable. Please try again shortly."
);

/**
 * If auth is blocked by the maintenance system, return a friendly error
 * instead of letting the request hit Supabase (which would produce
 * confusing "wrong password" or "session expired" errors when the
 * backend is actually unreachable).
 */
function authBlocked(): AuthResponse | null {
  try {
    if (maintenance.isBlocked("auth")) {
      return {
        user: null,
        session: null,
        error: SERVICE_UNAVAILABLE_ERROR,
      };
    }
  } catch {
    // maintenance must never crash auth
  }
  return null;
}

// ── Singleton ────────────────────────────────────────────────────────────────

let client: AuthClient = createAuthClient();

/**
 * Replace the auth client at runtime.
 * Call early in bootstrap or test setup.
 */
export function setAuthClient(newClient: AuthClient): void {
  client = newClient;
}

/**
 * Get the current auth client instance.
 */
export function getAuthClient(): AuthClient {
  return client;
}

/**
 * Proxy singleton — delegates to the current `client` instance.
 * Safe to hold a reference; swapping via setAuthClient() is reflected immediately.
 */
export const authClient: AuthClient = {
  signIn: async (...args) => authBlocked() ?? client.signIn(...args),
  signUp: async (...args) => authBlocked() ?? client.signUp(...args),
  signOut: (...args) => client.signOut(...args),
  deleteAccount: (...args) => client.deleteAccount(...args),
  resetPasswordForEmail: (...args) => client.resetPasswordForEmail(...args),
  updatePassword: (...args) => client.updatePassword(...args),
  signInWithOAuth: (provider) => {
    if (maintenance.isBlocked("auth")) {
      return Promise.resolve({ url: null, error: SERVICE_UNAVAILABLE_ERROR });
    }
    return client.signInWithOAuth(provider);
  },
  signInWithAppleNative: async () =>
    authBlocked() ?? client.signInWithAppleNative(),
  exchangeCodeForSession: (...args) => client.exchangeCodeForSession(...args),
  getSession: (...args) => client.getSession(...args),
  onAuthStateChange: (...args) => client.onAuthStateChange(...args),
};

// Re-export provider classes for direct construction in tests
export { MockAuthClient, SupabaseAuthClient };
