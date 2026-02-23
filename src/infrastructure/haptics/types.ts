/**
 * Haptics - Type Definitions
 * Provider-agnostic haptic feedback interface
 */

export type ImpactStyle = "light" | "medium" | "heavy" | "soft" | "rigid";
export type NotificationStyle = "success" | "warning" | "error";

/**
 * Provider-agnostic haptics interface
 */
export interface HapticsClient {
  /**
   * Trigger impact feedback
   * @param style - The intensity/style of impact
   */
  impact(style?: ImpactStyle): Promise<void>;

  /**
   * Trigger notification feedback
   * @param type - The type of notification
   */
  notification(type: NotificationStyle): Promise<void>;

  /**
   * Trigger selection feedback (light tick)
   */
  selection(): Promise<void>;

  /**
   * Check if haptics are supported on this device
   */
  isSupported(): boolean;

  /**
   * Get the provider kind
   */
  readonly kind: "expo" | "noop";
}
