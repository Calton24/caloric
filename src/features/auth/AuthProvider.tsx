/**
 * Auth Provider
 * Manages authentication state and provides auth context
 */

import React, { createContext, useCallback, useEffect, useRef, useState } from "react";
import { analytics } from "../../infrastructure/analytics";
import { reportError } from "../../infrastructure/errorReporting";
import { growth } from "../../infrastructure/growth";
import { logColdStartStep } from "../../infrastructure/tracing/coldStartTrace";
import { getSupabaseClient } from "../../lib/supabase/client";
import {
  discardPendingPaywallHandoffMarker,
} from "../onboarding/post-auth-onboarding-handoff";
import {
    authClient,
    OAuthProvider,
    OAuthResponse,
    Session,
    User,
} from "./authClient";
import {
  clearStaleSupabaseAuthStorage,
  isInvalidRefreshTokenError,
} from "./auth-session-recovery";

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

/**
 * Hard ceiling on auth bootstrap. If `getSession()` hangs (SecureStore
 * contention, network) and `onAuthStateChange` doesn't fire fast enough,
 * we still flip `isLoading` to false so the access gate can route. Real
 * sessions are picked up by the listener after the timeout.
 */
const AUTH_BOOTSTRAP_TIMEOUT_MS = 8_000;

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mountIdRef = useRef(
    `auth-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );

  useEffect(() => {
    if (!__DEV__) return;
    const mountId = mountIdRef.current;
    console.log("[ProviderMount]", { provider: "AuthProvider", mountId });
    return () => {
      console.log("[ProviderUnmount]", { provider: "AuthProvider", mountId });
    };
  }, []);

  // Initialize session on mount
  useEffect(() => {
    let bootstrapResolved = false;
    const finishBootstrap = (origin: string) => {
      if (bootstrapResolved) return;
      bootstrapResolved = true;
      setIsLoading(false);
      if (__DEV__) {
        console.log("[AuthState] bootstrap_resolved", { origin });
      }
    };

    authClient
      .getSession()
      .then(async ({ session: initialSession, error: sessionError }) => {
        let clearedStaleRefresh = false;
        if (sessionError) {
          if (isInvalidRefreshTokenError(sessionError)) {
            if (__DEV__) {
              console.warn(
                "[Auth] invalid refresh token — clearing local Supabase session"
              );
            }
            await clearStaleSupabaseAuthStorage();
            clearedStaleRefresh = true;
          } else {
            // Don't surface to the user — they'll just see the sign-in screen.
            // But we want to know about it: a session error here is often a
            // SecureStore / token-corruption issue that breaks app boot.
            reportError(sessionError, {
              area: "auth",
              action: "getSession_initial",
              provider: "supabase",
            });
          }
        }
        // Resolve auth provider from the raw Supabase user metadata for the
        // cold-start trace. Our local `User` type doesn't carry this, so
        // read it directly from the underlying client.
        let provider: string | null = null;
        if (initialSession && !clearedStaleRefresh) {
          try {
            const { data } = await getSupabaseClient().auth.getUser();
            const meta = data.user?.app_metadata as
              | { provider?: string; providers?: string[] }
              | undefined;
            provider = meta?.provider ?? meta?.providers?.[0] ?? null;
          } catch {
            provider = null;
          }
        }
        logColdStartStep("auth_session_loaded", {
          userId:
            clearedStaleRefresh || !initialSession
              ? null
              : initialSession.user.id,
          provider,
          sessionExists:
            !clearedStaleRefresh && Boolean(initialSession),
          sessionError: sessionError ? sessionError.message : null,
        });
        if (initialSession && !clearedStaleRefresh) {
          setSession(initialSession);
          setUser(initialSession.user);
          analytics.identify(initialSession.user.id, {
            email_hash: hashEmail(initialSession.user.email),
          });
          growth.setUser({ userId: initialSession.user.id });
        }
        finishBootstrap("getSession");
      })
      .catch(async (err) => {
        if (isInvalidRefreshTokenError(err)) {
          if (__DEV__) {
            console.warn(
              "[Auth] invalid refresh token (getSession threw) — clearing local session"
            );
          }
          await clearStaleSupabaseAuthStorage();
        } else {
          logColdStartStep("auth_session_loaded", {
            userId: null,
            provider: null,
            sessionExists: false,
            sessionError: err instanceof Error ? err.message : String(err),
            threw: true,
          });
          reportError(err, {
            area: "auth",
            action: "getSession_initial_throw",
            provider: "supabase",
          });
        }
        finishBootstrap("getSession_threw");
      });

    // Subscribe to auth state changes — single choke point for analytics
    // identity. Fires for signIn, signUp, OAuth, deep-link token exchange,
    // and token refresh. This means we don't need manual identify/reset in
    // each handler.
    //
    // Critical: this listener ALSO releases the bootstrap loading flag if
    // it fires before getSession() resolves (e.g. SecureStore contention
    // delays getSession but onAuthStateChange's INITIAL_SESSION reaches us
    // first). Without this, the gate would see {user: set, isLoading: true}
    // and spin forever — see release-blocker fix 2026-05-07.
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
      finishBootstrap("onAuthStateChange");
    });

    // Hard timeout safety. If neither getSession() nor onAuthStateChange
    // resolves within the budget, recover by querying the session directly
    // and force-resolving the loading flag so the gate isn't stranded.
    const timeoutId = setTimeout(() => {
      if (bootstrapResolved) return;
      if (__DEV__) {
        console.warn(
          "[AuthState] bootstrap_timeout — forcing resolve via getSession",
        );
      }
      authClient
        .getSession()
        .then(({ session: rescuedSession }) => {
          if (rescuedSession) {
            setSession(rescuedSession);
            setUser(rescuedSession.user);
          }
        })
        .catch(() => {
          /* swallow — bootstrap will resolve to signedOut below */
        })
        .finally(() => {
          finishBootstrap("bootstrap_timeout");
          reportError(
            new Error(
              "[AuthState] bootstrap timeout — getSession + onAuthStateChange did not resolve within budget",
            ),
            {
              area: "auth",
              action: "auth_bootstrap_timeout",
              provider: "supabase",
              extra: { budgetMs: AUTH_BOOTSTRAP_TIMEOUT_MS },
            },
          );
        });
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
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
    void discardPendingPaywallHandoffMarker();
    // reset() handled by onAuthStateChange listener
    return { error };
  }, []);

  const deleteAccount = useCallback(async () => {
    const { error } = await authClient.deleteAccount();
    if (!error) {
      analytics.track("account_deleted");
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
