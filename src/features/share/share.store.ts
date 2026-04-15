import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getStorage } from "../../infrastructure/storage";
import type { MilestoneKey, ShareStore } from "./share.types";

export const useShareStore = create<ShareStore>()(
  persist(
    (set) => ({
      seenMilestones: [],

      markSeen: (key: MilestoneKey) =>
        set((state) => {
          if (state.seenMilestones.includes(key)) return state;
          return { seenMilestones: [...state.seenMilestones, key] };
        }),

      reset: () => set({ seenMilestones: [] }),
    }),
    {
      name: "caloric-share-milestones",
      storage: createJSONStorage(() => ({
        getItem: (key: string) => getStorage().getItem(key),
        setItem: (key: string, value: string) =>
          getStorage().setItem(key, value),
        removeItem: (key: string) => getStorage().removeItem(key),
      })),
    }
  )
);
