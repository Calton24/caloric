/**
 * Notifications Proxy Tests
 * Mirrors analytics.test.ts pattern.
 */

import { NoopNotificationsClient } from "./NoopNotificationsClient";
import {
    getNotificationsClient,
    notifications,
    setNotificationsClient,
} from "./notifications";
import type { NotificationsClient } from "./types";

describe("Notifications", () => {
  let mockClient: jest.Mocked<NotificationsClient>;

  beforeEach(() => {
    setNotificationsClient(new NoopNotificationsClient());

    mockClient = {
      getPermissions: jest.fn().mockResolvedValue("granted"),
      requestPermissions: jest.fn().mockResolvedValue("granted"),
      getPushToken: jest.fn().mockResolvedValue("ExponentPushToken[xxxx]"),
      scheduleLocal: jest.fn().mockResolvedValue(undefined),
      clearBadge: jest.fn().mockResolvedValue(undefined),
      sendTestRemote: jest.fn().mockResolvedValue(undefined),
    };
  });

  describe("Default Behavior", () => {
    it("should not throw when no client is set", async () => {
      await expect(notifications.getPermissions()).resolves.not.toThrow();
      await expect(notifications.requestPermissions()).resolves.not.toThrow();
      await expect(notifications.getPushToken()).resolves.not.toThrow();
      await expect(
        notifications.scheduleLocal({ title: "t", body: "b" })
      ).resolves.not.toThrow();
      await expect(notifications.clearBadge()).resolves.not.toThrow();
    });

    it("should use NoopNotificationsClient by default", () => {
      const currentClient = getNotificationsClient();
      expect(currentClient).toBeInstanceOf(NoopNotificationsClient);
    });

    it("noop returns denied for permissions", async () => {
      expect(await notifications.getPermissions()).toBe("denied");
      expect(await notifications.requestPermissions()).toBe("denied");
    });

    it("noop returns null for push token", async () => {
      expect(await notifications.getPushToken()).toBeNull();
    });
  });

  describe("Client Swapping", () => {
    it("should forward getPermissions to the active client", async () => {
      setNotificationsClient(mockClient);
      const result = await notifications.getPermissions();
      expect(result).toBe("granted");
      expect(mockClient.getPermissions).toHaveBeenCalledTimes(1);
    });

    it("should forward requestPermissions to the active client", async () => {
      setNotificationsClient(mockClient);
      const result = await notifications.requestPermissions();
      expect(result).toBe("granted");
      expect(mockClient.requestPermissions).toHaveBeenCalledTimes(1);
    });

    it("should forward getPushToken to the active client", async () => {
      setNotificationsClient(mockClient);
      const result = await notifications.getPushToken();
      expect(result).toBe("ExponentPushToken[xxxx]");
      expect(mockClient.getPushToken).toHaveBeenCalledTimes(1);
    });

    it("should forward scheduleLocal to the active client", async () => {
      setNotificationsClient(mockClient);
      const opts = { title: "Test", body: "Hello" };
      await notifications.scheduleLocal(opts);
      expect(mockClient.scheduleLocal).toHaveBeenCalledWith(opts);
    });

    it("should forward clearBadge to the active client", async () => {
      setNotificationsClient(mockClient);
      await notifications.clearBadge();
      expect(mockClient.clearBadge).toHaveBeenCalledTimes(1);
    });

    it("should forward sendTestRemote to the active client", async () => {
      setNotificationsClient(mockClient);
      const opts = { token: "tok", title: "Test", body: "Hello" };
      await notifications.sendTestRemote(opts);
      expect(mockClient.sendTestRemote).toHaveBeenCalledWith(opts);
    });
  });

  describe("Error Handling", () => {
    it("should catch and return safe defaults on error", async () => {
      const failingClient: NotificationsClient = {
        getPermissions: jest.fn().mockRejectedValue(new Error("boom")),
        requestPermissions: jest.fn().mockRejectedValue(new Error("boom")),
        getPushToken: jest.fn().mockRejectedValue(new Error("boom")),
        scheduleLocal: jest.fn().mockRejectedValue(new Error("boom")),
        clearBadge: jest.fn().mockRejectedValue(new Error("boom")),
      };
      setNotificationsClient(failingClient);

      // Should not throw — returns safe defaults
      expect(await notifications.getPermissions()).toBe("denied");
      expect(await notifications.requestPermissions()).toBe("denied");
      expect(await notifications.getPushToken()).toBeNull();
      await expect(
        notifications.scheduleLocal({ title: "t", body: "b" })
      ).resolves.toBeUndefined();
      await expect(notifications.clearBadge()).resolves.toBeUndefined();
    });

    it("should not throw when sendTestRemote is missing on client", async () => {
      const noRemoteClient: NotificationsClient = {
        getPermissions: jest.fn().mockResolvedValue("granted"),
        requestPermissions: jest.fn().mockResolvedValue("granted"),
        getPushToken: jest.fn().mockResolvedValue(null),
        scheduleLocal: jest.fn().mockResolvedValue(undefined),
        clearBadge: jest.fn().mockResolvedValue(undefined),
        // sendTestRemote deliberately not defined
      };
      setNotificationsClient(noRemoteClient);

      await expect(
        notifications.sendTestRemote({
          token: "tok",
          title: "T",
          body: "B",
        })
      ).resolves.toBeUndefined();
    });
  });
});
