import {
  resetAppleHealthFoodWriteCircuitBreakerForTests,
  saveFoodToAppleHealthSafely,
} from "./save-food-to-apple-health-safely";

const mockWriteCalories = jest.fn();
const mockCaptureError = jest.fn();
const mockBreadcrumb = jest.fn();

jest.mock("./health.factory", () => ({
  getHealthService: () => ({
    writeCalories: mockWriteCalories,
  }),
}));

jest.mock("../../infrastructure/errorReporting/foodLoggingErrors", () => ({
  addFoodLoggingBreadcrumb: (...args: unknown[]) => mockBreadcrumb(...args),
  captureFoodLoggingError: (...args: unknown[]) => mockCaptureError(...args),
}));

describe("saveFoodToAppleHealthSafely", () => {
  beforeEach(() => {
    resetAppleHealthFoodWriteCircuitBreakerForTests();
    mockWriteCalories.mockReset();
    mockCaptureError.mockReset();
    mockBreadcrumb.mockReset();
  });

  it("skips when not force-enabled and env flag is off", async () => {
    const prev = process.env.EXPO_PUBLIC_HEALTHKIT_FOOD_WRITE_ENABLED;
    process.env.EXPO_PUBLIC_HEALTHKIT_FOOD_WRITE_ENABLED = "0";
    const result = await saveFoodToAppleHealthSafely({
      id: "m0",
      title: "Meal",
      calories: 100,
      loggedAt: "2026-05-08T10:00:00.000Z",
    });
    process.env.EXPO_PUBLIC_HEALTHKIT_FOOD_WRITE_ENABLED = prev;
    expect(result).toEqual({ ok: false, skipped: true, reason: "disabled_by_config" });
    expect(mockWriteCalories).not.toHaveBeenCalled();
  });

  it("does not call native module for invalid payload", async () => {
    const result = await saveFoodToAppleHealthSafely(
      {
        id: "m1",
        title: "",
        calories: null,
        loggedAt: "2026-05-08T10:00:00.000Z",
      },
      { forceEnable: true }
    );
    expect(result).toEqual({ ok: false, skipped: true, reason: "invalid_payload" });
    expect(mockWriteCalories).not.toHaveBeenCalled();
  });

  it("passes WriteDietaryEnergySampleInput to the health service", async () => {
    mockWriteCalories.mockResolvedValueOnce(undefined);
    const result = await saveFoodToAppleHealthSafely(
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
    );
    expect(result).toEqual({ ok: true });
    expect(mockWriteCalories).toHaveBeenCalledTimes(1);
    const arg = mockWriteCalories.mock.calls[0][0];
    expect(arg.foodName).toBe("Meal");
    expect(arg.mealType).toBe("Lunch");
    expect(arg.energyKcal).toBe(450);
    expect(arg.proteinG).toBe(20);
    expect(arg.carbohydratesG).toBe(40);
    expect(arg.fatG).toBe(10);
    expect(arg.date).toBeInstanceOf(Date);
  });

  it("captures and blocks after native errors without throwing", async () => {
    mockWriteCalories.mockRejectedValueOnce(new Error("native fail"));
    const result = await saveFoodToAppleHealthSafely(
      {
        id: "m3",
        title: "Meal",
        calories: 200,
        loggedAt: "2026-05-08T10:00:00.000Z",
      },
      { forceEnable: true }
    );
    expect(result.ok).toBe(false);
    if (!result.ok && "error" in result) {
      expect(result.error).toBeInstanceOf(Error);
    }
    expect(mockCaptureError).toHaveBeenCalled();
    const blocked = await saveFoodToAppleHealthSafely(
      {
        id: "m4",
        title: "Meal",
        calories: 200,
        loggedAt: "2026-05-08T10:00:00.000Z",
      },
      { forceEnable: true }
    );
    expect(blocked).toEqual({ ok: false, skipped: true, reason: "healthkit_blocked" });
  });
});
