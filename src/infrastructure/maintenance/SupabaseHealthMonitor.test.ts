/**
 * SupabaseHealthMonitor — Unit Tests
 *
 * Tests the automatic outage detection escalation/recovery ladder:
 *   3 failures  → degraded
 *   6 failures  → maintenance
 *   2 successes → recovery to normal
 */

// Mock global fetch
import { SupabaseHealthMonitor } from "./SupabaseHealthMonitor";

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

const TEST_URL = "https://myproject.supabase.co";
const TEST_KEY = "anon-key-xxx";

function successResponse() {
  return Promise.resolve({ ok: true });
}

function failResponse() {
  return Promise.reject(new Error("Connection refused"));
}

describe("SupabaseHealthMonitor", () => {
  let monitor: SupabaseHealthMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Create with a large poll interval so timers don't auto-fire
    monitor = new SupabaseHealthMonitor(TEST_URL, TEST_KEY, 999_999);
  });

  afterEach(() => {
    monitor.stop();
    jest.useRealTimers();
  });

  it("starts in normal mode", () => {
    expect(monitor.getState().mode).toBe("normal");
  });

  it("stays normal after 1-2 failures", async () => {
    mockFetch.mockImplementation(failResponse);
    await monitor.check();
    expect(monitor.getState().mode).toBe("normal");
    await monitor.check();
    expect(monitor.getState().mode).toBe("normal");
  });

  it("transitions to degraded after 3 consecutive failures", async () => {
    mockFetch.mockImplementation(failResponse);
    await monitor.check(); // 1
    await monitor.check(); // 2
    await monitor.check(); // 3
    expect(monitor.getState().mode).toBe("degraded");
    expect(monitor.getState().reason).toBe("supabase_unreachable");
  });

  it("transitions to maintenance after 6 consecutive failures", async () => {
    mockFetch.mockImplementation(failResponse);
    for (let i = 0; i < 6; i++) {
      await monitor.check();
    }
    expect(monitor.getState().mode).toBe("maintenance");
    expect(monitor.getState().reason).toBe("supabase_unreachable");
  });

  it("stays in maintenance after more than 6 failures", async () => {
    mockFetch.mockImplementation(failResponse);
    for (let i = 0; i < 10; i++) {
      await monitor.check();
    }
    expect(monitor.getState().mode).toBe("maintenance");
  });

  it("recovers to normal after 2 consecutive successes", async () => {
    // First, get to degraded
    mockFetch.mockImplementation(failResponse);
    for (let i = 0; i < 3; i++) {
      await monitor.check();
    }
    expect(monitor.getState().mode).toBe("degraded");

    // 1 success is not enough
    mockFetch.mockImplementation(successResponse);
    await monitor.check();
    // State doesn't change from degraded after just 1 success
    // (transition only fires when mode actually changes)
    expect(monitor.getState().mode).toBe("degraded");

    // 2nd consecutive success → recovery
    await monitor.check();
    expect(monitor.getState().mode).toBe("normal");
  });

  it("recovers from maintenance after 2 consecutive successes", async () => {
    mockFetch.mockImplementation(failResponse);
    for (let i = 0; i < 6; i++) {
      await monitor.check();
    }
    expect(monitor.getState().mode).toBe("maintenance");

    mockFetch.mockImplementation(successResponse);
    await monitor.check();
    await monitor.check();
    expect(monitor.getState().mode).toBe("normal");
  });

  it("resets failure count on a single success", async () => {
    mockFetch.mockImplementation(failResponse);
    await monitor.check(); // 1
    await monitor.check(); // 2

    // Success resets failure counter
    mockFetch.mockImplementation(successResponse);
    await monitor.check();

    // Now 2 more failures — only at count 2, not degraded
    mockFetch.mockImplementation(failResponse);
    await monitor.check(); // 1
    await monitor.check(); // 2
    expect(monitor.getState().mode).toBe("normal");

    // 3rd failure → degraded
    await monitor.check(); // 3
    expect(monitor.getState().mode).toBe("degraded");
  });

  it("notifies listeners on state transitions", async () => {
    const listener = jest.fn();
    monitor.subscribe(listener);

    mockFetch.mockImplementation(failResponse);
    await monitor.check(); // 1
    await monitor.check(); // 2
    expect(listener).not.toHaveBeenCalled();

    await monitor.check(); // 3 → degraded
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({ mode: "degraded" })
    );
  });

  it("does not re-emit same state", async () => {
    const listener = jest.fn();
    monitor.subscribe(listener);

    mockFetch.mockImplementation(failResponse);
    for (let i = 0; i < 5; i++) {
      await monitor.check();
    }
    // Should only fire once when entering degraded (at check 3),
    // checks 4 and 5 stay degraded — no re-emit
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("emits when escalating from degraded to maintenance", async () => {
    const listener = jest.fn();
    monitor.subscribe(listener);

    mockFetch.mockImplementation(failResponse);
    for (let i = 0; i < 6; i++) {
      await monitor.check();
    }
    // First call: degraded (at 3), second: maintenance (at 6)
    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "maintenance" })
    );
  });

  it("unsubscribe stops listener from being called", async () => {
    const listener = jest.fn();
    const unsub = monitor.subscribe(listener);

    unsub();

    mockFetch.mockImplementation(failResponse);
    for (let i = 0; i < 3; i++) {
      await monitor.check();
    }
    expect(listener).not.toHaveBeenCalled();
  });

  it("stop() resets counters and state", async () => {
    mockFetch.mockImplementation(failResponse);
    for (let i = 0; i < 4; i++) {
      await monitor.check();
    }
    expect(monitor.getState().mode).toBe("degraded");

    monitor.stop();
    expect(monitor.getState().mode).toBe("normal");
  });

  it("sends apikey header in the health check", async () => {
    mockFetch.mockImplementation(successResponse);
    await monitor.check();

    expect(mockFetch).toHaveBeenCalledWith(
      `${TEST_URL}/auth/v1/health`,
      expect.objectContaining({
        headers: expect.objectContaining({ apikey: TEST_KEY }),
      })
    );
  });

  it("handles fetch timeout (AbortController)", async () => {
    jest.useRealTimers();
    mockFetch.mockImplementation(
      () =>
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Aborted")), 50)
        )
    );

    // Should not throw, just count as failure
    await monitor.check();
    expect(monitor.getState().mode).toBe("normal"); // only 1 failure
    jest.useFakeTimers();
  });
});
