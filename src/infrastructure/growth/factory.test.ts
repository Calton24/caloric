import { initGrowth, resetGrowth } from "./factory";
import { NoopGrowthClient } from "./providers/NoopGrowthClient";

jest.mock("../../config", () => ({
  getAppConfig: () => ({
    app: { profile: "test" },
    features: { growth: true },
  }),
}));

describe("growth factory", () => {
  beforeEach(() => {
    resetGrowth();
    delete process.env.EXPO_PUBLIC_GROWTH_PROVIDER;
  });

  it("returns the same instance on repeated init", () => {
    const a = initGrowth();
    const b = initGrowth();
    expect(a).toBe(b);
  });

  it("returns Noop when enabled but missing backend", () => {
    const client = initGrowth();
    expect(client).toBeInstanceOf(NoopGrowthClient);
  });

  it("logs enabled_missing_backend mode", () => {
    const spy = jest.spyOn(console, "log").mockImplementation(() => {});
    initGrowth();
    expect(spy).toHaveBeenCalledWith("[Growth] mode=enabled_missing_backend");
    spy.mockRestore();
  });

  it("uses Supabase provider when configured", () => {
    process.env.EXPO_PUBLIC_GROWTH_PROVIDER = "supabase";
    const client = initGrowth();
    expect((client as any).kind).toBe("supabase");
  });
});

describe("growth factory gating", () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_GROWTH_PROVIDER;
  });

  it("forces Noop when config.features.growth is false", () => {
    jest.resetModules();
    jest.doMock("../../config", () => ({
      getAppConfig: () => ({
        app: { profile: "test" },
        features: { growth: false },
      }),
    }));

    const {
      initGrowth: initAgain,
      resetGrowth: resetAgain,
    } = require("./factory");
    const { NoopGrowthClient: Noop } = require("./providers/NoopGrowthClient");

    resetAgain();
    process.env.EXPO_PUBLIC_GROWTH_PROVIDER = "supabase";

    const client = initAgain();
    expect(client).toBeInstanceOf(Noop);
  });
});
