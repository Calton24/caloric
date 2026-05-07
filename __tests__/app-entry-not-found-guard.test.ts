import {
  APP_ENTRY_NOT_FOUND_LOOP_MS,
  APP_ENTRY_PATH,
  evaluateAppEntryNotFoundRedirectGuard,
} from "../src/features/navigation/app-entry-href";

describe("evaluateAppEntryNotFoundRedirectGuard", () => {
  it("ignores when not redirect_tabs to app entry", () => {
    expect(
      evaluateAppEntryNotFoundRedirectGuard({
        isRedirectTabsToAppEntry: false,
        isNotFoundRoute: true,
        blocked: false,
        lastAttemptAt: 1000,
        now: 2000,
      }),
    ).toEqual({ action: "proceed" });
  });

  it("allows redirect from non–not-found without marking", () => {
    expect(
      evaluateAppEntryNotFoundRedirectGuard({
        isRedirectTabsToAppEntry: true,
        isNotFoundRoute: false,
        blocked: false,
        lastAttemptAt: null,
        now: 5000,
      }),
    ).toEqual({ action: "proceed" });
  });

  it("first +not-found recover → mark attempt", () => {
    expect(
      evaluateAppEntryNotFoundRedirectGuard({
        isRedirectTabsToAppEntry: true,
        isNotFoundRoute: true,
        blocked: false,
        lastAttemptAt: null,
        now: 10_000,
      }),
    ).toEqual({ action: "proceed_mark_attempt" });
  });

  it("second +not-found within loop window → fatal_config", () => {
    const now = 10_000;
    expect(
      evaluateAppEntryNotFoundRedirectGuard({
        isRedirectTabsToAppEntry: true,
        isNotFoundRoute: true,
        blocked: false,
        lastAttemptAt: now - (APP_ENTRY_NOT_FOUND_LOOP_MS - 500),
        now,
      }).action,
    ).toBe("fatal_config");
  });

  it("repeat after window → mark again (blocked flag not set)", () => {
    const now = 50_000;
    const res = evaluateAppEntryNotFoundRedirectGuard({
      isRedirectTabsToAppEntry: true,
      isNotFoundRoute: true,
      blocked: false,
      lastAttemptAt: now - APP_ENTRY_NOT_FOUND_LOOP_MS - 1,
      now,
    });
    expect(res).toEqual({ action: "proceed_mark_attempt" });
  });

  it("honors blocked flag", () => {
    expect(
      evaluateAppEntryNotFoundRedirectGuard({
        isRedirectTabsToAppEntry: true,
        isNotFoundRoute: true,
        blocked: true,
        lastAttemptAt: 1,
        now: 50_000,
      }),
    ).toEqual({ action: "skip_blocked" });
  });

  it("fatal payload references APP_ENTRY_PATH", () => {
    const res = evaluateAppEntryNotFoundRedirectGuard({
      isRedirectTabsToAppEntry: true,
      isNotFoundRoute: true,
      blocked: false,
      lastAttemptAt: 100,
      now: 500,
    });
    expect(res).toMatchObject({
      action: "fatal_config",
      payload: {
        message: "APP_ENTRY_PATH resolved to +not-found",
        appEntryPath: APP_ENTRY_PATH,
      },
    });
  });
});
