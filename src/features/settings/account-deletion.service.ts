/**
 * Account Deletion Service
 *
 * Handles permanent account deletion as required by App Store guidelines.
 * Must provide a way for users to delete their accounts and all associated data.
 *
 * @see https://developer.apple.com/support/offering-account-deletion-in-your-app
 *
 * Flow:
 * 1. User requests deletion from Settings
 * 2. Show confirmation warning
 * 3. Delete user data from Supabase
 * 4. Revoke auth session
 * 5. Clear local storage
 * 6. Redirect to onboarding
 */

import { analytics } from "../../infrastructure/analytics";
import { getStorage } from "../../infrastructure/storage";
import { getSupabaseClient } from "../../lib/supabase/client";

/**
 * Delete the user's account and all associated data.
 * Returns true if successful, false otherwise.
 *
 * IMPORTANT: This operation is IRREVERSIBLE.
 * All user data (meals, weight logs, profile, preferences) will be permanently deleted.
 *
 * Implementation:
 * - Calls Supabase Edge Function for server-side deletion
 * - Clears local storage
 * - Signs out user
 * - Analytics tracking (before reset)
 */
export async function deleteUserAccount(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = getSupabaseClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "No user logged in" };
    }

    // Track deletion request (for analytics before account is deleted)
    analytics.track("account_deletion_requested", {
      userId: user.id,
      timestamp: new Date().toISOString(),
    });

    // Call Supabase Edge Function to delete user data server-side
    const { error } = await supabase.functions.invoke("delete-account", {
      body: { userId: user.id },
    });

    if (error) {
      console.error("[AccountDeletion] Server-side deletion failed:", error);
      return { success: false, error: error.message };
    }

    // Clear local storage
    const storage = getStorage();
    await storage.clear();

    // Reset analytics
    analytics.reset();

    // Sign out (this will also clear Supabase auth state)
    await supabase.auth.signOut();

    return { success: true };
  } catch (error) {
    console.error("[AccountDeletion] Failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Export user data before deletion (required by GDPR).
 * Returns downloadable JSON of all user data.
 */
export async function exportUserDataBeforeDeletion(): Promise<string | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch all user data
    const { data: userData, error } = await supabase.functions.invoke(
      "export-user-data",
      {
        body: { userId: user.id },
      }
    );

    if (error || !userData) {
      console.error("[AccountDeletion] Data export failed:", error);
      return null;
    }

    return JSON.stringify(userData, null, 2);
  } catch (error) {
    console.error("[AccountDeletion] Export failed:", error);
    return null;
  }
}
