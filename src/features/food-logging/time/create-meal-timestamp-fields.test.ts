import {
  createMealTimestampFields,
  formatMealTimeForDisplay,
  resolveMealLoggedDateLocal,
} from "./create-meal-timestamp-fields";

describe("createMealTimestampFields", () => {
  it("keeps UK BST local time while storing UTC", () => {
    const now = new Date("2026-05-08T08:42:00.000Z");
    const ts = createMealTimestampFields(now, "Europe/London");
    expect(ts.loggedAtUtc).toBe("2026-05-08T08:42:00.000Z");
    expect(ts.loggedAtLocal).toBe("2026-05-08T09:42:00");
    expect(ts.loggedDateLocal).toBe("2026-05-08");
  });

  it("keeps UK GMT local time correctly", () => {
    const now = new Date("2026-12-08T09:42:00.000Z");
    const ts = createMealTimestampFields(now, "Europe/London");
    expect(ts.loggedAtLocal).toBe("2026-12-08T09:42:00");
    expect(ts.loggedDateLocal).toBe("2026-12-08");
  });

  it("keeps New York near-midnight local date", () => {
    const now = new Date("2026-05-08T03:15:00.000Z");
    const ts = createMealTimestampFields(now, "America/New_York");
    expect(ts.loggedDateLocal).toBe("2026-05-07");
  });

  it("keeps Brazil local date correctly", () => {
    const now = new Date("2026-05-08T02:30:00.000Z");
    const ts = createMealTimestampFields(now, "America/Sao_Paulo");
    expect(ts.loggedDateLocal).toBe("2026-05-07");
  });
});

describe("meal timestamp fallbacks", () => {
  it("derives local date safely for legacy meals", () => {
    const date = resolveMealLoggedDateLocal({
      loggedAt: "2026-05-08T08:42:00.000Z",
      timezone: "Europe/London",
    });
    expect(date).toBe("2026-05-08");
  });

  it("formats display time in meal timezone", () => {
    const time = formatMealTimeForDisplay({
      loggedAtUtc: "2026-05-08T08:42:00.000Z",
      timezone: "Europe/London",
    });
    expect(time).toBe("09:42");
  });
});

