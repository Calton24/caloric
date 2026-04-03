/**
 * Auth Provider
 * Manages authentication state and provides auth context
 */

import React, { createContext, useCallback, useEffect, useState } from "react";
import { analytics } from "../../infrastructure/analytics";
import { growth } from "../../infrastructure/growth";
import {
    authClient,
    OAuthProvider,
    OAuthResponse,
    Session,
    User,
} from "./authClient";

/**
 * Hash an email to a non-reversible identifier for analytics.
 * Uses a simple DJB2 hash — NOT crypto-grade, but sufficient to
 * avoid sending raw PII to third-party analytics.
 */
function hashEmail(email: string | undefined): string | undefined {
  if (!email) return undefined;
  let hash = 5381;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) + hash + email.charCodeAt(i)) | 0;
  }
  return `hashed_${(hash >>> 0).toString(36)}`;
}

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  deleteAccount: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  verifyRecoveryToken: (
    tokenHash: string
  ) => Promise<{ error: Error | null; session?: any }>;
  exchangeCodeForSession: (
    code: string
  ) => Promise<{ error: Error | null; isRecovery?: boolean }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<OAuthResponse>;
  signInWithAppleNative: () => Promise<{ error: Error | null }>;
  signInWithGoogleNative: () => Promise<{ error: Error | null }>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    authClient.getSession().then(({ session: initialSession }) => {
      if (initialSession) {
        setSession(initialSession);
        setUser(initialSession.user);
        analytics.identify(initialSession.user.id, {
          email_hash: hashEmail(initialSession.user.email),
        });
        growth.setUser({ userId: initialSession.user.id });
      }
      setIsLoading(false);
    });

    // Subscribe to auth state changes — single choke point for analytics
    // identity. Fires for signIn, signUp, OAuth, deep-link token exchange,
    // and token refresh. This means we don't need manual identify/reset in
    // each handler.
    const unsubscribe = authClient.onAuthStateChange((newSession) => {
      const prevUser = user;
      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.user) {
        // New authenticated session — identify
        analytics.identify(newSession.user.id, {
          email_hash: hashEmail(newSession.user.email),
        });
        growth.setUser({ userId: newSession.user.id });
      } else if (prevUser && !newSession?.user) {
        // Went from authenticated → unauthenticated — reset
        analytics.reset();
        growth.setUser(null);
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const {
      user: authUser,
      session: authSession,
      error,
    } = await authClient.signIn(email, password);

    if (!error && authUser && authSession) {
      setUser(authUser);
      setSession(authSession);
      // identify() handled by onAuthStateChange listener
      analytics.track("sign_in", { method: "email" });
    }

    return { error };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const {
      user: authUser,
      session: authSession,
      error,
    } = await authClient.signUp(email, password);

    if (!error && authUser && authSession) {
      setUser(authUser);
      setSession(authSession);
      // identify() handled by onAuthStateChange listener
      analytics.track("sign_up", { method: "email" });
    }

    return { error };
  }, []);

  const signOut = useCallback(async () => {
    // Track before reset so the event still has a user identity attached
    analytics.track("sign_out");
    const { error } = await authClient.signOut();
    // Always clear local state even if API fails
    setUser(null);
    setSession(null);
    // reset() handled by onAuthStateChange listener
    return { error };
  }, []);

  const deleteAccount = useCallback(async () => {
    analytics.track("account_deleted");
    const { error } = await authClient.deleteAccount();
    if (!error) {
      setUser(null);
      setSession(null);
    }
    return { error };
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    return await authClient.resetPasswordForEmail(email);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    return await authClient.updatePassword(newPassword);
  }, []);

  const verifyRecoveryToken = useCallback(async (tokenHash: string) => {
    return await authClient.verifyRecoveryToken(tokenHash);
  }, []);

  const exchangeCodeForSession = useCallback(async (code: string) => {
    return await authClient.exchangeCodeForSession(code);
  }, []);

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    return await authClient.signInWithOAuth(provider);
  }, []);

  const signInWithAppleNative = useCallback(async () => {
    const {
      user: authUser,
      session: authSession,
      error,
    } = await authClient.signInWithAppleNative();
    if (!error && authUser && authSession) {
      setUser(authUser);
      setSession(authSession);
      analytics.track("sign_in", { method: "apple_native" });
    }
    return { error };
  }, []);

  const signInWithGoogleNative = useCallback(async () => {
    const {
      user: authUser,
      session: authSession,
      error,
    } = await authClient.signInWithGoogleNative();
    if (!error && authUser && authSession) {
      setUser(authUser);
      setSession(authSession);
      analytics.track("sign_in", { method: "google_native" });
    }
    return { error };
  }, []);

  const contextValue: AuthContextValue = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    deleteAccount,
    resetPassword,
    updatePassword,
    verifyRecoveryToken,
    exchangeCodeForSession,
    signInWithOAuth,
    signInWithAppleNative,
    signInWithGoogleNative,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
