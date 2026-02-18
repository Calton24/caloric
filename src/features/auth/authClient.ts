/**
 * Auth Client Interface
 * Swappable auth client following Mobile Core infrastructure pattern
 */

import { getSupabaseClient } from "../../lib/supabase";

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

export interface AuthClient {
  signIn(email: string, password: string): Promise<AuthResponse>;
  signUp(email: string, password: string): Promise<AuthResponse>;
  signOut(): Promise<{ error: Error | null }>;
  resetPasswordForEmail(email: string): Promise<{ error: Error | null }>;
  updatePassword(newPassword: string): Promise<{ error: Error | null }>;
  getSession(): Promise<{ session: Session | null; error: Error | null }>;
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}

/**
 * Supabase Auth Client
 * Production implementation using real Supabase auth
 */
class SupabaseAuthClient implements AuthClient {
  private listeners: ((session: Session | null) => void)[] = [];

  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: new Error(error.message),
        };
      }

      if (!data.user || !data.session) {
        return {
          user: null,
          session: null,
          error: new Error("Invalid response from server"),
        };
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || "",
        createdAt: data.user.created_at,
      };

      const session: Session = {
        user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };

      return { user, session, error: null };
    } catch (err) {
      return {
        user: null,
        session: null,
        error: err instanceof Error ? err : new Error("Sign in failed"),
      };
    }
  }

  async signUp(email: string, password: string): Promise<AuthResponse> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        return {
          user: null,
          session: null,
          error: new Error(error.message),
        };
      }

      if (!data.user) {
        return {
          user: null,
          session: null,
          error: new Error("Invalid response from server"),
        };
      }

      const user: User = {
        id: data.user.id,
        email: data.user.email || "",
        createdAt: data.user.created_at,
      };

      // Session might be null if email confirmation required
      const session: Session | null = data.session
        ? {
            user,
            accessToken: data.session.access_token,
            refreshToken: data.session.refresh_token,
          }
        : null;

      return { user, session, error: null };
    } catch (err) {
      return {
        user: null,
        session: null,
        error: err instanceof Error ? err : new Error("Sign up failed"),
      };
    }
  }

  async signOut(): Promise<{ error: Error | null }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signOut();

      this.notifyListeners(null);

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error("Sign out failed"),
      };
    }
  }

  async resetPasswordForEmail(email: string): Promise<{ error: Error | null }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error("Password reset failed"),
      };
    }
  }

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error("Password update failed"),
      };
    }
  }

  async getSession(): Promise<{
    session: Session | null;
    error: Error | null;
  }> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        return { session: null, error: new Error(error.message) };
      }

      if (!data.session) {
        return { session: null, error: null };
      }

      const user: User = {
        id: data.session.user.id,
        email: data.session.user.email || "",
        createdAt: data.session.user.created_at,
      };

      const session: Session = {
        user,
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
      };

      return { session, error: null };
    } catch (err) {
      return {
        session: null,
        error: err instanceof Error ? err : new Error("Get session failed"),
      };
    }
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    const supabase = getSupabaseClient();

    this.listeners.push(callback);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, supabaseSession) => {
      if (!supabaseSession) {
        callback(null);
        return;
      }

      const user: User = {
        id: supabaseSession.user.id,
        email: supabaseSession.user.email || "",
        createdAt: supabaseSession.user.created_at,
      };

      const session: Session = {
        user,
        accessToken: supabaseSession.access_token,
        refreshToken: supabaseSession.refresh_token,
      };

      callback(session);
    });

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(session: Session | null) {
    this.listeners.forEach((listener) => listener(session));
  }
}

/**
 * Mock Auth Client Implementation
 * Used for testing or when Supabase is not available
 */
class MockAuthClient implements AuthClient {
  private currentSession: Session | null = null;
  private listeners: ((session: Session | null) => void)[] = [];

  async signIn(email: string, password: string): Promise<AuthResponse> {
    await this.delay(800);

    if (!email || !password) {
      return {
        user: null,
        session: null,
        error: new Error("Email and password are required"),
      };
    }

    if (password.length < 6) {
      return {
        user: null,
        session: null,
        error: new Error("Invalid credentials"),
      };
    }

    const user: User = {
      id: "mock-user-id",
      email,
      createdAt: new Date().toISOString(),
    };

    const session: Session = {
      user,
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    };

    this.currentSession = session;
    this.notifyListeners(session);

    return { user, session, error: null };
  }

  async signUp(email: string, password: string): Promise<AuthResponse> {
    await this.delay(800);

    if (!email || !password) {
      return {
        user: null,
        session: null,
        error: new Error("Email and password are required"),
      };
    }

    if (password.length < 6) {
      return {
        user: null,
        session: null,
        error: new Error("Password must be at least 6 characters"),
      };
    }

    if (!email.includes("@")) {
      return {
        user: null,
        session: null,
        error: new Error("Invalid email address"),
      };
    }

    const user: User = {
      id: "mock-user-id-" + Date.now(),
      email,
      createdAt: new Date().toISOString(),
    };

    const session: Session = {
      user,
      accessToken: "mock-access-token",
      refreshToken: "mock-refresh-token",
    };

    this.currentSession = session;
    this.notifyListeners(session);

    return { user, session, error: null };
  }

  async signOut(): Promise<{ error: Error | null }> {
    await this.delay(300);
    this.currentSession = null;
    this.notifyListeners(null);
    return { error: null };
  }

  async resetPasswordForEmail(email: string): Promise<{ error: Error | null }> {
    await this.delay(800);

    if (!email || !email.includes("@")) {
      return { error: new Error("Invalid email address") };
    }

    return { error: null };
  }

  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    await this.delay(800);

    if (newPassword.length < 6) {
      return { error: new Error("Password must be at least 6 characters") };
    }

    return { error: null };
  }

  async getSession(): Promise<{
    session: Session | null;
    error: Error | null;
  }> {
    return { session: this.currentSession, error: null };
  }

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(session: Session | null) {
    this.listeners.forEach((listener) => listener(session));
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Current auth client instance
 * Defaults to SupabaseAuthClient (production ready)
 */
let client: AuthClient = new SupabaseAuthClient();

/**
 * Set auth client implementation
 * Use this to swap between Supabase and Mock clients
 *
 * @example
 *   // Use mock for testing
 *   setAuthClient(new MockAuthClient());
 *
 *   // Use Supabase for production
 *   setAuthClient(new SupabaseAuthClient());
 */
export function setAuthClient(newClient: AuthClient): void {
  client = newClient;
}

/**
 * Get current auth client
 * @returns Current AuthClient instance
 */
export function getAuthClient(): AuthClient {
  return client;
}

/**
 * Export singleton auth client
 * All auth operations go through this instance
 */
export const authClient: AuthClient = {
  signIn: (...args) => client.signIn(...args),
  signUp: (...args) => client.signUp(...args),
  signOut: (...args) => client.signOut(...args),
  resetPasswordForEmail: (...args) => client.resetPasswordForEmail(...args),
  updatePassword: (...args) => client.updatePassword(...args),
  getSession: (...args) => client.getSession(...args),
  onAuthStateChange: (...args) => client.onAuthStateChange(...args),
};

/**
 * Export client classes for testing
 */
export { MockAuthClient, SupabaseAuthClient };

