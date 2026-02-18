/**
 * Mobile Core E2E Tests
 * Smoke test to validate app launches without crashing
 */

import { device } from "detox";

describe("Mobile Core E2E", () => {
  it("should launch the app successfully without crashing", async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { notifications: "YES" },
    });
    
    // If we get here, app launched successfully
    // Wait 2 seconds to ensure no immediate crash
    await new Promise((resolve) => setTimeout(resolve, 2000));
  });
});
