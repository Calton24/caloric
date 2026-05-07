/**
 * @jest-environment node
 *
 * FOOD_LOG_SAFE_MODE is currently hard-coded `true` while we bisect the
 * post-Track-Calories crash on device. These tests pin that contract so a
 * future flip back to `false` is a deliberate, reviewed change rather than
 * a silent regression.
 *
 * Current matrix step: Bisect Run 1 — simple meal rows on full RealHome
 *   FOOD_LOG_SAFE_MODE          = true
 *   FOOD_LOG_RENDER_FAKE_HOME   = false
 *   HOME_SAFE_DISABLE_MEAL_LIST = false (others still true → homeBisectUseSimpleMealRows)
 *   FOOD_LOG_POST_SAVE_NAV_MODE = "dismissAll"
 */
describe("safe-mode-flags", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const flags = require("../src/features/debug/safe-mode-flags");

  it("FOOD_LOG_SAFE_MODE is hard-coded true", () => {
    expect(flags.FOOD_LOG_SAFE_MODE).toBe(true);
  });

  it("FOOD_LOG_RENDER_FAKE_HOME is false for Run D matrix entry", () => {
    expect(flags.FOOD_LOG_RENDER_FAKE_HOME).toBe(false);
  });

  it("FOOD_LOG_POST_SAVE_NAV_MODE is 'dismissAll' for Run D", () => {
    expect(flags.FOOD_LOG_POST_SAVE_NAV_MODE).toBe("dismissAll");
  });

  it("HOME_SAFE_DISABLE_MEAL_LIST is false for Run 1 (meal surface bisect)", () => {
    expect(flags.HOME_SAFE_DISABLE_MEAL_LIST).toBe(false);
  });

  it("homeBisectUseSimpleMealRows is true under Run 1 flags", () => {
    expect(flags.homeBisectUseSimpleMealRows()).toBe(true);
  });

  it("assertFoodLogSafeModeImport logs the flag value", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      flags.assertFoodLogSafeModeImport("test_site");
      const matched = spy.mock.calls.some((args) => {
        const line = args.map(String).join(" ");
        return (
          line.includes("[FoodLogSafeModeImport]") &&
          line.includes('site="test_site"') &&
          line.includes("FOOD_LOG_SAFE_MODE=")
        );
      });
      expect(matched).toBe(true);
    } finally {
      spy.mockRestore();
    }
  });
});
