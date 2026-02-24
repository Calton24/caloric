/**
 * Live Activity Proxy Tests
 * Tests the singleton proxy behavior and try/catch safety.
 */

import { NoopLiveActivityClient } from "./NoopLiveActivityClient";
import {
    getLiveActivityClient,
    liveActivity,
    setLiveActivityClient,
} from "./liveActivity";
import type { LiveActivityClient } from "./types";

describe("liveActivity proxy", () => {
  beforeEach(() => {
    setLiveActivityClient(new NoopLiveActivityClient());
  });

  it("defaults to NoopLiveActivityClient", () => {
    expect(getLiveActivityClient()).toBeInstanceOf(NoopLiveActivityClient);
  });

  it("isSupported returns false from noop", () => {
    expect(liveActivity.isSupported()).toBe(false);
  });

  it("start returns unavailable from noop", () => {
    const result = liveActivity.start("TestWidget", { foo: "bar" });
    expect(result.status).toBe("unavailable");
  });

  it("update returns unavailable from noop", () => {
    const result = liveActivity.update("id-123", "TestWidget", { foo: "bar" });
    expect(result.status).toBe("unavailable");
  });

  it("end returns unavailable from noop", () => {
    const result = liveActivity.end("id-123", "TestWidget");
    expect(result.status).toBe("unavailable");
  });

  it("swaps to custom client via setLiveActivityClient", () => {
    const mockClient: LiveActivityClient = {
      start: jest
        .fn()
        .mockReturnValue({ status: "started", activityId: "abc" }),
      update: jest.fn().mockReturnValue({ status: "updated" }),
      end: jest.fn().mockReturnValue({ status: "ended" }),
      isSupported: jest.fn().mockReturnValue(true),
    };

    setLiveActivityClient(mockClient);
    expect(liveActivity.isSupported()).toBe(true);

    const startResult = liveActivity.start("W", { x: 1 });
    expect(startResult).toEqual({ status: "started", activityId: "abc" });
    expect(mockClient.start).toHaveBeenCalledWith("W", { x: 1 }, undefined);
  });

  it("catches errors from a throwing client and returns safe defaults", () => {
    const throwingClient: LiveActivityClient = {
      start: () => {
        throw new Error("boom");
      },
      update: () => {
        throw new Error("boom");
      },
      end: () => {
        throw new Error("boom");
      },
      isSupported: () => {
        throw new Error("boom");
      },
    };

    setLiveActivityClient(throwingClient);

    expect(liveActivity.start("X", {}).status).toBe("unavailable");
    expect(liveActivity.update("id", "X", {}).status).toBe("unavailable");
    expect(liveActivity.end("id", "X").status).toBe("unavailable");
    expect(liveActivity.isSupported()).toBe(false);
  });

  it("full flow: start → update → end with mock client", () => {
    let storedId = "";
    const mockClient: LiveActivityClient = {
      start: (_name, _props) => {
        storedId = "live-123";
        return { status: "started", activityId: storedId };
      },
      update: (_id, _name, _props) => ({ status: "updated" }),
      end: (_id, _name) => {
        storedId = "";
        return { status: "ended" };
      },
      isSupported: () => true,
    };

    setLiveActivityClient(mockClient);

    const start = liveActivity.start("DeliveryActivity", { eta: 15 });
    expect(start.status).toBe("started");
    if (start.status === "started") {
      const update = liveActivity.update(start.activityId, "DeliveryActivity", {
        eta: 5,
      });
      expect(update.status).toBe("updated");

      const end = liveActivity.end(start.activityId, "DeliveryActivity");
      expect(end.status).toBe("ended");
    }
  });
});
