/**
 * @jest-environment node
 */

jest.mock("expo-device", () => ({
  get modelId() {
    return (globalThis as { __testModelId?: string }).__testModelId ?? "";
  },
  get modelName() {
    return (globalThis as { __testModelName?: string | null }).__testModelName ?? null;
  },
  DeviceType: { PHONE: 1, TABLET: 2 },
  get deviceType() {
    return 1;
  },
}));

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
}));

import { iosPhoneHasNotchOrDynamicIsland } from "./iphoneNotchOrDynamicIsland";

function setDeviceModel(modelId: string, modelName: string | null = null) {
  (globalThis as { __testModelId?: string }).__testModelId = modelId;
  (globalThis as { __testModelName?: string | null }).__testModelName =
    modelName;
}

describe("iosPhoneHasNotchOrDynamicIsland", () => {
  beforeEach(() => {
    setDeviceModel("", null);
  });

  it("returns false when modelId is empty and modelName is not a match", () => {
    setDeviceModel("", "Unknown");
    expect(iosPhoneHasNotchOrDynamicIsland()).toBe(false);
  });

  it("returns true for iPhone 16 Pro (iPhone17,1)", () => {
    setDeviceModel("iPhone17,1");
    expect(iosPhoneHasNotchOrDynamicIsland()).toBe(true);
  });

  it("returns true for iPhone 14 (notch class)", () => {
    setDeviceModel("iPhone14,7");
    expect(iosPhoneHasNotchOrDynamicIsland()).toBe(true);
  });

  it("returns false for iPhone SE (3rd gen)", () => {
    setDeviceModel("iPhone14,6");
    expect(iosPhoneHasNotchOrDynamicIsland()).toBe(false);
  });

  it("returns true for iPhone X via modelId", () => {
    setDeviceModel("iPhone10,3");
    expect(iosPhoneHasNotchOrDynamicIsland()).toBe(true);
  });

  it("returns false for iPhone 8 class via modelId", () => {
    setDeviceModel("iPhone10,1");
    expect(iosPhoneHasNotchOrDynamicIsland()).toBe(false);
  });

  it("falls back to modelName when modelId is not parseable", () => {
    setDeviceModel("bogus", "iPhone 13");
    expect(iosPhoneHasNotchOrDynamicIsland()).toBe(true);
  });
});
