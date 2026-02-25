import {
    getMaintenanceClient,
    IMPLICIT_SUPABASE_BLOCKS,
    loadPersistedOverride,
    maintenance,
    resetProxy,
    setHealthMonitor,
    setMaintenanceClient,
} from "./maintenance";
import { NoopMaintenanceClient } from "./NoopMaintenanceClient";
import { SupabaseHealthMonitor } from "./SupabaseHealthMonitor";
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
// loadPersistedOverride — commits immediately so isBlocked() works from tick 0
// ─────────────────────────────────────────────────────────────────────────────

describe("maintenance proxy — loadPersistedOverride", () => {
  beforeEach(() => {
    resetProxy();
    jest.clearAllMocks();
  });

  it("commits persisted override so isBlocked works without getState", async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        mode: "maintenance",
        reason: "manual_override",
        updatedAt: Date.now(),
      })
    );

    await loadPersistedOverride();

    // isBlocked should work immediately — no getState() needed
    expect(maintenance.isBlocked("auth")).toBe(true);
    expect(maintenance.isBlocked("writes")).toBe(true);
  });

  it("notifies subscribers when persisted override is loaded", async () => {
    const listener = jest.fn();
    maintenance.subscribe(listener);

    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        mode: "degraded",
        reason: "supabase_unreachable",
        updatedAt: Date.now(),
      })
    );

    await loadPersistedOverride();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "degraded" })
    );
  });

  it("does nothing when no persisted override exists", async () => {
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);

    await loadPersistedOverride();

    expect(maintenance.isBlocked("auth")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Monitor → proxy bridge — transitions committed through notifyListeners
// ─────────────────────────────────────────────────────────────────────────────

// Mock fetch for SupabaseHealthMonitor
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe("maintenance proxy — monitor bridge", () => {
  beforeEach(() => {
    resetProxy();
    jest.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    // Clean up monitor timers + bridge subscription
    resetProxy();
  });

  it("proxy subscribers are notified when monitor transitions", async () => {
    const monitor = new SupabaseHealthMonitor(
      "https://test.supabase.co",
      "anon-key",
      999_999 // large poll so timers don't auto-fire
    );
    setHealthMonitor(monitor);

    const listener = jest.fn();
    maintenance.subscribe(listener);

    // Drive the monitor into degraded (3 failures)
    mockFetch.mockRejectedValue(new Error("down"));
    await monitor.check();
    await monitor.check();
    await monitor.check();

    // Wait a tick for the bridge's async resolveState().then()
    await new Promise((r) => setTimeout(r, 0));

    expect(listener).toHaveBeenCalled();
    const lastCall = listener.mock.calls[listener.mock.calls.length - 1][0];
    expect(lastCall.mode).toBe("degraded");
    expect(lastCall.reason).toBe("supabase_unreachable");
  });

  it("monitor bridge updates lastResolvedState for isBlocked", async () => {
    const monitor = new SupabaseHealthMonitor(
      "https://test.supabase.co",
      "anon-key",
      999_999
    );
    setHealthMonitor(monitor);

    // Before any failures, isBlocked is false
    expect(maintenance.isBlocked("writes")).toBe(false);

    // 3 failures → degraded
    mockFetch.mockRejectedValue(new Error("down"));
    await monitor.check();
    await monitor.check();
    await monitor.check();

    // Wait for async bridge
    await new Promise((r) => setTimeout(r, 0));

    // isBlocked now picks up the committed state
    expect(maintenance.isBlocked("writes")).toBe(true);
    expect(maintenance.isBlocked("auth")).toBe(true);
  });

  it("setHealthMonitor(null) unsubscribes the bridge", async () => {
    const monitor = new SupabaseHealthMonitor(
      "https://test.supabase.co",
      "anon-key",
      999_999
    );
    setHealthMonitor(monitor);

    const listener = jest.fn();
    maintenance.subscribe(listener);

    // Detach the monitor
    setHealthMonitor(null);

    // Drive the old monitor into degraded — bridge should NOT fire
    mockFetch.mockRejectedValue(new Error("down"));
    await monitor.check();
    await monitor.check();
    await monitor.check();

    await new Promise((r) => setTimeout(r, 0));

    expect(listener).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// logTransition — only fires via notifyListeners (commit path), never getState
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

  it("getState is pure — never produces transition logs", async () => {
    const mockClient: MaintenanceClient = {
      getState: jest.fn().mockResolvedValue({
        mode: "degraded",
        reason: "supabase_unreachable",
        blockedFeatures: ["writes", "growth"],
        updatedAt: Date.now(),
      } satisfies MaintenanceState),
    };
    setMaintenanceClient(mockClient);

    // 20 getState calls — zero transition logs
    for (let i = 0; i < 20; i++) {
      await maintenance.getState();
    }

    const maintenanceLogs = consoleSpy.mock.calls.filter(
      (args: any[]) =>
        typeof args[0] === "string" &&
        args[0].includes("[Maintenance] state_changed")
    );
    expect(maintenanceLogs).toHaveLength(0);
  });

  it("logs when setLocalOverride triggers a mode transition", async () => {
    await maintenance.setLocalOverride({
      mode: "degraded",
      reason: "supabase_unreachable",
      blockedFeatures: ["writes", "growth"],
      updatedAt: Date.now(),
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        "[Maintenance] state_changed mode=degraded reason=supabase_unreachable blocked=writes,growth"
      )
    );
  });

  it("does NOT log when setLocalOverride keeps the same mode/reason", async () => {
    await maintenance.setLocalOverride({
      mode: "degraded",
      reason: "supabase_unreachable",
      updatedAt: Date.now(),
    });
    consoleSpy.mockClear();

    // Same mode + reason again — should NOT log
    await maintenance.setLocalOverride({
      mode: "degraded",
      reason: "supabase_unreachable",
      updatedAt: Date.now() + 1000,
    });

    const maintenanceLogs = consoleSpy.mock.calls.filter(
      (args: any[]) =>
        typeof args[0] === "string" &&
        args[0].includes("[Maintenance] state_changed")
    );
    expect(maintenanceLogs).toHaveLength(0);
  });

  it("logs again when override changes mode back to normal", async () => {
    await maintenance.setLocalOverride({
      mode: "degraded",
      reason: "supabase_unreachable",
      updatedAt: Date.now(),
    });
    consoleSpy.mockClear();

    await maintenance.setLocalOverride(null); // clears back to normal

    const maintenanceLogs = consoleSpy.mock.calls.filter(
      (args: any[]) =>
        typeof args[0] === "string" &&
        args[0].includes("[Maintenance] state_changed")
    );
    expect(maintenanceLogs).toHaveLength(1);
    expect(maintenanceLogs[0][0]).toContain("mode=normal");
  });

  it("logs blocked=none when no blockedFeatures", async () => {
    await maintenance.setLocalOverride({
      mode: "maintenance",
      reason: "manual_override",
      updatedAt: Date.now(),
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("blocked=none")
    );
  });

  it("subscriber receives state when notifyListeners fires", async () => {
    const received: MaintenanceState[] = [];
    maintenance.subscribe((s) => received.push(s));

    await maintenance.setLocalOverride({
      mode: "maintenance",
      reason: "manual_override",
      updatedAt: Date.now(),
    });

    expect(received).toHaveLength(1);
    expect(received[0].mode).toBe("maintenance");
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

  it("implicitly blocks writes/uploads/growth/realtime/auth when supabase_unreachable", () => {
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
    // Verify 'auth' is in the list
    expect(IMPLICIT_SUPABASE_BLOCKS).toContain("auth");
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

  it("uses lastResolvedState from provider after getState()", async () => {
    const mockClient: MaintenanceClient = {
      getState: jest.fn().mockResolvedValue({
        mode: "degraded",
        reason: "supabase_unreachable",
        blockedFeatures: ["growth"],
        updatedAt: Date.now(),
      } satisfies MaintenanceState),
    };
    setMaintenanceClient(mockClient);

    // Before getState, isBlocked uses default (normal)
    expect(maintenance.isBlocked("growth")).toBe(false);

    // After getState, isBlocked picks up the provider state
    await maintenance.getState();
    expect(maintenance.isBlocked("growth")).toBe(true);
    expect(maintenance.isBlocked("writes")).toBe(true); // implicit
    expect(maintenance.isBlocked("auth")).toBe(true); // implicit
  });
});
