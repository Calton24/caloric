/**
 * Supabase Auth Provider
 * Production AuthClient implementation backed by Supabase Auth.
 *
 * This file is allowed to import from src/lib/supabase.
 * Feature code must never import this file directly — use createAuthClient().
 */

import { getSupabaseClient } from "../../../lib/supabase";
import type { AuthClient, AuthResponse, Session, User } from "../authClient";

export class SupabaseAuthClient implements AuthClient {
  private listeners: ((session: Session | null) => void)[] = [];

  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, session: null, error: new Error(error.message) };
      }

      if (!data.user || !data.session) {
        return {
          user: null,
          session: null,
          error: new Error("Invalid response from server"),
        };
      }

      const user = mapUser(data.user);
      const session = mapSession(user, data.session);
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
      const { data, error } = await supabase.auth.signUp({ email, password });

      if (error) {
        return { user: null, session: null, error: new Error(error.message) };
      }

      if (!data.user) {
        return {
          user: null,
          session: null,
          error: new Error("Invalid response from server"),
        };
      }

      const user = mapUser(data.user);
      // Session might be null if email confirmation required
      const session: Session | null = data.session
        ? mapSession(user, data.session)
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

      const user = mapUser(data.session.user);
      const session = mapSession(user, data.session);
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

      const user = mapUser(supabaseSession.user);
      const session = mapSession(user, supabaseSession);
      callback(session);
    });

    return () => {
      subscription.unsubscribe();
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners(session: Session | null) {
    this.listeners.forEach((listener) => listener(session));
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function mapUser(supabaseUser: {
  id: string;
  email?: string | null;
  created_at: string;
}): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || "",
    createdAt: supabaseUser.created_at,
  };
}

function mapSession(
  user: User,
  raw: { access_token: string; refresh_token: string }
): Session {
  return {
    user,
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
  };
}
