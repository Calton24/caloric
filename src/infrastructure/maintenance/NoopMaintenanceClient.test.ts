import { NoopMaintenanceClient } from "./NoopMaintenanceClient";

describe("NoopMaintenanceClient", () => {
  it("always returns normal mode", async () => {
    const client = new NoopMaintenanceClient();
    const state = await client.getState();
    expect(state.mode).toBe("normal");
  });

  it("includes updatedAt timestamp", async () => {
    const before = Date.now();
    const client = new NoopMaintenanceClient();
    const state = await client.getState();
    expect(state.updatedAt).toBeGreaterThanOrEqual(before);
    expect(state.updatedAt).toBeLessThanOrEqual(Date.now());
  });

  it("never has message or blockedFeatures", async () => {
    const client = new NoopMaintenanceClient();
    const state = await client.getState();
    expect(state.message).toBeUndefined();
    expect(state.blockedFeatures).toBeUndefined();
    expect(state.until).toBeUndefined();
  });
});
