/**
 * Supabase Client Factory
 * Creates a singleton Supabase client using the active app config
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";
import { getAppConfig } from "../../config";

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

  console.log(`🔌 Initializing Supabase client for: ${config.app.name}`);
  console.log(`   Project: ${config.supabase.url}`);

  supabaseClient = createClient(config.supabase.url, config.supabase.anonKey, {
    auth: {
      storage: AsyncStorage,
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

