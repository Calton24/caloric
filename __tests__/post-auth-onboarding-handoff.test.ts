/**
 * @jest-environment node
 */

import {
  clearPendingPaywallHandoffMarker,
  discardPendingPaywallHandoffMarker,
  markPendingPaywallHandoffFromSaveProgress,
  readPendingPaywallHandoffMarker,
} from "../src/features/onboarding/post-auth-onboarding-handoff";
import { __resetStorage, setStorage } from "../src/infrastructure/storage";
import { InMemoryStore } from "../src/infrastructure/storage/providers/memory";

describe("post-auth-onboarding-handoff marker", () => {
  beforeEach(() => {
    __resetStorage();
    setStorage(new InMemoryStore());
  });

  afterEach(() => {
    __resetStorage();
  });

  it("marks and reads pending handoff", async () => {
    expect(await readPendingPaywallHandoffMarker()).toBeNull();
    await markPendingPaywallHandoffFromSaveProgress();
    const m = await readPendingPaywallHandoffMarker();
    expect(m?.v).toBe(1);
    expect(typeof m?.ts).toBe("number");
  });

  it("discard clears marker", async () => {
    await markPendingPaywallHandoffFromSaveProgress();
    await discardPendingPaywallHandoffMarker();
    expect(await readPendingPaywallHandoffMarker()).toBeNull();
  });

  it("clear removes marker", async () => {
    await markPendingPaywallHandoffFromSaveProgress();
    await clearPendingPaywallHandoffMarker();
    expect(await readPendingPaywallHandoffMarker()).toBeNull();
  });
});
