import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import { MealEntry } from "./nutrition.types";

interface NutritionStore {
  meals: MealEntry[];
  addMeal: (meal: MealEntry) => void;
  updateMeal: (mealId: string, updates: Partial<Omit<MealEntry, "id">>) => void;
  removeMeal: (mealId: string) => void;
  clearMealsForDate: (date: string) => void;
  resetMeals: () => void;
}

export const useNutritionStore = create<NutritionStore>()(
  persist(
    (set) => ({
      meals: [],

      addMeal: (meal) =>
        set((state) => ({
          meals: [meal, ...state.meals],
        })),

      updateMeal: (mealId, updates) =>
        set((state) => ({
          meals: state.meals.map((meal) =>
            meal.id === mealId ? { ...meal, ...updates } : meal
          ),
        })),

      removeMeal: (mealId) =>
        set((state) => ({
          meals: state.meals.filter((meal) => meal.id !== mealId),
        })),

      clearMealsForDate: (date) =>
        set((state) => ({
          meals: state.meals.filter((meal) => !meal.loggedAt.startsWith(date)),
        })),

      resetMeals: () => set({ meals: [] }),
    }),
    {
      name: "caloric-meals",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
    }
  )
);
