/**
 * Live Activity — Contract
 *
 * Abstraction over iOS Live Activities (Dynamic Island + Lock Screen).
 *
 * Resolution order:
 *   1. NativeLiveActivityClient — local Expo module → ActivityKit (Dynamic Island)
 *   2. ExpoWidgetsLiveActivityClient — expo-widgets fallback
 *   3. NoopLiveActivityClient — safe default
 *
 * The factory only activates when:
 *   1. features.liveActivity === true
 *   2. Platform.OS === "ios"
 *   3. A native module is available (dev build, not Expo Go)
 */

// ---------- Payload for Live Activity content ----------

/**
 * Generic props to send to a Live Activity.
 * The shape matches what your widget component expects.
 * Using Record<string, unknown> keeps the contract flexible —
 * concrete types are defined in fork-specific widget components.
 */
export type LiveActivityProps = Record<string, unknown>;

// ---------- Result types ----------

export type LAStartResult =
  | { status: "started"; activityId: string }
  | { status: "unavailable"; reason: string }
  | { status: "denied"; reason: string };

export type LAUpdateResult =
  | { status: "updated" }
  | { status: "unavailable"; reason: string };

export type LAEndResult =
  | { status: "ended" }
  | { status: "unavailable"; reason: string };

// ---------- Client contract ----------

export interface LiveActivityClient {
  /**
   * Start a new Live Activity.
   * @param name - Must match the widget name in app.config.ts
   * @param props - Data passed to the Live Activity component
   * @param url - Optional deep link URL when tapped
   */
  start(name: string, props: LiveActivityProps, url?: string): LAStartResult;

  /**
   * Update an existing Live Activity.
   * @param activityId - ID returned from start()
   * @param name - Widget name
   * @param props - Updated data
   */
  update(
    activityId: string,
    name: string,
    props: LiveActivityProps
  ): LAUpdateResult;

  /**
   * End a Live Activity.
   * @param activityId - ID returned from start()
   * @param name - Widget name
   */
  end(activityId: string, name: string): LAEndResult;

  /** Whether this provider can start Live Activities */
  isSupported(): boolean;
}
