import { saveFoodToAppleHealthSafely } from "./save-food-to-apple-health-safely";

const mockWriteCalories = jest.fn();
const mockReportError = jest.fn();
const mockBreadcrumb = jest.fn();

jest.mock("./health.factory", () => ({
  getHealthService: () => ({
    writeCalories: mockWriteCalories,
  }),
}));

jest.mock("../../infrastructure/errorReporting", () => ({
  reportError: (...args: unknown[]) => mockReportError(...args),
}));

jest.mock("../../infrastructure/errorReporting/foodLoggingErrors", () => ({
  addFoodLoggingBreadcrumb: (...args: unknown[]) => mockBreadcrumb(...args),
}));

describe("saveFoodToAppleHealthSafely", () => {
  beforeEach(() => {
    mockWriteCalories.mockReset();
    mockReportError.mockReset();
    mockBreadcrumb.mockReset();
  });

  it("does not call native module for invalid payload", async () => {
    await expect(
      saveFoodToAppleHealthSafely(
        {
          id: "m1",
          title: "",
          calories: null,
          loggedAt: "2026-05-08T10:00:00.000Z",
        },
        { forceEnable: true }
      )
    ).resolves.toBeUndefined();
    expect(mockWriteCalories).not.toHaveBeenCalled();
  });

  it("catches native errors and does not throw", async () => {
    mockWriteCalories.mockRejectedValueOnce(new Error("native fail"));
    await expect(
      saveFoodToAppleHealthSafely(
        {
          id: "m2",
          title: "Meal",
          calories: 450,
          protein: 20,
          carbs: 40,
          fat: 10,
          loggedAt: "2026-05-08T10:00:00.000Z",
        },
        { forceEnable: true }
      )
    ).resolves.toBeUndefined();
    expect(mockWriteCalories).toHaveBeenCalledTimes(1);
    expect(mockReportError).toHaveBeenCalled();
  });
});

