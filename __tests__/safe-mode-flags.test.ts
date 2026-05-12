/**
 * @jest-environment node
 *
 * Post-bisect defaults (post-Track-Calories crash fixed via nav mode):
 *   FOOD_LOG_SAFE_MODE          = false  (cloud restore must never be skipped)
 *   FOOD_LOG_RENDER_FAKE_HOME   = false
 *   FOOD_LOG_POST_SAVE_NAV_MODE = "dismissAll"
 *
 * HOME_SAFE_* flags may still be true from bisect; they only affect the shell
 * when FOOD_LOG_SAFE_MODE is true. Flipping safe mode back on for isolation
 * should be a deliberate, reviewed change — these tests pin the stable defaults.
 */
describe("safe-mode-flags", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const flags = require("../src/features/debug/safe-mode-flags");

  it("FOOD_LOG_SAFE_MODE is off after bisect (do not ship true without cloud-restore policy)", () => {
    expect(flags.FOOD_LOG_SAFE_MODE).toBe(false);
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

  it("homeBisectUseSimpleMealRows is false when FOOD_LOG_SAFE_MODE is off", () => {
    expect(flags.homeBisectUseSimpleMealRows()).toBe(false);
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
