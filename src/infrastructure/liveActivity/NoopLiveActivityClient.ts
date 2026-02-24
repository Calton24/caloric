/**
 * NoopLiveActivityClient
 * Safe default — always returns "unavailable".
 * Used when liveActivity is disabled by config or platform is not iOS.
 */

import type {
    LAEndResult,
    LAStartResult,
    LAUpdateResult,
    LiveActivityClient,
    LiveActivityProps,
} from "./types";

export class NoopLiveActivityClient implements LiveActivityClient {
  start(
    _name: string,
    _props: LiveActivityProps,
    _url?: string
  ): LAStartResult {
    return { status: "unavailable", reason: "noop" };
  }

  update(
    _activityId: string,
    _name: string,
    _props: LiveActivityProps
  ): LAUpdateResult {
    return { status: "unavailable", reason: "noop" };
  }

  end(_activityId: string, _name: string): LAEndResult {
    return { status: "unavailable", reason: "noop" };
  }

  isSupported(): boolean {
    return false;
  }
}
