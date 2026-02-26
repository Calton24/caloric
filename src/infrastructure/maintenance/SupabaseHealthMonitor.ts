/**
 * SupabaseHealthMonitor
 *
 * Automatic outage detection that does NOT import the Supabase SDK.
 * Instead it performs raw HTTP health checks against the Supabase REST
 * or Auth health endpoint.
 *
 * Escalation:
 *   - 3 consecutive failures  → mode="degraded", reason="supabase_unreachable"
 *   - 6 consecutive failures  → mode="maintenance", reason="supabase_unreachable"
 *   - 2 consecutive successes → mode="normal" (unless a manual override is active)
 *
 * This monitor is OPTIONAL and gated by the factory:
 *   features.maintenance === true AND presence of SUPABASE_URL + SUPABASE_ANON_KEY
 */

import { DEFAULT_MAINTENANCE_STATE, type MaintenanceState } from "./types";

/** How long to wait for a Supabase response before considering it failed */
const HEALTH_TIMEOUT_MS = 2_000;

/** Default poll interval */
const DEFAULT_POLL_MS = 30_000;

/** Consecutive failures before degraded */
const DEGRADED_THRESHOLD = 3;

/** Consecutive failures before full maintenance */
const MAINTENANCE_THRESHOLD = 6;

/** Consecutive successes required to recover */
const RECOVERY_THRESHOLD = 2;

export type HealthListener = (state: MaintenanceState) => void;

export class SupabaseHealthMonitor {
  private readonly url: string;
  private readonly anonKey: string;
  private readonly pollMs: number;

  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private currentState: MaintenanceState = { ...DEFAULT_MAINTENANCE_STATE };
  private timer: ReturnType<typeof setInterval> | null = null;
  private listeners = new Set<HealthListener>();

  constructor(
    supabaseUrl: string,
    anonKey: string,
    pollMs: number = DEFAULT_POLL_MS
  ) {
    // Use the auth health endpoint (lightweight, no auth required)
    this.url = `${supabaseUrl.replace(/\/$/, "")}/auth/v1/health`;
    this.anonKey = anonKey;
    this.pollMs = pollMs;
  }

  /** Start polling. Safe to call multiple times. */
  start(): void {
    if (this.timer) return;

    // Immediate first check
    void this.check();
    this.timer = setInterval(() => void this.check(), this.pollMs);

    if (__DEV__) {
      console.log(
        `[Maintenance] SupabaseHealthMonitor started (poll=${this.pollMs}ms)`
      );
    }
  }

  /** Stop polling and reset counters. */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.consecutiveFailures = 0;
    this.consecutiveSuccesses = 0;
    this.currentState = { ...DEFAULT_MAINTENANCE_STATE };
  }

  /** Get the monitor's current assessed state. */
  getState(): MaintenanceState {
    return this.currentState;
  }

  /** Register a listener. Returns unsubscribe fn. */
  subscribe(listener: HealthListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Run one health check on demand (used by debug panel). */
  async checkOnce(): Promise<void> {
    return this.check();
  }

  /** Perform a single health check. Exposed for testing. */
  async check(): Promise<void> {
    const healthy = await this.ping();

    if (healthy) {
      this.consecutiveFailures = 0;
      this.consecutiveSuccesses++;

      if (this.consecutiveSuccesses >= RECOVERY_THRESHOLD) {
        this.transition({
          ...DEFAULT_MAINTENANCE_STATE,
          updatedAt: Date.now(),
        });
      }
    } else {
      this.consecutiveSuccesses = 0;
      this.consecutiveFailures++;

      if (this.consecutiveFailures >= MAINTENANCE_THRESHOLD) {
        this.transition({
          mode: "maintenance",
          reason: "supabase_unreachable",
          message:
            "Our servers are currently unreachable. Please try again later.",
          blockedFeatures: ["growth", "realtime", "uploads", "writes"],
          updatedAt: Date.now(),
        });
      } else if (this.consecutiveFailures >= DEGRADED_THRESHOLD) {
        this.transition({
          mode: "degraded",
          reason: "supabase_unreachable",
          message: "Some features may be temporarily unavailable.",
          blockedFeatures: ["growth", "realtime"],
          updatedAt: Date.now(),
        });
      }
    }
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private async ping(): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);

    try {
      const response = await fetch(this.url, {
        method: "GET",
        headers: {
          apikey: this.anonKey,
          Accept: "application/json",
        },
        signal: controller.signal,
      });

      return response.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private transition(next: MaintenanceState): void {
    const prev = this.currentState;

    // Don't emit if nothing changed
    if (prev.mode === next.mode && prev.reason === next.reason) return;

    this.currentState = next;

    for (const listener of this.listeners) {
      try {
        listener(next);
      } catch {
        // Listener errors must not crash the monitor
      }
    }
  }
}
