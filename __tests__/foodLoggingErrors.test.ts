import {
  captureFoodLoggingError,
  addFoodLoggingBreadcrumb,
} from "../src/infrastructure/errorReporting/foodLoggingErrors";

const captureException = jest.fn();
const addBreadcrumb = jest.fn();

jest.mock("../src/infrastructure/errorReporting/factory", () => ({
  initErrorReporting: jest.fn(),
  getErrorReporter: () => ({
    captureException,
    addBreadcrumb,
    isEnabled: () => true,
  }),
}));

describe("foodLoggingErrors", () => {
  beforeEach(() => {
    captureException.mockClear();
    addBreadcrumb.mockClear();
  });

  it("captureFoodLoggingError forwards tags and scrubbed extras", () => {
    captureFoodLoggingError(new Error("boom"), {
      flow: "confirm_meal",
      step: "unit_test",
      route: "/(modals)/confirm-meal",
      foodTitle: "x".repeat(100),
      calories: 10,
    });

    expect(captureException).toHaveBeenCalledTimes(1);
    const [err, ctx] = captureException.mock.calls[0];
    expect((err as Error).message).toBe("boom");
    expect(ctx.tags).toMatchObject({
      area: "food_logging",
      flow: "confirm_meal",
      step: "unit_test",
      route: "/(modals)/confirm-meal",
    });
    expect(ctx.extra.food_title).toMatch(/^x{80}…$/);
  });

  it("addFoodLoggingBreadcrumb uses food_logging category", () => {
    addFoodLoggingBreadcrumb("food_logging.unit_test", { ok: true });
    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "food_logging.unit_test",
        category: "food_logging",
      })
    );
  });
});
