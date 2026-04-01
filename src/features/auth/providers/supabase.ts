/**
 * Supabase Auth Provider
 * Production AuthClient implementation backed by Supabase Auth.
 *
 * This file is allowed to import from src/lib/supabase.
 * Feature code must never import this file directly — use createAuthClient().
 */

import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { getAppConfig } from "../../../config";
import { getSupabaseClient } from "../../../lib/supabase";
import type {
    AuthClient,
    AuthResponse,
    OAuthProvider,
    OAuthResponse,
    Session,
    User,
} from "../authClient";

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

  async deleteAccount(): Promise<{ error: Error | null }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.functions.invoke("delete-account", {
        method: "POST",
      });
      if (error) {
        return { error: new Error(error.message) };
      }
      this.notifyListeners(null);
      return { error: null };
    } catch (err) {
      return {
        error:
          err instanceof Error ? err : new Error("Account deletion failed"),
      };
    }
  }

  async resetPasswordForEmail(email: string): Promise<{ error: Error | null }> {
    try {
      const supabase = getSupabaseClient();
      const config = getAppConfig();
      const scheme = config.app.scheme;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${scheme}://auth/reset-password`,
      });
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

  async exchangeCodeForSession(code: string): Promise<{ error: Error | null }> {
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return { error: new Error(error.message) };
      }
      return { error: null };
    } catch (err) {
      return {
        error: err instanceof Error ? err : new Error("Code exchange failed"),
      };
    }
  }

  async signInWithOAuth(provider: OAuthProvider): Promise<OAuthResponse> {
    try {
      const supabase = getSupabaseClient();
      const config = getAppConfig();
      const scheme = config.app.scheme;
      const redirectTo = `${scheme}://auth/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          skipBrowserRedirect: true, // we open the URL ourselves
        },
      });

      if (error) {
        return { url: null, error: new Error(error.message) };
      }

      return { url: data.url ?? null, error: null };
    } catch (err) {
      return {
        url: null,
        error: err instanceof Error ? err : new Error("OAuth sign-in failed"),
      };
    }
  }

  async signInWithAppleNative(): Promise<AuthResponse> {
    try {
      const rawNonce = Crypto.randomUUID();
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        return {
          user: null,
          session: null,
          error: new Error("No identity token returned from Apple"),
        };
      }

      const supabase = getSupabaseClient();
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "apple",
        token: credential.identityToken,
        nonce: rawNonce,
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
    } catch (err: any) {
      if (err?.code === "ERR_REQUEST_CANCELED") {
        return {
          user: null,
          session: null,
          error: new Error("User cancelled"),
        };
      }
      return {
        user: null,
        session: null,
        error: err instanceof Error ? err : new Error("Apple sign-in failed"),
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
