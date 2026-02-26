/**
 * Presence Proxy Tests
 * Tests the singleton proxy behavior and try/catch safety.
 */

import { NoopPresenceClient } from "./NoopPresenceClient";
import { getPresenceClient, presence, setPresenceClient } from "./presence";
import type { PresenceClient } from "./types";

describe("presence proxy", () => {
  beforeEach(() => {
    // Reset to noop before each test
    setPresenceClient(new NoopPresenceClient());
  });

  it("defaults to NoopPresenceClient", () => {
    expect(getPresenceClient()).toBeInstanceOf(NoopPresenceClient);
  });

  it("getState returns 'active' from noop", () => {
    expect(presence.getState()).toBe("active");
  });

  it("onChange returns unsubscribe function from noop", () => {
    const unsub = presence.onChange(() => {});
    expect(typeof unsub).toBe("function");
    unsub(); // should not throw
  });

  it("start and stop do not throw on noop", () => {
    expect(() => presence.start()).not.toThrow();
    expect(() => presence.stop()).not.toThrow();
  });

  it("swaps to custom client via setPresenceClient", () => {
    const mockClient: PresenceClient = {
      start: jest.fn(),
      stop: jest.fn(),
      getState: jest.fn().mockReturnValue("background"),
      onChange: jest.fn().mockReturnValue(() => {}),
    };

    setPresenceClient(mockClient);
    expect(presence.getState()).toBe("background");
    expect(mockClient.getState).toHaveBeenCalled();
  });

  it("onChange delegates to the active client", () => {
    const cb = jest.fn();
    const mockUnsub = jest.fn();
    const mockClient: PresenceClient = {
      start: jest.fn(),
      stop: jest.fn(),
      getState: jest.fn().mockReturnValue("active"),
      onChange: jest.fn().mockReturnValue(mockUnsub),
    };

    setPresenceClient(mockClient);
    const unsub = presence.onChange(cb);

    expect(mockClient.onChange).toHaveBeenCalledWith(cb);
    unsub();
    expect(mockUnsub).toHaveBeenCalled();
  });

  it("catches errors from a throwing client and returns safe defaults", () => {
    const throwingClient: PresenceClient = {
      start: () => {
        throw new Error("boom");
      },
      stop: () => {
        throw new Error("boom");
      },
      getState: () => {
        throw new Error("boom");
      },
      onChange: () => {
        throw new Error("boom");
      },
    };

    setPresenceClient(throwingClient);

    // None of these should throw
    expect(() => presence.start()).not.toThrow();
    expect(() => presence.stop()).not.toThrow();
    expect(presence.getState()).toBe("active"); // fallback
    expect(typeof presence.onChange(() => {})).toBe("function"); // fallback unsub
  });
});
