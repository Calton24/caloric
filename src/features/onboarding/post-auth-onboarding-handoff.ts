/**
 * Post-auth onboarding handoff
 *
 * New users finish plan steps pre-auth → `save-progress` → OAuth/email sign-in →
 * `user_profiles` is created as `onboarding_completed: false` + `onboarding_step: null`.
 * Expo Router briefly hits `/`/stack transitions and `OnboardingAuthorityGate` resumes
 * them at `/goal`. We fix that by:
 *
 * - Setting a durable pending marker just before OAuth / email submit on save-progress.
 * - After Supabase onboarding resolution (and profile row creation when missing),
 *   consuming the marker → write `onboarding_step = paywall`, resolve again, unlock routing.
 */

import { getStorage } from "../../infrastructure/storage";
import { getSupabaseClient } from "../../lib/supabase/client";
import { logColdStartStep } from "../../infrastructure/tracing/coldStartTrace";
import type { OnboardingResolveResult } from "./onboarding-authority";
import {
  createMissingProfileRow,
  resolveOnboardingStatus,
  setOnboardingStepRemote,
} from "./onboarding-authority";
import { useOnboardingAuthorityStore } from "./onboarding-authority.store";

/** Stored as JSON: { v: 1, ts: number } */
const PENDING_KEY = "@calcut/onboarding_pending_paywall_handoff_v1";

const MARKER_TTL_MS = 24 * 60 * 60 * 1000;

export interface PendingPaywallHandoffMarker {
  v: 1;
  ts: number;
}

export async function markPendingPaywallHandoffFromSaveProgress(): Promise<void> {
  const payload: PendingPaywallHandoffMarker = { v: 1, ts: Date.now() };
  await getStorage().setItem(PENDING_KEY, JSON.stringify(payload));
  if (__DEV__) {
    console.log("[OnboardingState] post_auth_handoff_marker_set", {
      key: PENDING_KEY,
    });
  }
}

export async function readPendingPaywallHandoffMarker(): Promise<PendingPaywallHandoffMarker | null> {
  const raw = await getStorage().getItem(PENDING_KEY);
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as PendingPaywallHandoffMarker;
    if (o?.v !== 1 || typeof o.ts !== "number") return null;
    if (Date.now() - o.ts > MARKER_TTL_MS) {
      await clearPendingPaywallHandoffMarker();
      return null;
    }
    return o;
  } catch {
    return null;
  }
}

export async function clearPendingPaywallHandoffMarker(): Promise<void> {
  await getStorage().removeItem(PENDING_KEY);
}

/** Remove marker without consuming (OAuth cancelled before session). Fire-and-forget safe. */
export async function discardPendingPaywallHandoffMarker(): Promise<void> {
  await clearPendingPaywallHandoffMarker();
}

/**
 * After resolving onboarding authority, optionally upgrade incomplete users from
 * "fresh row / null checkpoint" → `paywall` when a save-progress hand-off is pending.
 *
 * Must only run server-side checkpoints that match this narrow funnel (`null`, `plan`, `save-progress`)
 * so we never jump a real in-progress user from e.g. `goal` to `paywall`.
 */
