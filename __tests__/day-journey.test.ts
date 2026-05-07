import { getDayContent } from "../src/features/retention/day-journey";

describe("day-journey getDayContent", () => {
  it("never returns undefined for NaN streak input (post-save celebration)", () => {
    const c = getDayContent(Number.NaN);
    expect(c).toBeDefined();
    expect(typeof c.afterLogMessage).toBe("string");
    expect(c.afterLogMessage.length).toBeGreaterThan(0);
  });

  it("floors fractional streak days for indexing", () => {
    const c = getDayContent(3.7);
    expect(c.day).toBe(3);
  });
});
