/**
 * Tests for the region detection service.
 */

// Mock expo-localization before imports
import {
    clearFoodRegion,
    getFoodRegion,
    getFoodRegionSync,
    initFoodRegion,
    setFoodRegion,
} from "../src/features/nutrition/matching/region.service";

jest.mock("expo-localization", () => ({
  getLocales: jest.fn(() => [
    { languageTag: "en-GB", languageCode: "en", regionCode: "GB" },
  ]),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: jest.fn(() => Promise.resolve(null)),
    setItem: jest.fn(() => Promise.resolve()),
    removeItem: jest.fn(() => Promise.resolve()),
  },
}));

// Reset module state between tests
beforeEach(() => {
  jest.resetModules();
});

describe("region.service", () => {
  it("detects GB region from device locale", async () => {
    const region = await getFoodRegion();
    expect(region).toBe("gb");
  });

  it("getFoodRegionSync returns cached region after init", async () => {
    await initFoodRegion();
    expect(getFoodRegionSync()).toBe("gb");
  });

  it("setFoodRegion overrides detected region", async () => {
    await setFoodRegion("pl");
    const region = await getFoodRegion();
    expect(region).toBe("pl");
  });

  it("setFoodRegion rejects invalid codes", async () => {
    await setFoodRegion("pl"); // valid
    await setFoodRegion("zz"); // invalid
    expect(getFoodRegionSync()).toBe("pl"); // should stay "pl"
  });

  it("clearFoodRegion reverts to device detection", async () => {
    await setFoodRegion("es");
    expect(getFoodRegionSync()).toBe("es");

    await clearFoodRegion();
    const region = await getFoodRegion();
    // After clearing, it re-detects from device → "gb"
    expect(region).toBe("gb");
  });
});
