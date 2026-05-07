describe("DISABLE_TRACK_NAVIGATION_AFTER_SAVE", () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock("../src/features/food-logging/post-save-debug-flags");
  });

  it("replaceHomeAfterMealLog does not call router.replace when flag is true", () => {
    jest.doMock("../src/features/food-logging/post-save-debug-flags", () => ({
      ...jest.requireActual<typeof import("../src/features/food-logging/post-save-debug-flags")>(
        "../src/features/food-logging/post-save-debug-flags"
      ),
      DISABLE_TRACK_NAVIGATION_AFTER_SAVE: true,
    }));

    const {
      replaceHomeAfterMealLog,
      getLastMealLogNavigationMethod,
      resetLastMealLogNavigationMethodForTests,
    } = require("../src/features/food-logging/safe-return-after-meal-log");

    resetLastMealLogNavigationMethodForTests();

    const replace = jest.fn();
    replaceHomeAfterMealLog(
      { replace } as any,
      { pathname: "/(modals)/confirm-meal", segments: ["(modals)", "confirm-meal"] }
    );

    expect(replace).not.toHaveBeenCalled();
    expect(getLastMealLogNavigationMethod()).toBe("none");
  });
});
