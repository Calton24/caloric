import {
  __resetFoodTrackingDebounceForTests,
  safeOpenFoodTracking,
} from "../src/navigation/safeOpenFoodTracking";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    push: (...args: unknown[]) => mockPush(...args),
  },
}));

jest.mock("../src/infrastructure/haptics", () => ({
  haptics: { impact: jest.fn() },
}));

jest.mock("../src/infrastructure/errorReporting/foodLoggingErrors", () => ({
  addFoodLoggingBreadcrumb: jest.fn(),
  captureFoodLoggingError: jest.fn(),
}));

describe("safeOpenFoodTracking", () => {
  beforeEach(() => {
    __resetFoodTrackingDebounceForTests();
    mockPush.mockClear();
  });

  it("pushes tracking modal href", () => {
    safeOpenFoodTracking({ source: "home_fab", currentRoute: "/(tabs)" });
    expect(mockPush).toHaveBeenCalledWith("/(modals)/tracking");
  });

  it("does not throw when navigation fails", () => {
    mockPush.mockImplementationOnce(() => {
      throw new Error("nav failed");
    });
    expect(() =>
      safeOpenFoodTracking({ source: "home_fab" })
    ).not.toThrow();
  });
});
