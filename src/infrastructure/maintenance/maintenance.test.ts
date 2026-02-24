import {
    getMaintenanceClient,
    IMPLICIT_SUPABASE_BLOCKS,
    maintenance,
    resetProxy,
    setHealthMonitor,
    setMaintenanceClient,
} from "./maintenance";
import { NoopMaintenanceClient } from "./NoopMaintenanceClient";
import type { MaintenanceClient, MaintenanceState } from "./types";

// Mock AsyncStorage for setLocalOverride persistence
const mockAsyncStorage = {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
};
jest.mock("@react-native-async-storage/async-storage", () => ({
  default: mockAsyncStorage,
}));

describe("maintenance proxy", () => {
  beforeEach(() => {
    resetProxy();
    jest.clearAllMocks();
  });

  it("defaults to NoopMaintenanceClient", () => {
    expect(getMaintenanceClient()).toBeInstanceOf(NoopMaintenanceClient);
  });

  it("getState returns normal by default", async () => {
    const state = await maintenance.getState();
    expect(state.mode).toBe("normal");
  });

  it("delegates to the set client", async () => {
    const mockClient: MaintenanceClient = {
      getState: jest.fn().mockResolvedValue({
        mode: "degraded",
        message: "Testing",
        updatedAt: Date.now(),
      } satisfies MaintenanceState),
    };

    setMaintenanceClient(mockClient);
    const state = await maintenance.getState();

    expect(mockClient.getState).toHaveBeenCalledTimes(1);
    expect(state.mode).toBe("degraded");
    expect(state.message).toBe("Testing");
  });

  it("catches errors and returns default state", async () => {
    const failingClient: MaintenanceClient = {
      getState: jest.fn().mockRejectedValue(new Error("Boom")),
    };

    setMaintenanceClient(failingClient);
    const state = await maintenance.getState();

    expect(state.mode).toBe("normal");
    expect(state.updatedAt).toBeDefined();
  });

  it("swaps clients via setMaintenanceClient", () => {
    const customClient: MaintenanceClient = {
      getState: jest
        .fn()
        .mockResolvedValue({ mode: "maintenance", updatedAt: 0 }),
    };

    setMaintenanceClient(customClient);
    expect(getMaintenanceClient()).toBe(customClient);
  });
});

describe("maintenance proxy — local override", () => {
  beforeEach(() => {
    resetProxy();
    jest.clearAllMocks();
  });

  it("local override wins over provider state", async () => {
    const mockClient: MaintenanceClient = {
      getState: jest.fn().mockResolvedValue({ mode: "normal", updatedAt: 1 }),
    };
    setMaintenanceClient(mockClient);

    await maintenance.setLocalOverride({
      mode: "maintenance",
      message: "Manual override",
      reason: "manual_override",
      updatedAt: Date.now(),
    });

    const state = await maintenance.getState();
    expect(state.mode).toBe("maintenance");
    expect(state.message).toBe("Manual override");
  });

  it("clearing override restores provider state", async () => {
    const mockClient: MaintenanceClient = {
      getState: jest.fn().mockResolvedValue({ mode: "degraded", updatedAt: 1 }),
    };
    setMaintenanceClient(mockClient);

    await maintenance.setLocalOverride({
      mode: "maintenance",
      updatedAt: Date.now(),
    });
    expect((await maintenance.getState()).mode).toBe("maintenance");

    await maintenance.setLocalOverride(null);
    expect((await maintenance.getState()).mode).toBe("degraded");
  });

  it("persists override to AsyncStorage", async () => {
    await maintenance.setLocalOverride({
      mode: "read_only",
      updatedAt: Date.now(),
    });

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      "@mobile_core/maintenance_override",
      expect.stringContaining('"mode":"read_only"')
    );
  });

  it("removes persisted override on null", async () => {
    await maintenance.setLocalOverride(null);

    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(
      "@mobile_core/maintenance_override"
    );
  });
});

