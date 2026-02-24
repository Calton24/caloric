import { getMonitor, initMaintenance, resetMaintenance } from "./factory";
import { NoopMaintenanceClient } from "./NoopMaintenanceClient";
import { PostHogMaintenanceClient } from "./PostHogMaintenanceClient";
import { RemoteJsonMaintenanceClient } from "./RemoteJsonMaintenanceClient";
import { SupabaseHealthMonitor } from "./SupabaseHealthMonitor";

// Mock config gating — default: maintenance enabled
jest.mock("../../config", () => ({
  getAppConfig: () => ({
    app: { profile: "test" },
    features: { maintenance: true },
  }),
}));

describe("maintenance factory", () => {
  beforeEach(() => {
    resetMaintenance();
    delete process.env.EXPO_PUBLIC_MAINTENANCE_URL;
    delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("returns the same instance on repeated init", () => {
    const a = initMaintenance();
    const b = initMaintenance();
    expect(a).toBe(b);
  });

  it("returns Noop when no env vars are set", () => {
    const client = initMaintenance();
    expect(client).toBeInstanceOf(NoopMaintenanceClient);
  });

  it("returns RemoteJsonMaintenanceClient when MAINTENANCE_URL is set", () => {
    process.env.EXPO_PUBLIC_MAINTENANCE_URL = "https://example.com/status.json";
    const client = initMaintenance();
    expect(client).toBeInstanceOf(RemoteJsonMaintenanceClient);
  });

  it("returns PostHogMaintenanceClient when POSTHOG_API_KEY is set (no URL)", () => {
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY = "phc_test_key";
    const client = initMaintenance();
    expect(client).toBeInstanceOf(PostHogMaintenanceClient);
  });

  it("prefers RemoteJson over PostHog when both are set", () => {
    process.env.EXPO_PUBLIC_MAINTENANCE_URL = "https://example.com/status.json";
    process.env.EXPO_PUBLIC_POSTHOG_API_KEY = "phc_test_key";
    const client = initMaintenance();
    expect(client).toBeInstanceOf(RemoteJsonMaintenanceClient);
  });

  it("starts outage monitor when SUPABASE_URL and SUPABASE_ANON_KEY are present", () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key-xxx";
    initMaintenance();
    const monitor = getMonitor();
    expect(monitor).toBeInstanceOf(SupabaseHealthMonitor);
  });

  it("does not start outage monitor when SUPABASE_URL is missing", () => {
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "anon-key-xxx";
    initMaintenance();
    expect(getMonitor()).toBeNull();
  });
});

describe("maintenance factory gating", () => {
  beforeEach(() => {
    delete process.env.EXPO_PUBLIC_MAINTENANCE_URL;
    delete process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
  });

  it("forces Noop when config.features.maintenance is false", () => {
    jest.resetModules();
    jest.doMock("../../config", () => ({
      getAppConfig: () => ({
        app: { profile: "test" },
        features: { maintenance: false },
      }),
    }));

    const {
      initMaintenance: initAgain,
      resetMaintenance: resetAgain,
    } = require("./factory");
    const { NoopMaintenanceClient: Noop } = require("./NoopMaintenanceClient");

    resetAgain();
    process.env.EXPO_PUBLIC_MAINTENANCE_URL = "https://example.com/status.json";

    const client = initAgain();
    expect(client).toBeInstanceOf(Noop);
  });
});
