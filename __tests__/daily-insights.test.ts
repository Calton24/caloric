/**
 * Tests for daily-insights.service.ts
 *
 * Verifies the InsightMessage pattern returns translation keys
 * rather than hardcoded English strings.
 */

import {
    generateDailyInsights,
    type DailyInsight,
} from "../src/features/nutrition/daily-insights.service";
import type { MealEntry } from "../src/features/nutrition/nutrition.types";

// ── Mock meal factory ──────────────────────────────────────────

function makeMeal(
  overrides: Partial<MealEntry> & { date: string; hour?: number }
): MealEntry {
  const { date, hour = 12, ...rest } = overrides;
  const loggedAt = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00`);
  return {
    id: crypto.randomUUID(),
    title: "Chicken Salad",
    calories: 500,
    protein: 40,
    carbs: 20,
    fat: 25,
    loggedAt: loggedAt.toISOString(),
    source: "manual",
    ...rest,
  };
}

// ── InsightMessage pattern validation ──────────────────────────

describe("generateDailyInsights", () => {
  describe("returns InsightMessage objects with translation keys", () => {
    it("pacing insight returns keys, not hardcoded strings", () => {
      const today = "2025-01-15";
      const yesterday = "2025-01-14";
      const meals: MealEntry[] = [
        makeMeal({ date: yesterday, hour: 10, calories: 400 }),
        makeMeal({ date: yesterday, hour: 14, calories: 600 }),
        makeMeal({ date: today, hour: 10, calories: 500 }),
      ];

      const insights = generateDailyInsights(meals, today, 12);
      const pacing = insights.find((i: DailyInsight) => i.kind === "pacing");

      expect(pacing).toBeDefined();
      expect(pacing!.message).toHaveProperty("key");
      expect(pacing!.message.key).toMatch(/^insights\.pacing(Ahead|Behind)$/);
      expect(pacing!.message.params).toHaveProperty("calories");
      expect(typeof pacing!.message.params!.calories).toBe("number");
    });

    it("yesterday insight returns keys with macro params", () => {
      const today = "2025-01-15";
      const yesterday = "2025-01-14";
      const meals: MealEntry[] = [
        makeMeal({
          date: yesterday,
          calories: 600,
          protein: 50,
          carbs: 60,
          fat: 20,
        }),
        makeMeal({ date: today, calories: 300 }),
      ];

      const insights = generateDailyInsights(meals, today, 12);
      const yesterdayInsight = insights.find(
        (i: DailyInsight) => i.kind === "yesterday"
      );

      expect(yesterdayInsight).toBeDefined();
      expect(yesterdayInsight!.message.key).toBe("insights.yesterday");
      expect(yesterdayInsight!.message.params).toHaveProperty("calories");
      expect(yesterdayInsight!.detail!.key).toBe("insights.macroBreakdown");
      expect(yesterdayInsight!.detail!.params).toHaveProperty("protein");
      expect(yesterdayInsight!.detail!.params).toHaveProperty("carbs");
      expect(yesterdayInsight!.detail!.params).toHaveProperty("fat");
    });

    it("last-week insight returns key with date param for locale formatting", () => {
      const today = "2025-01-15";
      const lastWeek = "2025-01-08";
      const meals: MealEntry[] = [
        makeMeal({ date: lastWeek, calories: 1800 }),
        makeMeal({ date: today, calories: 400 }),
      ];

      const insights = generateDailyInsights(meals, today, 12);
      const lastWeekInsight = insights.find(
        (i: DailyInsight) => i.kind === "last-week"
      );

      expect(lastWeekInsight).toBeDefined();
      expect(lastWeekInsight!.message.key).toBe("insights.lastWeek");
      // Date param passed for UI to format with locale-aware weekday
      expect(lastWeekInsight!.message.params).toHaveProperty("date");
      expect(lastWeekInsight!.message.params!.date).toBe(lastWeek);
    });

    it("similar-meal insight returns keys with meal metadata", () => {
      const today = "2025-01-15";
      const threeDaysAgo = "2025-01-12";
      const meals: MealEntry[] = [
        makeMeal({
          date: threeDaysAgo,
          title: "Grilled Chicken Salad",
          calories: 450,
        }),
        makeMeal({ date: today, title: "Chicken Salad Bowl", calories: 520 }),
      ];

      const insights = generateDailyInsights(meals, today, 14);
      const similar = insights.find(
        (i: DailyInsight) => i.kind === "similar-meal"
      );

      expect(similar).toBeDefined();
      expect(similar!.message.key).toBe("insights.similarMeal");
      expect(similar!.message.params).toHaveProperty("mealTitle");
      expect(similar!.message.params).toHaveProperty("date");
      // Detail key depends on calorie comparison
      expect(similar!.detail!.key).toMatch(
        /^insights\.similar(SameCal|MoreCal|LessCal)$/
      );
    });

    it("streak insight returns key with count param", () => {
      const today = "2025-01-15";
      const meals: MealEntry[] = [
        makeMeal({ date: "2025-01-13" }),
        makeMeal({ date: "2025-01-14" }),
        makeMeal({ date: today }),
      ];

      const insights = generateDailyInsights(meals, today, 12);
      const streak = insights.find((i: DailyInsight) => i.kind === "streak");

      expect(streak).toBeDefined();
      expect(streak!.message.key).toBe("insights.streakMessage");
      expect(streak!.message.params).toHaveProperty("count");
      expect(streak!.message.params!.count).toBe(3);
    });

    it("streak >= 7 includes keepItGoing detail", () => {
      const today = "2025-01-15";
      const meals: MealEntry[] = [];
      // 7-day streak
      for (let i = 0; i < 7; i++) {
        const d = new Date("2025-01-15");
        d.setDate(d.getDate() - i);
        const date = d.toISOString().split("T")[0];
        meals.push(makeMeal({ date }));
      }

      const insights = generateDailyInsights(meals, today, 12);
      const streak = insights.find((i: DailyInsight) => i.kind === "streak");

      expect(streak).toBeDefined();
      expect(streak!.detail).toBeDefined();
      expect(streak!.detail!.key).toBe("insights.keepItGoing");
    });
  });

  describe("edge cases", () => {
    it("returns empty array with no meals", () => {
      const insights = generateDailyInsights([], "2025-01-15", 12);
      expect(insights).toEqual([]);
    });

    it("returns empty array with only today's meal and no history", () => {
      const today = "2025-01-15";
      const meals = [makeMeal({ date: today })];
      const insights = generateDailyInsights(meals, today, 12);
      // No yesterday, no last-week, no pacing, possibly a 1-day "streak"
      // streak requires >= 2 days, so should be empty
      expect(insights.length).toBe(0);
    });

    it("pacing insight requires meaningful calorie difference (>= 50)", () => {
      const today = "2025-01-15";
      const yesterday = "2025-01-14";
      const meals: MealEntry[] = [
        makeMeal({ date: yesterday, hour: 10, calories: 500 }),
        makeMeal({ date: today, hour: 10, calories: 520 }), // only 20 cal diff
      ];

      const insights = generateDailyInsights(meals, today, 12);
      const pacing = insights.find((i: DailyInsight) => i.kind === "pacing");
      expect(pacing).toBeUndefined();
    });

    it("similar-meal requires >= 0.5 word similarity", () => {
      const today = "2025-01-15";
      const meals: MealEntry[] = [
        makeMeal({ date: "2025-01-12", title: "Pizza Margherita" }),
        makeMeal({ date: today, title: "Grilled Steak" }), // no overlap
      ];

      const insights = generateDailyInsights(meals, today, 12);
      const similar = insights.find(
        (i: DailyInsight) => i.kind === "similar-meal"
      );
      expect(similar).toBeUndefined();
    });
  });
});

// ── Translation key format validation ──────────────────────────

describe("InsightMessage key format", () => {
  it("all returned keys follow namespace.keyName format", () => {
    const today = "2025-01-15";
    const meals: MealEntry[] = [];

    // Build 7-day streak with various meals
    for (let i = 0; i < 7; i++) {
      const d = new Date("2025-01-15");
      d.setDate(d.getDate() - i);
      const date = d.toISOString().split("T")[0];
      meals.push(
        makeMeal({
          date,
          hour: 10 + i,
          calories: 400 + i * 50,
          title: i === 0 ? "Chicken Salad" : `Meal ${i}`,
        })
      );
    }
    // Add similar meal for similar-meal insight
    meals.push(
      makeMeal({
        date: "2025-01-10",
        title: "Chicken Salad Bowl",
        calories: 420,
      })
    );

    const insights = generateDailyInsights(meals, today, 14);

    for (const insight of insights) {
      // Main message key
      expect(insight.message.key).toMatch(/^insights\.\w+$/);

      // Detail key if present
      if (insight.detail) {
        expect(insight.detail.key).toMatch(/^insights\.\w+$/);
      }
    }
  });

  it("no insight returns hardcoded English text in message.key", () => {
    const today = "2025-01-15";
    const meals: MealEntry[] = [
      makeMeal({ date: "2025-01-14", calories: 1000 }),
      makeMeal({ date: today, calories: 600 }),
    ];

    const insights = generateDailyInsights(meals, today, 12);

    for (const insight of insights) {
      // Keys should not contain spaces (that would indicate hardcoded English)
      expect(insight.message.key).not.toMatch(/\s/);
      expect(insight.message.key).not.toMatch(/^[A-Z]/); // Not starting with capital (sentence)

      if (insight.detail) {
        expect(insight.detail.key).not.toMatch(/\s/);
        expect(insight.detail.key).not.toMatch(/^[A-Z]/);
      }
    }
  });
});