export async function finalizeOnboardingResolveWithPaywallHandoff(
  userId: string,
  incoming: OnboardingResolveResult,
): Promise<OnboardingResolveResult> {
  if (incoming.status === "missing" || incoming.status === "error") {
    return incoming;
  }

  const marker = await readPendingPaywallHandoffMarker();
  if (!marker) {
    return incoming;
  }

  if (incoming.status === "complete" || incoming.onboardingCompleted === true) {
    await clearPendingPaywallHandoffMarker();
    if (__DEV__) {
      console.log("[OnboardingState] post_auth_handoff_marker_cleared", {
        reason: "profile_already_complete",
        userId,
      });
    }
    return incoming;
  }

  if (incoming.status !== "incomplete") {
    await clearPendingPaywallHandoffMarker();
    return incoming;
  }

  const step = incoming.onboardingStep;
  const eligible =
    step === null ||
    step === "plan" ||
    step === "save-progress";

  if (!eligible) {
    await clearPendingPaywallHandoffMarker();
    if (__DEV__) {
      console.log("[OnboardingState] post_auth_handoff_marker_cleared", {
        reason: "stale_marker_checkpoint_mismatch",
        userId,
        serverStep: step,
      });
    }
    logColdStartStep("onboarding_paywall_handoff_discarded", {
      userId,
      reason: "checkpoint_mismatch",
      serverStep: step,
    });
    return incoming;
  }

  if (__DEV__) {
    console.log("[OnboardingState] post_auth_handoff_start", { userId, serverStep: step });
  }
  logColdStartStep("onboarding_paywall_handoff_start", { userId });

  try {
    const writeOk = await setOnboardingStepRemote(userId, "paywall");
    if (!writeOk.ok) {
      if (__DEV__) {
        console.warn("[OnboardingState] post_auth_handoff_failed", {
          userId,
          error: writeOk.error?.message ?? "paywall_checkpoint_write_failed",
        });
      }
      logColdStartStep("onboarding_paywall_handoff_failed", {
        userId,
        message: writeOk.error?.message ?? "paywall_checkpoint_write_failed",
      });
      /** Keep marker so resolver retry / cold start can re-attempt. */
      return incoming;
    }

    await clearPendingPaywallHandoffMarker();
    const fresh = await resolveOnboardingStatus(userId);
    if (__DEV__) {
      console.log("[OnboardingState] post_auth_handoff_success", {
        userId,
        status: fresh.status,
        onboardingStep: fresh.onboardingStep,
      });
    }
    logColdStartStep("onboarding_paywall_handoff_success", {
      userId,
      onboardingStep: fresh.onboardingStep,
    });
    return fresh;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (__DEV__) {
      console.warn("[OnboardingState] post_auth_handoff_throw", { userId, message: msg });
    }
    logColdStartStep("onboarding_paywall_handoff_failed", { userId, message: msg, threw: true });
    return incoming;
  }
}

/**
 * Direct paywall checkpoint sync right after save-progress auth (before navigation).
 * Ensures `setOnboardingStepRemote` runs even if the resolver is still mid-flight.
 * Idempotent with the resolver hand-off.
 */
export async function syncPaywallCheckpointAfterSaveProgressAuth(): Promise<{
  ok: boolean;
  error?: string;
}> {
  const uid = (await getSupabaseClient().auth.getSession()).data.session?.user?.id;
  if (!uid) return { ok: false, error: "no-session" };

  if (__DEV__) {
    console.log("[OnboardingState] post_auth_handoff_checkpoint_sync_attempt", {
      userId: uid,
    });
  }

  try {
    let resolved = await resolveOnboardingStatus(uid);
    if (resolved.status === "missing") {
      const created = await createMissingProfileRow(uid);
      if (!created.ok) {
        return { ok: false, error: created.error?.message ?? "create_profile_failed" };
      }
      resolved = await resolveOnboardingStatus(uid);
    }

    if (resolved.status === "complete" || resolved.onboardingCompleted === true) {
      await clearPendingPaywallHandoffMarker();
      return { ok: true };
    }

    if (resolved.status !== "incomplete") {
      return { ok: false, error: `unexpected_status:${resolved.status}` };
    }

    const writeOk = await setOnboardingStepRemote(uid, "paywall");
    if (!writeOk.ok) {
      return {
        ok: false,
        error: writeOk.error?.message ?? "paywall_checkpoint_write_failed",
      };
    }

    const fresh = await resolveOnboardingStatus(uid);

    useOnboardingAuthorityStore.getState().setResolved(
      uid,
      fresh.status,
      fresh.onboardingCompleted,
      fresh.onboardingStep,
      fresh.updatedAt,
      fresh.error?.message,
    );

    await clearPendingPaywallHandoffMarker();

    if (__DEV__) {
      console.log("[OnboardingState] post_auth_handoff_checkpoint_sync_ok", {
        userId: uid,
        onboardingStep: fresh.onboardingStep,
      });
    }
    logColdStartStep("onboarding_paywall_checkpoint_sync_ok", {
      userId: uid,
      onboardingStep: fresh.onboardingStep,
    });
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
