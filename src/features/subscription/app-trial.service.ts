/**
 * Server-backed 3-day app trial (72h from app_trial_started_at, evaluated with DB now()).
 *
 * Result shape:
 *   { ok: true, trial }    — server returned a definitive snapshot
 *   { ok: false, reason }  — RPC failure / network error / threw
 *
 * The CALLER (use-app-trial-sync) decides what to do on failure — typically
 * route the trial store into "error" so the access-decision state machine
 * can apply its flicker shield (last-known active access keeps user in
 * loading state instead of slamming them to the paywall).
 */

import { reportError } from "../../infrastructure/errorReporting";
import { getSupabaseClient } from "../../lib/supabase/client";

export type TrialStatus = {
  startedAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  isExpired: boolean;
  source: "server" | "local";
};

export type TrialFetchFailureReason =
  /** RPC isn't published — either migration not applied or PostgREST schema cache stale. */
  | "rpc_missing"
  /** Server returned an error (auth, permissions, SQL exception, etc.). */
  | "rpc_error"
  /** Network / fetch threw before reaching the server. */
  | "network_error";

export type TrialFetchResult =
  | { ok: true; trial: TrialStatus }
  | { ok: false; reason: TrialFetchFailureReason; message?: string };

/**
 * PostgREST returns code "PGRST202" (or message containing "Could not find
 * the function ... in the schema cache") when the RPC isn't published. We
 * surface this as a distinct failure reason so dev/staging fail loudly and
 * production observability can alert on it.
 */
function isRpcMissingError(err: { code?: string; message?: string }): boolean {
  if (err.code === "PGRST202") return true;
  const m = err.message ?? "";
  return (
    m.includes("Could not find the function") ||
    m.includes("schema cache") ||
    m.includes("function") && m.includes("does not exist")
  );
}

const EMPTY_SERVER: TrialStatus = {
  startedAt: null,
  expiresAt: null,
  isActive: false,
  isExpired: false,
  source: "server",
};

type RpcTrialPayload = {
  started_at: string | null;
  expires_at: string | null;
  is_active: boolean;
  is_expired: boolean;
};

function mapPayload(data: RpcTrialPayload | null | undefined): TrialStatus {
  if (!data) return { ...EMPTY_SERVER };
  return {
    startedAt: data.started_at ?? null,
    expiresAt: data.expires_at ?? null,
    isActive: Boolean(data.is_active),
    isExpired: Boolean(data.is_expired),
    source: "server",
  };
}

/**
 * Fetch trial state from the server. Returns a tagged result so the caller
 * can distinguish a definitive "no trial / expired" answer from a transient
 * fetch failure. This distinction is critical — failing closed to "no trial"
 * on every transient network blip caused intermittent paywall flashes
 * (release-blocker bug, see access-decision.ts).
 */
export async function fetchAppTrialState(): Promise<TrialFetchResult> {
  try {
    const { data, error } = await getSupabaseClient().rpc(
      "get_app_trial_state",
    );
    if (error) {
      const missing = isRpcMissingError(error);
      const reason: TrialFetchFailureReason = missing
        ? "rpc_missing"
        : "rpc_error";
      if (missing) {
        // Loud failure: this is a deploy/config bug, not a runtime blip.
        // Surface to error reporting so we don't silently brick all users.
        const msg =
          "[AppTrial] get_app_trial_state RPC is not published. " +
          "Either the trial migrations have not been applied to the live " +
          "Supabase project, or PostgREST's schema cache is stale. " +
          "Run: NOTIFY pgrst, 'reload schema'; or re-deploy the trial " +
          "hardening migration.";
        if (__DEV__) console.error(msg, error);
        reportError(new Error(msg), {
          area: "billing",
          action: "fetchAppTrialState_rpc_missing",
          provider: "supabase",
          extra: { code: error.code, message: error.message },
        });
      } else if (__DEV__) {
        console.warn("[AppTrial] get_app_trial_state failed", error.message);
      }
      return { ok: false, reason, message: error.message };
    }
    return { ok: true, trial: mapPayload(data as RpcTrialPayload) };
  } catch (err) {
    if (__DEV__) {
      console.warn("[AppTrial] get_app_trial_state threw", err);
    }
    return {
      ok: false,
      reason: "network_error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Start trial if onboarding is complete and trial not yet started (idempotent). */
export async function ensureAppTrialStarted(): Promise<void> {
  try {
    const { error } = await getSupabaseClient().rpc("ensure_app_trial_started");
    if (error) {
      if (isRpcMissingError(error)) {
        const msg =
          "[AppTrial] ensure_app_trial_started RPC missing — trials cannot start.";
        if (__DEV__) console.error(msg, error);
        reportError(new Error(msg), {
          area: "billing",
          action: "ensureAppTrialStarted_rpc_missing",
          provider: "supabase",
          extra: { code: error.code, message: error.message },
        });
      } else if (__DEV__) {
        console.warn(
          "[AppTrial] ensure_app_trial_started failed",
          error.message,
        );
      }
    }
  } catch {
    /* non-fatal */
  }
}
