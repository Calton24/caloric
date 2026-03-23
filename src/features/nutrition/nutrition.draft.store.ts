import { create } from "zustand";
import { MealDraft } from "./nutrition.draft.types";

interface NutritionDraftStore {
  draft: MealDraft | null;
  /** Date override for the next meal (YYYY-MM-DD). Set when logging from a past day. */
  logDate: string | null;
  setDraft: (draft: MealDraft) => void;
  updateDraft: (updates: Partial<MealDraft>) => void;
  clearDraft: () => void;
  setLogDate: (date: string | null) => void;
}

export const useNutritionDraftStore = create<NutritionDraftStore>((set) => ({
  draft: null,
  logDate: null,

  setDraft: (draft) => set({ draft }),

  updateDraft: (updates) =>
    set((state) => ({
      draft: state.draft ? { ...state.draft, ...updates } : null,
    })),

  clearDraft: () => set({ draft: null, logDate: null }),

  setLogDate: (date) => set({ logDate: date }),
}));
