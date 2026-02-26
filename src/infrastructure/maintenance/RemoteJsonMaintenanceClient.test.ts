
import { RemoteJsonMaintenanceClient } from "./RemoteJsonMaintenanceClient";

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
};

jest.mock("@react-native-async-storage/async-storage", () => ({
  default: mockAsyncStorage,
}));

// Mock global fetch
const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

describe("RemoteJsonMaintenanceClient", () => {
  const TEST_URL = "https://example.com/maintenance.json";

  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  it("returns normal mode from valid remote response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ mode: "normal" }),
    });

    const client = new RemoteJsonMaintenanceClient(TEST_URL);
    const state = await client.getState();
    expect(state.mode).toBe("normal");
    expect(state.updatedAt).toBeDefined();
  });

  it("returns degraded mode with message from remote", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          mode: "degraded",
          message: "Some features are slow",
          blockedFeatures: ["growth", "realtime"],
        }),
    });

    const client = new RemoteJsonMaintenanceClient(TEST_URL);
    const state = await client.getState();
    expect(state.mode).toBe("degraded");
    expect(state.message).toBe("Some features are slow");
    expect(state.blockedFeatures).toEqual(["growth", "realtime"]);
  });

  it("returns maintenance mode with until field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          mode: "maintenance",
          message: "Upgrading servers",
          until: "2026-02-25T06:00:00Z",
        }),
    });

    const client = new RemoteJsonMaintenanceClient(TEST_URL);
    const state = await client.getState();
    expect(state.mode).toBe("maintenance");
    expect(state.until).toBe("2026-02-25T06:00:00Z");
  });

  it("caches successful result to AsyncStorage", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ mode: "degraded", message: "Cached" }),
    });

    const client = new RemoteJsonMaintenanceClient(TEST_URL);
    await client.getState();

    expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
      "@mobile_core/maintenance_state",
      expect.stringContaining('"mode":"degraded"')
    );
  });

  it("falls back to cache on fetch failure", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({
        mode: "read_only",
        message: "Cached state",
        updatedAt: 123,
      })
    );

    const client = new RemoteJsonMaintenanceClient(TEST_URL);
    const state = await client.getState();
    expect(state.mode).toBe("read_only");
    expect(state.message).toBe("Cached state");
  });

  it("falls back to cache on HTTP error", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    mockAsyncStorage.getItem.mockResolvedValueOnce(
      JSON.stringify({ mode: "degraded", updatedAt: 456 })
    );

    const client = new RemoteJsonMaintenanceClient(TEST_URL);
    const state = await client.getState();
    expect(state.mode).toBe("degraded");
  });

  it("falls back to default when no cache available", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);

    const client = new RemoteJsonMaintenanceClient(TEST_URL);
    const state = await client.getState();
    expect(state.mode).toBe("normal");
  });

  it("rejects invalid mode in remote response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ mode: "invalid_mode" }),
    });
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);

    const client = new RemoteJsonMaintenanceClient(TEST_URL);
    const state = await client.getState();
    expect(state.mode).toBe("normal"); // falls back to default
  });

  it("rejects non-object response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve("just a string"),
    });
    mockAsyncStorage.getItem.mockResolvedValueOnce(null);

    const client = new RemoteJsonMaintenanceClient(TEST_URL);
    const state = await client.getState();
    expect(state.mode).toBe("normal");
  });

  it("filters non-string items from blockedFeatures array", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          mode: "degraded",
          blockedFeatures: ["growth", 42, null, "billing"],
        }),
    });

    const client = new RemoteJsonMaintenanceClient(TEST_URL);
    const state = await client.getState();
    expect(state.blockedFeatures).toEqual(["growth", "billing"]);
  });
});