describe("maintenance proxy — outage monitor integration", () => {
  beforeEach(() => {
    resetProxy();
    jest.clearAllMocks();
  });

  it("outage monitor state wins over provider when not normal", async () => {
    const mockClient: MaintenanceClient = {
      getState: jest.fn().mockResolvedValue({ mode: "normal", updatedAt: 1 }),
    };
    setMaintenanceClient(mockClient);

    // Fake monitor
    const fakeMonitor = {
      getState: () => ({
        mode: "degraded" as const,
        reason: "supabase_unreachable" as const,
        updatedAt: Date.now(),
      }),
      start: jest.fn(),
      stop: jest.fn(),
      subscribe: jest.fn(() => () => {}),
      check: jest.fn(),
    };
    setHealthMonitor(fakeMonitor as any);

    const state = await maintenance.getState();
    expect(state.mode).toBe("degraded");
    expect(state.reason).toBe("supabase_unreachable");
  });

  it("local override wins over outage monitor", async () => {
    const fakeMonitor = {
      getState: () => ({
        mode: "maintenance" as const,
        reason: "supabase_unreachable" as const,
        updatedAt: Date.now(),
      }),
      start: jest.fn(),
      stop: jest.fn(),
      subscribe: jest.fn(() => () => {}),
      check: jest.fn(),
    };
    setHealthMonitor(fakeMonitor as any);

    await maintenance.setLocalOverride({
      mode: "degraded",
      reason: "manual_override",
      message: "Manual override trumps monitor",
      updatedAt: Date.now(),
    });

    const state = await maintenance.getState();
    expect(state.mode).toBe("degraded");
    expect(state.reason).toBe("manual_override");
  });
});

