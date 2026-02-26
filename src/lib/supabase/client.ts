/**
 * Supabase Client Factory
 * Creates a singleton Supabase client using the active app config
 *
 * Token Storage:
 *   Uses expo-secure-store (Keychain on iOS, Keystore on Android) for
 *   auth token persistence. On web, falls back to AsyncStorage.
 *
 *   On native, if SecureStore fails we do NOT silently fall back to
 *   unencrypted storage. Instead we return null / no-op, which forces
 *   re-auth on next launch. Shipping tokens insecurely is worse than
 *   a one-time re-login.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";
import { getAppConfig } from "../../config";

// ─────────────────────────────────────────────────────────────────────────────
// Secure Storage Adapter
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SecureStore-backed storage adapter for Supabase auth.
 *
 * Web:    AsyncStorage (acceptable — web has its own origin-scoped storage model).
 * Native: SecureStore only. If it fails, we return null / no-op so the session
 *         is not persisted rather than stored insecurely. The user will need to
 *         re-authenticate on next launch — a better outcome than leaking tokens.
 */
const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") return AsyncStorage.getItem(key);
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      // SecureStore failure on native — do NOT fall back to plain storage.
      // Return null so Supabase treats the session as missing (forces re-auth).
      if (__DEV__) {
        console.warn(
          "[SecureStore] getItem failed (session will be missing):",
          String(e)
        );
      }
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      await AsyncStorage.setItem(key, value);
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      // SecureStore failure on native — silently drop the write.
      // The session won't persist, but tokens won't leak to unencrypted storage.
      if (__DEV__) {
        console.warn(
          "[SecureStore] setItem failed (session will not persist):",
          String(e)
        );
      }
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      await AsyncStorage.removeItem(key);
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      if (__DEV__) {
        console.warn("[SecureStore] removeItem failed:", String(e));
      }
    }
  },
};

// Singleton instance
let supabaseClient: SupabaseClient | null = null;

/**
 * Create Supabase client with config-driven credentials
 * Client is created once and reused (singleton pattern)
 */
export function createSupabaseClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const config = getAppConfig();

  if (__DEV__) {
    console.log(`🔌 Initializing Supabase client for: ${config.app.name}`);
    console.log(`   Project: ${config.supabase.url}`);
  }

  supabaseClient = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return supabaseClient;
}

/**
 * Get the current Supabase client instance
 * Creates it if it doesn't exist
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    return createSupabaseClient();
  }
  return supabaseClient;
}

/**
 * Reset Supabase client (useful for profile switching or testing)
 * ⚠️ WARNING: This will clear the current session
 */
export async function resetSupabaseClient(): Promise<void> {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
    supabaseClient = null;
  }
}

/**
 * Reset Supabase client for testing (synchronous)
 * @internal
 */
export function __resetSupabaseClient(): void {
  supabaseClient = null;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const client = getSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  return !!session;
}

/**
 * Get current user session
 */
export async function getCurrentSession() {
  const client = getSupabaseClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  return session;
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const client = getSupabaseClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user;
}

// Re-export Supabase types for convenience
export type {
    AuthError,
    Session,
    SupabaseClient,
    User
} from "@supabase/supabase-js";

