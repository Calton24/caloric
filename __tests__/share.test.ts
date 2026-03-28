import {
    checkMilestone,
    MILESTONES,
} from "../src/features/share/share.service";
import type { MilestoneKey } from "../src/features/share/share.types";

describe("checkMilestone", () => {
  it("triggers first_log on first meal", () => {
    const result = checkMilestone(0, 0, [], 1);
    expect(result.triggered).toBe(true);
    expect(result.milestone?.key).toBe("first_log");
  });

  it("does not trigger if first_log already seen and not at day 3", () => {
    const result = checkMilestone(1, 1, ["first_log"], 2);
    expect(result.triggered).toBe(false);
  });

  it("triggers day_3 at 3 completed days", () => {
    const result = checkMilestone(3, 3, ["first_log"], 5);
    expect(result.triggered).toBe(true);
    expect(result.milestone?.key).toBe("day_3");
  });

  it("triggers day_7 over day_3 when both are eligible", () => {
    const result = checkMilestone(7, 7, ["first_log"], 15);
    expect(result.triggered).toBe(true);
    expect(result.milestone?.key).toBe("day_7");
  });

  it("triggers day_14 at 14 completed days", () => {
    const seen: MilestoneKey[] = ["first_log", "day_3", "day_7"];
    const result = checkMilestone(14, 14, seen, 30);
    expect(result.triggered).toBe(true);
    expect(result.milestone?.key).toBe("day_14");
  });

  it("triggers day_21 (peak moment)", () => {
    const seen: MilestoneKey[] = ["first_log", "day_3", "day_7", "day_14"];
    const result = checkMilestone(21, 21, seen, 50);
    expect(result.triggered).toBe(true);
    expect(result.milestone?.key).toBe("day_21");
  });

  it("does not trigger if all milestones are seen", () => {
    const seen: MilestoneKey[] = [
      "first_log",
      "day_3",
      "day_7",
      "day_14",
      "day_21",
    ];
    const result = checkMilestone(21, 21, seen, 50);
    expect(result.triggered).toBe(false);
  });

  it("uses streak when higher than completedDays", () => {
    // completedDays=2 but streak=7 (user logged outside challenge window too)
    const result = checkMilestone(2, 7, ["first_log"], 10);
    expect(result.triggered).toBe(true);
    expect(result.milestone?.key).toBe("day_7");
  });

  it("picks highest eligible unseen milestone", () => {
    // At day 14, with only first_log seen → should trigger day_14 (highest)
    const result = checkMilestone(14, 14, ["first_log"], 30);
    expect(result.triggered).toBe(true);
    expect(result.milestone?.key).toBe("day_14");
  });

  it("returns null milestone when not triggered", () => {
    const result = checkMilestone(0, 0, [], 0);
    expect(result.triggered).toBe(false);
    expect(result.milestone).toBeNull();
  });

  it("has 5 milestone definitions", () => {
    expect(MILESTONES).toHaveLength(5);
  });
});