describe("maintenance proxy — subscribe", () => {
  beforeEach(() => {
    resetProxy();
    jest.clearAllMocks();
  });

  it("notifies listeners on setLocalOverride", async () => {
    const listener = jest.fn();
    maintenance.subscribe(listener);

    await maintenance.setLocalOverride({
      mode: "maintenance",
      updatedAt: Date.now(),
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "maintenance" })
    );
  });

  it("unsubscribe stops notifications", async () => {
    const listener = jest.fn();
    const unsub = maintenance.subscribe(listener);
    unsub();

    await maintenance.setLocalOverride({
      mode: "maintenance",
      updatedAt: Date.now(),
    });

    expect(listener).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// logTransition — only fires on mode/reason changes
// ─────────────────────────────────────────────────────────────────────────────

describe("maintenance proxy — logTransition", () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    resetProxy();
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("logs when mode transitions from normal to degraded", async () => {
    const mockClient: MaintenanceClient = {
      getState: jest.fn().mockResolvedValue({
        mode: "degraded",
        reason: "supabase_unreachable",
        blockedFeatures: ["writes", "growth"],
        updatedAt: Date.now(),
      } satisfies MaintenanceState),
    };
    setMaintenanceClient(mockClient);

    await maintenance.getState();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("[Maintenance] state_changed mode=degraded reason=supabase_unreachable blocked=writes,growth")
    );
  });

  it("does NOT log when mode stays the same", async () => {
    const mockClient: MaintenanceClient = {
      getState: jest.fn().mockResolvedValue({
        mode: "degraded",
        reason: "supabase_unreachable",
        updatedAt: Date.now(),
      } satisfies MaintenanceState),
    };
    setMaintenanceClient(mockClient);

    await maintenance.getState(); // first call logs
    consoleSpy.mockClear();
    await maintenance.getState(); // second call should NOT log

    const maintenanceLogs = consoleSpy.mock.calls.filter(
      (args: any[]) => typeof args[0] === "string" && args[0].includes("[Maintenance] state_changed")
    );
    expect(maintenanceLogs).toHaveLength(0);
  });

  it("logs again when mode changes back to normal", async () => {
    const mockClient: MaintenanceClient = {
      getState: jest.fn()
        .mockResolvedValueOnce({
          mode: "degraded",
          reason: "supabase_unreachable",
          updatedAt: Date.now(),
        })
        .mockResolvedValueOnce({
          mode: "normal",
          updatedAt: Date.now(),
        }),
    };
    setMaintenanceClient(mockClient);

    await maintenance.getState(); // logs: normal → degraded
    consoleSpy.mockClear();
    await maintenance.getState(); // logs: degraded → normal

    const maintenanceLogs = consoleSpy.mock.calls.filter(
      (args: any[]) => typeof args[0] === "string" && args[0].includes("[Maintenance] state_changed")
    );
    expect(maintenanceLogs).toHaveLength(1);
    expect(maintenanceLogs[0][0]).toContain("mode=normal");
  });

  it("logs blocked=none when no blockedFeatures", async () => {
    const mockClient: MaintenanceClient = {
      getState: jest.fn().mockResolvedValue({
        mode: "maintenance",
        reason: "manual_override",
        updatedAt: Date.now(),
      } satisfies MaintenanceState),
    };
    setMaintenanceClient(mockClient);

    await maintenance.getState();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("blocked=none")
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isBlocked — explicit + implicit blocking
// ─────────────────────────────────────────────────────────────────────────────

describe("maintenance proxy — isBlocked", () => {
  beforeEach(() => {
    resetProxy();
    jest.clearAllMocks();
  });

  it("returns false for everything in normal mode", () => {
    expect(maintenance.isBlocked("writes")).toBe(false);
    expect(maintenance.isBlocked("growth")).toBe(false);
    expect(maintenance.isBlocked("anything")).toBe(false);
  });

  it("returns true for all features in maintenance mode (via override)", async () => {
    await maintenance.setLocalOverride({
      mode: "maintenance",
      reason: "manual_override",
      updatedAt: Date.now(),
    });

    expect(maintenance.isBlocked("writes")).toBe(true);
    expect(maintenance.isBlocked("growth")).toBe(true);
    expect(maintenance.isBlocked("random_feature")).toBe(true);
  });

  it("returns true for explicitly blocked features", async () => {
    await maintenance.setLocalOverride({
      mode: "degraded",
      blockedFeatures: ["custom_feature"],
      updatedAt: Date.now(),
    });

    expect(maintenance.isBlocked("custom_feature")).toBe(true);
    expect(maintenance.isBlocked("other_feature")).toBe(false);
  });

  it("implicitly blocks writes/uploads/growth/realtime when supabase_unreachable", () => {
    const fakeMonitor = {
      getState: () => ({
        mode: "degraded" as const,
        reason: "supabase_unreachable" as const,
        updatedAt: Date.now(),
      }),
      start: jest.fn(),
      stop: jest.fn(),
      subscribe: jest.fn(() => () => {}),
      check: jest.fn(),
      checkOnce: jest.fn(),
    };
    setHealthMonitor(fakeMonitor as any);

    for (const feat of IMPLICIT_SUPABASE_BLOCKS) {
      expect(maintenance.isBlocked(feat)).toBe(true);
    }
    // Non-implicit features are NOT blocked in degraded mode
    expect(maintenance.isBlocked("custom_read_only_feature")).toBe(false);
  });

  it("does not implicitly block when reason is not supabase_unreachable", async () => {
    await maintenance.setLocalOverride({
      mode: "degraded",
      reason: "manual_override",
      updatedAt: Date.now(),
    });

    expect(maintenance.isBlocked("writes")).toBe(false);
    expect(maintenance.isBlocked("growth")).toBe(false);
  });

  it("never throws — returns false on error", () => {
    // Even with broken state, isBlocked should never crash
    expect(() => maintenance.isBlocked("anything")).not.toThrow();
    expect(maintenance.isBlocked("anything")).toBe(false);
  });
});
