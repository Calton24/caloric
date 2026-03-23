/**
 * Camera Log Helpers
 *
 * Pure utility functions extracted from camera-log screen
 * for testability and reuse.
 */

/**
 * Deactivate the camera before navigating away.
 * VisionCamera on iOS keeps the AVCaptureSession alive until
 * `isActive` becomes false. If we navigate while it's still
 * active, the session teardown blocks the main thread (~7s).
 *
 * This helper ensures deactivation runs first, then navigates.
 */
export async function deactivateCameraBeforeDismiss(
  deactivate: () => void,
  navigate: () => void
): Promise<void> {
  try {
    deactivate();
  } catch {
    // Camera may already be released — proceed anyway
  }
  // Allow one frame for the camera to release before navigation
  await new Promise<void>((resolve) => setTimeout(resolve, 50));
  navigate();
}

/**
 * Compute a normalized focus point (0–1) from a tap event.
 *
 * @param tapX - Raw X coordinate of the tap
 * @param tapY - Raw Y coordinate of the tap
 * @param layoutW - Width of the camera view
 * @param layoutH - Height of the camera view
 * @returns Normalized { x, y } clamped to [0, 1]
 */
export function computeFocusPoint(
  tapX: number,
  tapY: number,
  layoutW: number,
  layoutH: number
): { x: number; y: number } {
  if (layoutW <= 0 || layoutH <= 0) {
    return { x: 0.5, y: 0.5 };
  }
  return {
    x: Math.max(0, Math.min(1, tapX / layoutW)),
    y: Math.max(0, Math.min(1, tapY / layoutH)),
  };
}
