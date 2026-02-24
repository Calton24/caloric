/**
 * Activity Monitor Proxy + InApp Client Tests
 * Tests singleton proxy safety, InApp start/update/end flows, and store.
 */

import { InAppActivityMonitorClient } from "./InAppActivityMonitorClient";
import { NoopActivityMonitorClient } from "./NoopActivityMonitorClient";
import {
    activityMonitor,
    getActivityMonitorClient,
    setActivityMonitorClient,
} from "./activityMonitor";
import { activityStore } from "./store";
import type { ActivityMonitorClient, StepsPayload } from "./types";

describe("activityMonitor proxy", () => {
  beforeEach(() => {
    setActivityMonitorClient(new NoopActivityMonitorClient());
    activityStore.clear();
  });

  it("defaults to NoopActivityMonitorClient", () => {
    expect(getActivityMonitorClient()).toBeInstanceOf(
      NoopActivityMonitorClient
    );
  });

  it("isSupported returns false from noop", () => {
    expect(activityMonitor.isSupported()).toBe(false);
  });

  it("start returns 'unavailable' from noop", () => {
    const result = activityMonitor.start("test-1", {
      type: "steps",
      current: 0,
      goal: 100,
    });
    expect(result).toBe("unavailable");
  });

  it("getAll returns empty from noop", () => {
    expect(activityMonitor.getAll()).toEqual([]);
  });

  it("catches errors from a throwing client", () => {
    const throwing: ActivityMonitorClient = {
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
      getAll: () => {
        throw new Error("boom");
      },
      get: () => {
        throw new Error("boom");
      },
    };

    setActivityMonitorClient(throwing);
    expect(
      activityMonitor.start("x", { type: "steps", current: 0, goal: 1 })
    ).toBe("unavailable");
    expect(
      activityMonitor.update("x", { type: "steps", current: 0, goal: 1 })
    ).toBe("unavailable");
    expect(activityMonitor.end("x")).toBe("unavailable");
    expect(activityMonitor.isSupported()).toBe(false);
    expect(activityMonitor.getAll()).toEqual([]);
    expect(activityMonitor.get("x")).toBeNull();
  });
});

describe("InAppActivityMonitorClient", () => {
  let client: InAppActivityMonitorClient;

  beforeEach(() => {
    activityStore.clear();
    client = new InAppActivityMonitorClient();
    setActivityMonitorClient(client);
  });

  const stepsPayload: StepsPayload = {
    type: "steps",
    current: 500,
    goal: 10000,
    label: "Daily Steps",
  };

  it("isSupported returns true", () => {
    expect(client.isSupported()).toBe(true);
  });

  it("start creates an activity", () => {
    const result = activityMonitor.start("steps-1", stepsPayload);
    expect(result).toBe("started");

    const state = activityMonitor.get("steps-1");
    expect(state).not.toBeNull();
    expect(state!.id).toBe("steps-1");
    expect(state!.payload).toEqual(stepsPayload);
  });

  it("update changes an existing activity", () => {
    activityMonitor.start("steps-1", stepsPayload);

    const updatedPayload = { ...stepsPayload, current: 750 };
    const result = activityMonitor.update("steps-1", updatedPayload);
    expect(result).toBe("updated");

    const state = activityMonitor.get("steps-1");
    expect((state!.payload as StepsPayload).current).toBe(750);
  });

  it("update returns 'unavailable' for non-existent activity", () => {
    const result = activityMonitor.update("does-not-exist", stepsPayload);
    expect(result).toBe("unavailable");
  });

  it("end removes an activity", () => {
    activityMonitor.start("steps-1", stepsPayload);
    const result = activityMonitor.end("steps-1");
    expect(result).toBe("ended");
    expect(activityMonitor.get("steps-1")).toBeNull();
  });

  it("end returns 'unavailable' for non-existent activity", () => {
    const result = activityMonitor.end("nope");
    expect(result).toBe("unavailable");
  });

  it("getAll returns all current activities", () => {
    activityMonitor.start("a", stepsPayload);
    activityMonitor.start("b", {
      type: "eta",
      estimatedArrival: "2025-01-01T12:00:00Z",
      label: "Delivery",
    });
    const all = activityMonitor.getAll();
    expect(all).toHaveLength(2);
  });

  it("full lifecycle: start → update → end", () => {
    expect(
      activityMonitor.start("timer-1", {
        type: "timer",
        totalSeconds: 60,
        elapsedSeconds: 0,
        label: "Workout",
      })
    ).toBe("started");

    expect(
      activityMonitor.update("timer-1", {
        type: "timer",
        totalSeconds: 60,
        elapsedSeconds: 30,
        label: "Workout",
      })
    ).toBe("updated");

    expect(activityMonitor.end("timer-1")).toBe("ended");
    expect(activityMonitor.getAll()).toHaveLength(0);
  });
});
