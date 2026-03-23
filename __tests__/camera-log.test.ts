/**
 * Camera Log Screen — Unit Tests
 *
 * TDD tests for:
 * 1. Fast dismiss: camera deactivated before navigation
 * 2. Tap-to-focus: focus point is set on tap
 */

import {
  deactivateCameraBeforeDismiss,
  computeFocusPoint,
} from "../src/features/camera/camera-log.helpers";

describe("Camera Log Helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Fast dismiss ────────────────────────────────────────────

  describe("deactivateCameraBeforeDismiss", () => {
    it("should call the deactivation callback before triggering navigation", async () => {
      const order: string[] = [];
      const deactivate = jest.fn(() => {
        order.push("deactivate");
      });
      const navigate = jest.fn(() => {
        order.push("navigate");
      });

      await deactivateCameraBeforeDismiss(deactivate, navigate);

      expect(deactivate).toHaveBeenCalledTimes(1);
      expect(navigate).toHaveBeenCalledTimes(1);
      expect(order).toEqual(["deactivate", "navigate"]);
    });

    it("should still navigate even if deactivation throws", async () => {
      const deactivate = jest.fn(() => {
        throw new Error("camera error");
      });
      const navigate = jest.fn();

      await deactivateCameraBeforeDismiss(deactivate, navigate);

      expect(navigate).toHaveBeenCalledTimes(1);
    });
  });

  // ── Tap-to-focus ────────────────────────────────────────────

  describe("computeFocusPoint", () => {
    it("should compute normalized focus coordinates from tap position and layout", () => {
      const point = computeFocusPoint(150, 300, 375, 812);
      expect(point).toEqual({ x: 150 / 375, y: 300 / 812 });
    });

    it("should clamp values between 0 and 1", () => {
      const point = computeFocusPoint(-10, 900, 375, 812);
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(point.y).toBeGreaterThanOrEqual(0);
      expect(point.y).toBeLessThanOrEqual(1);
    });

    it("should return center if layout dimensions are zero", () => {
      const point = computeFocusPoint(100, 200, 0, 0);
      expect(point).toEqual({ x: 0.5, y: 0.5 });
    });
  });
});
