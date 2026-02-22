/**
 * Auth Provider
 * Manages authentication state and provides auth context
 */

import React, { createContext, useCallback, useEffect, useState } from "react";
import { analytics } from "../../infrastructure/analytics";
import {
    authClient,
    OAuthProvider,
    OAuthResponse,
    Session,
    User,
} from "./authClient";

export interface AuthContextValue {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  exchangeCodeForSession: (code: string) => Promise<{ error: Error | null }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<OAuthResponse>;
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
          email: initialSession.user.email,
        });
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
          email: newSession.user.email,
        });
      } else if (prevUser && !newSession?.user) {
        // Went from authenticated → unauthenticated — reset
        analytics.reset();
      }
    });

    return unsubscribe;
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

  const resetPassword = useCallback(async (email: string) => {
    return await authClient.resetPasswordForEmail(email);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    return await authClient.updatePassword(newPassword);
  }, []);

  const exchangeCodeForSession = useCallback(async (code: string) => {
    return await authClient.exchangeCodeForSession(code);
  }, []);

  const signInWithOAuth = useCallback(async (provider: OAuthProvider) => {
    return await authClient.signInWithOAuth(provider);
  }, []);

  const contextValue: AuthContextValue = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    exchangeCodeForSession,
    signInWithOAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
