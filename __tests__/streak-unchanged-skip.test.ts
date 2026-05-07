import { useStreakStore } from "../src/features/streak/streak.store";

describe("streak store — unchanged_skip_set", () => {
  it("does not notify subscribers when setStreak receives identical streak fields", () => {
    let notifications = 0;
    const unsub = useStreakStore.subscribe(() => {
      notifications += 1;
    });

    const payload = {
      currentStreak: 4,
      longestStreak: 9,
      lastLogDate: "2026-05-06" as string | null,
      streakStartDate: "2026-05-01" as string | null,
    };

    useStreakStore.getState().setStreak(payload);
    const afterFirst = notifications;

    useStreakStore.getState().setStreak({ ...payload });
    unsub();

    expect(notifications).toBe(afterFirst);
  });
});
