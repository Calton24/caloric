import { create } from "zustand";
import { MealDraft } from "./nutrition.draft.types";

interface NutritionDraftStore {
  draft: MealDraft | null;
  setDraft: (draft: MealDraft) => void;
  updateDraft: (updates: Partial<MealDraft>) => void;
  clearDraft: () => void;
}

export const useNutritionDraftStore = create<NutritionDraftStore>((set) => ({
  draft: null,

  setDraft: (draft) => set({ draft }),

  updateDraft: (updates) =>
    set((state) => ({
      draft: state.draft ? { ...state.draft, ...updates } : null,
    })),

  clearDraft: () => set({ draft: null }),
}));
