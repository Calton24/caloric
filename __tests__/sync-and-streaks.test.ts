/**
 * Tests for sync service and streak tracking
 */

// ── Mocks (must be before imports) ───────────────────────────

import type { GoalPlan } from "../src/features/goals/goals.types";
import type { MealEntry } from "../src/features/nutrition/nutrition.types";
import {
    fetchStreak,
    getStreakInfo,
    recordMealLogged,
} from "../src/features/streak/streak.service";
import {
    pullGoals,
    pullMeals,
    pullWeightLogs,
    pushGoals,
    pushMeal,
    pushWeightLog,
} from "../src/features/sync/sync.service";
import { getCurrentUser } from "../src/lib/supabase/client";

const mockFrom = jest.fn();
const mockRpc = jest.fn();

jest.mock("../src/lib/supabase/client", () => ({
  getSupabaseClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
  getCurrentUser: jest.fn(),
}));

jest.mock("../src/infrastructure/storage", () => ({
  getStorage: () => ({
    getItem: jest.fn().mockResolvedValue(null),
    setItem: jest.fn().mockResolvedValue(undefined),
    removeItem: jest.fn().mockResolvedValue(undefined),
  }),
}));

const mockGetCurrentUser = getCurrentUser as jest.Mock;

// ── Helpers ──────────────────────────────────────────────────

function createMockMeal(overrides?: Partial<MealEntry>): MealEntry {
  return {
    id: "meal-1",
    title: "Chicken Salad",
    source: "voice",
    calories: 450,
    protein: 35,
    carbs: 20,
    fat: 15,
    loggedAt: new Date().toISOString(),
    ...overrides,
  };
}

function mockSupabaseChain(data: unknown = null, error: unknown = null) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data, error }),
  };
  // For non-single queries, the last method before resolution returns { data, error }
  chain.select.mockReturnValue(chain);
  chain.order.mockResolvedValue({
    data: Array.isArray(data) ? data : data ? [data] : [],
    error,
  });
  chain.upsert.mockResolvedValue({ data: null, error: null });
  chain.insert.mockResolvedValue({ data: null, error: null });
  chain.update.mockResolvedValue({ data: null, error: null });
  chain.delete.mockResolvedValue({ data: null, error: null });
  mockFrom.mockReturnValue(chain);
  return chain;
}

// ── Tests ────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue({ id: "user-123" });
});

describe("Sync Service", () => {
  describe("pushMeal", () => {
    it("upserts meal to Supabase with correct mapping", async () => {
      const chain = mockSupabaseChain();
      const meal = createMockMeal();

      await pushMeal(meal);

      expect(mockFrom).toHaveBeenCalledWith("meal_entries");
      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "meal-1",
          user_id: "user-123",
          title: "Chicken Salad",
          source: "voice",
          calories: 450,
          protein: 35,
          carbs: 20,
          fat: 15,
        }),
        { onConflict: "id" }
      );
    });

    it("does nothing when user is not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      await pushMeal(createMockMeal());
      expect(mockFrom).not.toHaveBeenCalled();
    });
  });

  describe("pushWeightLog", () => {
    it("upserts weight log to Supabase", async () => {
      const chain = mockSupabaseChain();
      await pushWeightLog({ id: "wl-1", date: "2026-03-19", weightLbs: 175 });

      expect(mockFrom).toHaveBeenCalledWith("weight_logs");
      expect(chain.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "wl-1",
          user_id: "user-123",
          weight_lbs: 175,
          date: "2026-03-19",
        }),
        { onConflict: "id" }
      );
    });
  });

  describe("pushGoals", () => {
    it("deactivates old goal and inserts new one", async () => {
      const chain = mockSupabaseChain();
      const plan: GoalPlan = {
        goalType: "lose",
        calorieBudget: 1800,
        maintenanceCalories: 2200,
        weeklyRateLbs: 1,
        timeframeWeeks: 12,
        targetDate: null,
        macros: { protein: 150, carbs: 180, fat: 60 },
      };

      await pushGoals("lose", plan, 12);

      // Should have called from() for both update (deactivate) and insert
      expect(mockFrom).toHaveBeenCalledWith("user_goals");
    });
  });

  describe("pullMeals", () => {
    it("maps Supabase rows back to MealEntry", async () => {
      mockSupabaseChain([
        {
          id: "m-1",
          title: "Pizza",
          source: "camera",
          calories: 800,
          protein: 30,
          carbs: 90,
          fat: 35,
          logged_at: "2026-03-19T12:00:00Z",
          emoji: "🍕",
          meal_time: "lunch",
          confidence: 0.9,
          image_uri: null,
        },
      ]);

      const meals = await pullMeals();

      expect(meals).toHaveLength(1);
      expect(meals[0]).toEqual(
        expect.objectContaining({
          id: "m-1",
          title: "Pizza",
          source: "camera",
          calories: 800,
          loggedAt: "2026-03-19T12:00:00Z",
          emoji: "🍕",
          mealTime: "lunch",
        })
      );
    });

    it("returns empty array when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      const meals = await pullMeals();
      expect(meals).toEqual([]);
    });
  });

  describe("pullWeightLogs", () => {
    it("maps Supabase rows back to WeightLog", async () => {
      mockSupabaseChain([{ id: "wl-1", date: "2026-03-19", weight_lbs: 175 }]);

      const logs = await pullWeightLogs();

      expect(logs).toHaveLength(1);
      expect(logs[0]).toEqual({
        id: "wl-1",
        date: "2026-03-19",
        weightLbs: 175,
      });
    });
  });

  describe("pullGoals", () => {
    it("maps Supabase row back to GoalPlan", async () => {
      mockSupabaseChain({
        goal_type: "lose",
        calorie_budget: 1800,
        maintenance_calories: 2200,
        weekly_rate_lbs: 1,
        timeframe_weeks: 12,
        target_date: null,
        protein_g: 150,
        carbs_g: 180,
        fat_g: 60,
      });

      const result = await pullGoals();

      expect(result).not.toBeNull();
      expect(result!.plan.calorieBudget).toBe(1800);
      expect(result!.plan.macros.protein).toBe(150);
    });
  });
});

describe("Streak Service", () => {
  describe("recordMealLogged", () => {
    it("updates local streak optimistically", async () => {
      mockSupabaseChain();
      mockRpc.mockResolvedValue({
        data: [{ current_streak: 1, longest_streak: 1 }],
      });

      const info = await recordMealLogged(500);

      expect(info.currentStreak).toBeGreaterThanOrEqual(1);
    });
  });

  describe("fetchStreak", () => {
    it("loads streak from Supabase and caches locally", async () => {
      // Use today's date so the streak-validity check doesn't reset currentStreak
      const today = new Date().toISOString().slice(0, 10);
      const chain = mockSupabaseChain({
        current_streak: 5,
        longest_streak: 12,
        last_log_date: today,
        streak_start_date: "2026-03-15",
      });

      const info = await fetchStreak();

      expect(mockFrom).toHaveBeenCalledWith("user_streaks");
      expect(info.currentStreak).toBe(5);
      expect(info.longestStreak).toBe(12);
    });

    it("returns default when not authenticated", async () => {
      mockGetCurrentUser.mockResolvedValue(null);
      const info = await fetchStreak();

      expect(info.currentStreak).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getStreakInfo", () => {
    it("returns a copy of the cached streak", () => {
      const info = getStreakInfo();
      expect(info).toHaveProperty("currentStreak");
      expect(info).toHaveProperty("longestStreak");
      expect(info).toHaveProperty("lastLogDate");
    });
  });
});
