/**
 * Auth Client — Types, Factory & Singleton
 *
 * Types live here. Implementations live in providers/.
 * Feature code imports from this file. Never from providers directly.
 */

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
  resetPasswordForEmail(email: string): Promise<{ error: Error | null }>;
  updatePassword(newPassword: string): Promise<{ error: Error | null }>;
  signInWithOAuth(provider: OAuthProvider): Promise<OAuthResponse>;
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
  signIn: (...args) => client.signIn(...args),
  signUp: (...args) => client.signUp(...args),
  signOut: (...args) => client.signOut(...args),
  resetPasswordForEmail: (...args) => client.resetPasswordForEmail(...args),
  updatePassword: (...args) => client.updatePassword(...args),
  signInWithOAuth: (...args) => client.signInWithOAuth(...args),
  getSession: (...args) => client.getSession(...args),
  onAuthStateChange: (...args) => client.onAuthStateChange(...args),
};

// Re-export provider classes for direct construction in tests
export { MockAuthClient, SupabaseAuthClient };
